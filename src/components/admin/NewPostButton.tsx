"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { api } from "@/lib/client";
import type { Post } from "@prisma/client";

export function NewPostButton({
  variant = "ghost",
  label = "New",
}: {
  variant?: "ghost" | "solid";
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    try {
      const post = await api<Post>("/api/posts", { method: "POST", json: {} });
      router.push(`/admin/posts/${post.id}`);
    } catch {
      setLoading(false);
    }
  }

  const base =
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-50";
  const styles =
    variant === "solid"
      ? "bg-accent text-white hover:opacity-90"
      : "text-accent hover:bg-accent/10";

  return (
    <button onClick={create} disabled={loading} className={`${base} ${styles}`}>
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5" strokeWidth={2.2} />
      )}
      {label}
    </button>
  );
}
