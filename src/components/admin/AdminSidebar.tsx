"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  PencilLine,
  CheckCircle2,
  Archive,
  Trash2,
  Settings,
  LayoutGrid,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import { api } from "@/lib/client";
import { site } from "@/lib/site";
import { NewPostButton } from "@/components/admin/NewPostButton";

type Counts = { published: number; drafts: number; archived: number; trashed: number };

type NavItem = {
  href: string;
  label: string;
  icon: typeof FileText;
  exact?: boolean;
  count?: keyof Counts;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Home", icon: LayoutGrid, exact: true },
  { href: "/admin/posts", label: "Posts", icon: FileText },
  { href: "/admin/drafts", label: "Drafts", icon: PencilLine, count: "drafts" },
  { href: "/admin/published", label: "Published", icon: CheckCircle2, count: "published" },
  { href: "/admin/archive", label: "Archive", icon: Archive, count: "archived" },
  { href: "/admin/trash", label: "Trash", icon: Trash2, count: "trashed" },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar({ counts }: { counts: Counts }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-divider bg-[#f5f5f7] px-3 py-5">
      <div className="px-2">
        <p className="font-display text-[15px] font-light tracking-tight text-ink">{site.wordmark}</p>
      </div>

      <div className="mt-4 px-1">
        <NewPostButton variant="solid" label="New draft" />
      </div>

      <nav className="mt-5 flex-1 space-y-0.5">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const count = item.count ? counts[item.count] : undefined;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] transition-colors ${
                active ? "bg-white text-ink" : "text-secondary hover:bg-white/60 hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              <span className="flex-1">{item.label}</span>
              {count ? <span className="tabular-nums text-[12px] text-secondary">{count}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-0.5 border-t border-divider pt-3">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] text-secondary transition-colors hover:bg-white/60 hover:text-ink"
        >
          <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          View site
        </a>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13.5px] text-secondary transition-colors hover:bg-white/60 hover:text-ink"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.75} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
