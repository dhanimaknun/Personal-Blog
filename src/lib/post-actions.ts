import { Prisma, type Post, type PostStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { autoExcerpt, normalizeTags, readingTime, slugify } from "@/lib/text";

const MAX_VERSIONS = 40;

const RESERVED_SLUGS = new Set([
  "admin", "api", "about", "search", "archive", "tags", "tag",
  "feed", "sitemap", "robots", "login", "_next", "static",
]);

export async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let root = slugify(base) || "untitled";
  if (RESERVED_SLUGS.has(root)) root = `${root}-entry`;
  let candidate = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await prisma.post.findFirst({
      where: { slug: candidate, ...(ignoreId ? { NOT: { id: ignoreId } } : {}) },
      select: { id: true },
    });
    if (!clash) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}

async function snapshot(post: Post, label: string) {
  await prisma.postVersion.create({
    data: {
      postId: post.id,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt,
      tags: post.tags,
      label,
    },
  });
  const stale = await prisma.postVersion.findMany({
    where: { postId: post.id },
    orderBy: { createdAt: "desc" },
    skip: MAX_VERSIONS,
    select: { id: true },
  });
  if (stale.length) {
    await prisma.postVersion.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }
}

export async function createDraft(input: {
  title?: string;
  content?: string;
  excerpt?: string;
  tags?: unknown;
}): Promise<Post> {
  const title = input.title?.trim() || "Untitled Draft";
  const content = input.content ?? "";
  return prisma.post.create({
    data: {
      title,
      slug: await uniqueSlug(title),
      content,
      excerpt: input.excerpt?.trim() || autoExcerpt(content),
      tags: normalizeTags(input.tags),
      status: "DRAFT",
      readingTime: readingTime(content),
    },
  });
}

export async function updatePost(
  id: string,
  input: {
    title?: string;
    content?: string;
    excerpt?: string;
    tags?: unknown;
    slug?: string;
    autosave?: boolean;
  },
): Promise<Post> {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) throw new PostError("Post not found", 404);

  if (!input.autosave) await snapshot(existing, "edit");

  const data: Prisma.PostUpdateInput = {};

  if (input.title !== undefined) {
    data.title = input.title.trim() || "Untitled Draft";
  }
  if (input.slug !== undefined && input.slug.trim()) {
    data.slug = await uniqueSlug(input.slug, id);
  } else if (input.title !== undefined && existing.status === "DRAFT") {
    // keep the slug tracking the title while the post is still a draft
    data.slug = await uniqueSlug(input.title || existing.title, id);
  }
  if (input.content !== undefined) {
    data.content = input.content;
    data.readingTime = readingTime(input.content);
  }
  if (input.tags !== undefined) {
    data.tags = normalizeTags(input.tags);
  }
  if (input.excerpt !== undefined) {
    data.excerpt = input.excerpt.trim() || autoExcerpt(input.content ?? existing.content);
  } else if (input.content !== undefined && !existing.excerpt) {
    data.excerpt = autoExcerpt(input.content);
  }

  return prisma.post.update({ where: { id }, data });
}

export async function setStatus(id: string, status: PostStatus): Promise<Post> {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) throw new PostError("Post not found", 404);

  const data: Prisma.PostUpdateInput = { status };
  if (status === "PUBLISHED") {
    data.publishedAt = existing.publishedAt ?? new Date();
    data.deletedAt = null;
    if (!existing.excerpt) data.excerpt = autoExcerpt(existing.content);
    data.readingTime = readingTime(existing.content);
  }
  return prisma.post.update({ where: { id }, data });
}

export async function softDelete(id: string): Promise<Post> {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) throw new PostError("Post not found", 404);
  return prisma.post.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

export async function restore(id: string): Promise<Post> {
  const existing = await prisma.post.findUnique({ where: { id } });
  if (!existing) throw new PostError("Post not found", 404);
  return prisma.post.update({
    where: { id },
    data: {
      deletedAt: null,
      status: existing.status === "PUBLISHED" ? "DRAFT" : existing.status,
    },
  });
}

export async function hardDelete(id: string): Promise<void> {
  await prisma.post.delete({ where: { id } });
}

export async function duplicatePost(id: string): Promise<Post> {
  const source = await prisma.post.findUnique({ where: { id } });
  if (!source) throw new PostError("Post not found", 404);
  const title = `${source.title} (copy)`;
  return prisma.post.create({
    data: {
      title,
      slug: await uniqueSlug(title),
      content: source.content,
      excerpt: source.excerpt,
      tags: source.tags,
      status: "DRAFT",
      readingTime: source.readingTime,
    },
  });
}

export async function listVersions(postId: string) {
  return prisma.postVersion.findMany({
    where: { postId },
    orderBy: { createdAt: "desc" },
    take: MAX_VERSIONS,
  });
}

export async function restoreVersion(postId: string, versionId: string): Promise<Post> {
  const [post, version] = await Promise.all([
    prisma.post.findUnique({ where: { id: postId } }),
    prisma.postVersion.findUnique({ where: { id: versionId } }),
  ]);
  if (!post) throw new PostError("Post not found", 404);
  if (!version || version.postId !== postId) throw new PostError("Version not found", 404);

  await snapshot(post, "pre-restore");
  return prisma.post.update({
    where: { id: postId },
    data: {
      title: version.title,
      content: version.content,
      excerpt: version.excerpt,
      tags: version.tags,
      readingTime: readingTime(version.content),
    },
  });
}

export async function getStats() {
  const [published, drafts, archived, trashed, all, monthCount] = await Promise.all([
    prisma.post.count({ where: { status: "PUBLISHED", deletedAt: null } }),
    prisma.post.count({ where: { status: "DRAFT", deletedAt: null } }),
    prisma.post.count({ where: { status: "ARCHIVED", deletedAt: null } }),
    prisma.post.count({ where: { deletedAt: { not: null } } }),
    prisma.post.findMany({
      where: { deletedAt: null },
      select: { content: true, tags: true, publishedAt: true },
    }),
    prisma.post.count({
      where: {
        status: "PUBLISHED",
        deletedAt: null,
        publishedAt: { gte: startOfMonth() },
      },
    }),
  ]);

  const wordsWritten = all.reduce((sum, p) => sum + wordCount(p.content), 0);
  const tagCounts = new Map<string, number>();
  for (const p of all) for (const t of p.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  const mostUsedTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));

  return {
    published,
    drafts,
    archived,
    trashed,
    wordsWritten,
    postsThisMonth: monthCount,
    mostUsedTags,
  };
}

function startOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function wordCount(md: string) {
  return md.replace(/[#>*_`~\-|]/g, " ").split(/\s+/).filter(Boolean).length;
}

export class PostError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}
