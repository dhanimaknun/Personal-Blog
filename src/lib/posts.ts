import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { monthName } from "@/lib/dates";

export type PostListItem = Prisma.PostGetPayload<{}>;

const PUBLIC_WHERE: Prisma.PostWhereInput = {
  status: "PUBLISHED",
  deletedAt: null,
  publishedAt: { not: null },
};

export async function getPublishedPosts(opts: { tag?: string } = {}): Promise<PostListItem[]> {
  return prisma.post.findMany({
    where: {
      ...PUBLIC_WHERE,
      ...(opts.tag ? { tags: { has: opts.tag.toLowerCase() } } : {}),
    },
    orderBy: { publishedAt: "desc" },
  });
}

export async function getPublishedPostBySlug(slug: string): Promise<PostListItem | null> {
  const post = await prisma.post.findUnique({ where: { slug } });
  if (!post || post.status !== "PUBLISHED" || post.deletedAt) return null;
  return post;
}

export async function getAdjacentPosts(post: PostListItem) {
  const pivot = post.publishedAt ?? post.createdAt;
  const [previous, next] = await Promise.all([
    prisma.post.findFirst({
      where: { ...PUBLIC_WHERE, publishedAt: { lt: pivot } },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, title: true },
    }),
    prisma.post.findFirst({
      where: { ...PUBLIC_WHERE, publishedAt: { gt: pivot } },
      orderBy: { publishedAt: "asc" },
      select: { slug: true, title: true },
    }),
  ]);
  return { previous, next };
}

export type ArchiveYear = {
  year: number;
  total: number;
  months: { month: number; label: string; count: number }[];
};

export async function getArchive(): Promise<ArchiveYear[]> {
  const posts = await prisma.post.findMany({
    where: PUBLIC_WHERE,
    select: { publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const years = new Map<number, Map<number, number>>();
  for (const { publishedAt } of posts) {
    if (!publishedAt) continue;
    const y = publishedAt.getUTCFullYear();
    const m = publishedAt.getUTCMonth() + 1;
    if (!years.has(y)) years.set(y, new Map());
    const months = years.get(y)!;
    months.set(m, (months.get(m) ?? 0) + 1);
  }

  return [...years.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      total: [...months.values()].reduce((a, b) => a + b, 0),
      months: [...months.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, count]) => ({ month, label: monthName(month), count })),
    }));
}

export type TagCount = { tag: string; count: number };

export async function getTagCounts(): Promise<TagCount[]> {
  const posts = await prisma.post.findMany({
    where: PUBLIC_WHERE,
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const { tags } of posts) {
    for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}

export async function getPostsByMonth(year: number, month: number): Promise<PostListItem[]> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return prisma.post.findMany({
    where: { ...PUBLIC_WHERE, publishedAt: { gte: start, lt: end } },
    orderBy: { publishedAt: "desc" },
  });
}

export async function getPostsByYear(year: number): Promise<PostListItem[]> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return prisma.post.findMany({
    where: { ...PUBLIC_WHERE, publishedAt: { gte: start, lt: end } },
    orderBy: { publishedAt: "desc" },
  });
}

export async function searchPublishedPosts(query: string): Promise<PostListItem[]> {
  const q = query.trim();
  if (!q) return [];
  return prisma.post.findMany({
    where: {
      ...PUBLIC_WHERE,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { excerpt: { contains: q, mode: "insensitive" } },
        { tags: { has: q.toLowerCase() } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });
}
