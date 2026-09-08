import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getStats } from "@/lib/post-actions";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export const metadata: Metadata = {
  title: "Workspace",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const stats = await getStats();

  return (
    <div className="flex min-h-screen bg-[#faf9f6]">
      <AdminSidebar
        counts={{
          published: stats.published,
          drafts: stats.drafts,
          archived: stats.archived,
          trashed: stats.trashed,
        }}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
