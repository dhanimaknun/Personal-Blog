import { z } from "zod";
import { handler, ok, fail, readJson, requireSession, assertSameOrigin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { updatePost, softDelete, hardDelete } from "@/lib/post-actions";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// GET /api/posts/:id → full post by id (admin)
export const GET = handler(async (_req, { params }: Ctx) => {
  await requireSession();
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) return fail("Post not found", 404);
  return ok(post);
});

const UpdateBody = z.object({
  title: z.string().max(200).optional(),
  content: z.string().max(200_000).optional(),
  excerpt: z.string().max(400).optional(),
  slug: z.string().max(120).optional(),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
  autosave: z.boolean().optional(),
});

// PUT /api/posts/:id → update (autosave: true skips version snapshot)
export const PUT = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  const body = await readJson(req, UpdateBody);
  const post = await updatePost(params.id, body);
  return ok(post);
});

// DELETE /api/posts/:id → soft delete (moves to Trash). ?hard=1 purges.
export const DELETE = handler(async (req, { params }: Ctx) => {
  assertSameOrigin(req);
  await requireSession();
  const hard = new URL(req.url).searchParams.get("hard") === "1";
  if (hard) {
    await hardDelete(params.id);
    return ok({ ok: true, purged: true });
  }
  const post = await softDelete(params.id);
  return ok(post);
});
