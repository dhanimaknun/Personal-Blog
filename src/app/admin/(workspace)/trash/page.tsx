import { prisma } from "@/lib/prisma";
import { AdminPostList } from "@/components/admin/AdminPostList";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const posts = await prisma.post.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });
  return (
    <AdminPostList
      title="Trash"
      subtitle="Deleted posts stay recoverable until you remove them for good."
      posts={posts}
      variant="trash"
      emptyMessage="Trash is empty."
    />
  );
}
