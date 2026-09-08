import { prisma } from "@/lib/prisma";
import { AdminPostList } from "@/components/admin/AdminPostList";

export const dynamic = "force-dynamic";

export default async function ArchivedPage() {
  const posts = await prisma.post.findMany({
    where: { status: "ARCHIVED", deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AdminPostList
      title="Archive"
      subtitle="Retired entries, kept out of the feed."
      posts={posts}
      variant="archived"
      emptyMessage="Nothing archived."
    />
  );
}
