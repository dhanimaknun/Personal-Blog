import { prisma } from "@/lib/prisma";
import { AdminPostList } from "@/components/admin/AdminPostList";

export const dynamic = "force-dynamic";

export default async function DraftsPage() {
  const posts = await prisma.post.findMany({
    where: { status: "DRAFT", deletedAt: null },
    orderBy: { updatedAt: "desc" },
  });
  return (
    <AdminPostList
      title="Drafts"
      posts={posts}
      variant="drafts"
      emptyMessage="No drafts. A clean slate."
    />
  );
}
