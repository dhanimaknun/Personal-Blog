import { prisma } from "@/lib/prisma";
import { AdminPostList } from "@/components/admin/AdminPostList";

export const dynamic = "force-dynamic";

export default async function AllPostsPage() {
  const posts = await prisma.post.findMany({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AdminPostList
      title="Posts"
      subtitle={`${posts.length} entr${posts.length === 1 ? "y" : "ies"}`}
      posts={posts}
      variant="all"
      emptyMessage="No posts yet. Start a new draft."
    />
  );
}
