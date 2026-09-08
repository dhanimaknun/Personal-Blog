import { handler, ok, fail } from "@/lib/api";
import { getPublishedPostBySlug, getAdjacentPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

// GET /api/post/:slug → a single published entry (public)
export const GET = handler(async (_req, { params }: { params: { slug: string } }) => {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) return fail("Post not found", 404);
  const { previous, next } = await getAdjacentPosts(post);
  return ok({ post, previous, next });
});
