"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { api } from "@/lib/client";

export type Action =
  | "publish"
  | "unpublish"
  | "archive"
  | "duplicate"
  | "restore"
  | "trash"
  | "purge";

const LABELS: Record<Action, string> = {
  publish: "Publish",
  unpublish: "Move to drafts",
  archive: "Archive",
  duplicate: "Duplicate",
  restore: "Restore",
  trash: "Move to trash",
  purge: "Delete permanently",
};

export function RowActions({ id, actions }: { id: string; actions: Action[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function run(action: Action) {
    setOpen(false);
    if (action === "purge" && !confirm("Delete this post permanently? This cannot be undone.")) {
      return;
    }
    setBusy(true);
    try {
      if (action === "trash") {
        await api(`/api/posts/${id}`, { method: "DELETE" });
      } else if (action === "purge") {
        await api(`/api/posts/${id}?hard=1`, { method: "DELETE" });
      } else {
        await api(`/api/posts/${id}/${action}`, { method: "POST" });
      }
      router.refresh();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="rounded-md p-1.5 text-secondary transition-colors hover:bg-divider/60 hover:text-ink"
        aria-label="Actions"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-divider bg-white py-1">
          {actions.map((action) => (
            <button
              key={action}
              onClick={() => run(action)}
              className={`block w-full px-3.5 py-2 text-left text-[13px] transition-colors hover:bg-[#f5f5f7] ${
                action === "purge" ? "text-[#c8102e]" : "text-ink"
              }`}
            >
              {LABELS[action]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
