import { prisma } from "@/lib/prisma";
import { AdminPostList } from "@/components/admin/AdminPostList";

export const dynamic = "force-dynamic";

export default async function PublishedPage() {
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", deletedAt: null },
    orderBy: { publishedAt: "desc" },
  });
  return (
    <AdminPostList
      title="Published"
      posts={posts}
      variant="published"
      emptyMessage="Nothing published yet."
    />
  );
}
