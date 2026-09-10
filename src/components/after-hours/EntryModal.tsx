"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Star, Loader2, ImagePlus, Trash2 } from "lucide-react";
import {
  MEDIA_TYPES,
  MEDIA_STATUSES,
  TYPE_LABEL,
  STATUS_LABEL,
  CREATOR_LABEL,
  GENRES,
  MOODS,
  type MediaEntry,
  type MediaType,
  type MediaStatus,
} from "@/lib/media-shared";

type Draft = {
  type: MediaType;
  title: string;
  creator: string;
  cover: string;
  rating: number;
  genres: string[];
  moods: string[];
  status: MediaStatus;
  notes: string;
  favorite: boolean;
  consumedAt: string; // yyyy-mm-dd or ""
};

function toDraft(entry?: MediaEntry): Draft {
  return {
    type: entry?.type ?? "BOOK",
    title: entry?.title ?? "",
    creator: entry?.creator ?? "",
    cover: entry?.cover ?? "",
    rating: entry?.rating ?? 0,
    genres: entry?.genres ?? [],
    moods: entry?.moods ?? [],
    status: entry?.status ?? "PLANNED",
    notes: entry?.notes ?? "",
    favorite: entry?.favorite ?? false,
    consumedAt: entry?.consumedAt ? entry.consumedAt.slice(0, 10) : "",
  };
}

export function EntryModal({
  entry,
  onClose,
  onSubmit,
  onDelete,
}: {
  entry?: MediaEntry;
  onClose: () => void;
  onSubmit: (data: Partial<MediaEntry>) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(entry));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const toggleIn = (k: "genres" | "moods", v: string) =>
    setD((p) => ({
      ...p,
      [k]: p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v],
    }));

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Upload failed");
      set("cover", json.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) return setError("Title is required.");
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        type: d.type,
        title: d.title.trim(),
        creator: d.creator.trim(),
        cover: d.cover.trim(),
        rating: d.rating,
        genres: d.genres,
        moods: d.moods,
        status: d.status,
        notes: d.notes,
        favorite: d.favorite,
        consumedAt: d.consumedAt ? new Date(d.consumedAt).toISOString() : null,
      });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border border-divider bg-canvas px-3 py-2 text-[14px] text-ink placeholder:text-secondary focus:border-accent focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink/25 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[560px] rounded-lg border border-divider bg-surface p-6 sm:p-8"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[20px] font-semibold tracking-tight text-ink">
            {entry ? "Edit entry" : "New entry"}
          </h2>
          <button onClick={onClose} className="rounded-md p-1 text-secondary hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          {/* type */}
          <Group label="Type">
            <div className="flex flex-wrap gap-2">
              {MEDIA_TYPES.map((t) => (
                <Pill key={t} active={d.type === t} onClick={() => set("type", t)}>
                  {TYPE_LABEL[t]}
                </Pill>
              ))}
            </div>
          </Group>

          <input
            autoFocus
            value={d.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Title"
            className={field}
          />
          <input
            value={d.creator}
            onChange={(e) => set("creator", e.target.value)}
            placeholder={CREATOR_LABEL[d.type]}
            className={field}
          />

          {/* cover */}
          <Group label="Cover">
            <div className="flex gap-2">
              <input
                value={d.cover}
                onChange={(e) => set("cover", e.target.value)}
                placeholder="Image URL"
                className={field}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="shrink-0 rounded-lg border border-divider px-3 text-secondary hover:text-ink disabled:opacity-50"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload(f);
                  e.target.value = "";
                }}
              />
            </div>
          </Group>

          {/* rating + favorite */}
          <div className="flex items-center justify-between">
            <Group label="Rating">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("rating", d.rating === s ? 0 : s)}
                    className="text-secondary"
                  >
                    <Star
                      className={`h-5 w-5 ${s <= d.rating ? "text-accent" : "text-divider"}`}
                      fill={s <= d.rating ? "currentColor" : "none"}
                      strokeWidth={1.5}
                    />
                  </button>
                ))}
              </div>
            </Group>
            <label className="flex cursor-pointer items-center gap-2 text-[13px] text-secondary">
              <input
                type="checkbox"
                checked={d.favorite}
                onChange={(e) => set("favorite", e.target.checked)}
                className="accent-accent"
              />
              Favorite
            </label>
          </div>

          {/* status */}
          <Group label="Status">
            <div className="flex flex-wrap gap-2">
              {MEDIA_STATUSES.map((s) => (
                <Pill key={s} active={d.status === s} onClick={() => set("status", s)}>
                  {STATUS_LABEL[s]}
                </Pill>
              ))}
            </div>
          </Group>

          <Group label="Date">
            <input
              type="date"
              value={d.consumedAt}
              onChange={(e) => set("consumedAt", e.target.value)}
              className={field}
            />
          </Group>

          <Group label="Genres">
            <ChipCloud options={GENRES} selected={d.genres} onToggle={(v) => toggleIn("genres", v)} />
          </Group>

          <Group label="Mood">
            <ChipCloud options={MOODS} selected={d.moods} onToggle={(v) => toggleIn("moods", v)} />
          </Group>

          <Group label="Notes">
            <textarea
              value={d.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="What did it leave you with?"
              className={`${field} resize-none`}
            />
          </Group>

          {error ? <p className="text-[13px] text-[#c8102e]">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-ink px-4 py-2 text-[14px] font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : entry ? "Save changes" : "Add entry"}
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete this entry?")) return;
                  setDeleting(true);
                  try {
                    await onDelete();
                  } catch {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-[#c8102e] hover:opacity-70 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            ) : null}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 t-label text-secondary">{label}</p>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
        active ? "bg-ink text-canvas" : "border border-divider text-secondary hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function ChipCloud({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onToggle(o)}
          className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors ${
            selected.includes(o)
              ? "bg-accent/10 text-accent"
              : "border border-divider text-secondary hover:text-ink"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
