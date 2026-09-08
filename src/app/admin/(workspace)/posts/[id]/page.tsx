import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Editor } from "@/components/admin/Editor";

export const dynamic = "force-dynamic";

export default async function EditorPage({ params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) notFound();

  return <Editor initial={post} />;
}
