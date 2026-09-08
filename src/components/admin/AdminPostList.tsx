import Link from "next/link";
import type { Post } from "@prisma/client";
import { relativeTime } from "@/lib/dates";
import { NewPostButton } from "@/components/admin/NewPostButton";
import { RowActions, type Action } from "@/components/admin/RowActions";

type Variant = "all" | "drafts" | "published" | "archived" | "trash";

function actionsFor(post: Post, variant: Variant): Action[] {
  if (variant === "trash" || post.deletedAt) return ["restore", "purge"];
  if (post.status === "PUBLISHED") return ["unpublish", "archive", "duplicate", "trash"];
  if (post.status === "ARCHIVED") return ["unpublish", "publish", "duplicate", "trash"];
  return ["publish", "archive", "duplicate", "trash"];
}

function StatusDot({ post }: { post: Post }) {
  const color = post.deletedAt
    ? "bg-[#c8102e]"
    : post.status === "PUBLISHED"
      ? "bg-[#0071e3]"
      : post.status === "ARCHIVED"
        ? "bg-secondary"
        : "bg-[#d2d2d7]";
  return <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${color}`} />;
}

export function AdminPostList({
  title,
  subtitle,
  posts,
  variant,
  emptyMessage = "Nothing here.",
}: {
  title: string;
  subtitle?: string;
  posts: Post[];
  variant: Variant;
  emptyMessage?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-14">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[28px] font-medium tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-[13px] text-secondary">{subtitle}</p> : null}
        </div>
        <NewPostButton />
      </div>

      {posts.length === 0 ? (
        <p className="mt-16 text-[14px] text-secondary">{emptyMessage}</p>
      ) : (
        <ul className="mt-8 overflow-hidden rounded-lg border border-divider bg-white">
          {posts.map((post) => (
            <li key={post.id} className="group border-b border-divider last:border-b-0">
              <div className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[#f1efe8]">
                <StatusDot post={post} />
                <Link href={`/admin/posts/${post.id}`} className="min-w-0 flex-1">
                  <p className="truncate text-[15px] text-ink">{post.title}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-secondary">
                    {post.excerpt || "No excerpt yet"} · {relativeTime(post.updatedAt)}
                  </p>
                </Link>
                <RowActions id={post.id} actions={actionsFor(post, variant)} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
