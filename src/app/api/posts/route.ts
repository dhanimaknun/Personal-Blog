import { z } from "zod";
import { Prisma } from "@prisma/client";
import { handler, ok, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getPublishedPosts } from "@/lib/posts";
import { createDraft } from "@/lib/post-actions";

export const dynamic = "force-dynamic";

const SCOPES = ["all", "drafts", "published", "archived", "trash"] as const;
type Scope = (typeof SCOPES)[number];

function whereForScope(scope: Scope): Prisma.PostWhereInput {
  switch (scope) {
    case "drafts":
      return { status: "DRAFT", deletedAt: null };
    case "published":
      return { status: "PUBLISHED", deletedAt: null };
    case "archived":
      return { status: "ARCHIVED", deletedAt: null };
    case "trash":
      return { deletedAt: { not: null } };
    default:
      return { deletedAt: null };
  }
}

// GET /api/posts            → published entries (public)
// GET /api/posts?scope=...  → admin listing (requires session)
export const GET = handler(async (req) => {
  const url = new URL(req.url);
  const scopeParam = url.searchParams.get("scope");
  const tag = url.searchParams.get("tag") ?? undefined;

  if (!scopeParam) {
    return ok(await getPublishedPosts({ tag }));
  }

  await requireSession();
  const scope = (SCOPES as readonly string[]).includes(scopeParam)
    ? (scopeParam as Scope)
    : "all";

  const posts = await prisma.post.findMany({
    where: whereForScope(scope),
    orderBy: { updatedAt: "desc" },
  });
  return ok(posts);
});

const CreateBody = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(200_000).optional(),
  excerpt: z.string().max(400).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
});

// POST /api/posts → create a draft
export const POST = handler(async (req) => {
  assertSameOrigin(req);
  await requireSession();
  const body = await readJson(req, CreateBody);
  const post = await createDraft(body);
  return ok(post, { status: 201 });
});
