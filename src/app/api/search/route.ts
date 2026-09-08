import { handler, ok } from "@/lib/api";
import { searchPublishedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export const GET = handler(async (req) => {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await searchPublishedPosts(q);
  return ok({
    query: q,
    count: results.length,
    results: results.map((p) => ({
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      tags: p.tags,
      publishedAt: p.publishedAt,
    })),
  });
});
