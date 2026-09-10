"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Star } from "lucide-react";
import { api } from "@/lib/client";
import {
  computeStats,
  TYPE_LABEL,
  STATUS_LABEL,
  MEDIA_STATUSES,
  type MediaEntry,
  type MediaType,
  type MediaStatus,
} from "@/lib/media-shared";
import { MediaCard } from "@/components/after-hours/MediaCard";
import { OnLoopCard } from "@/components/after-hours/OnLoopCard";
import { EntryModal } from "@/components/after-hours/EntryModal";

const GRID_TYPES: MediaType[] = ["BOOK", "MOVIE", "SERIES", "MANGA"];
type TypeFilter = "ALL" | MediaType;
type StatusFilter = "ALL" | MediaStatus;

function greetingLine(hour: number | null) {
  if (hour === null) return "";
  if (hour < 5) return "still up, ";
  if (hour < 12) return "a slow morning, ";
  if (hour < 17) return "how’s your day going, ";
  if (hour < 21) return "good evening, ";
  return "late night again, ";
}

export function AfterHours({
  initialEntries,
  canEdit,
}: {
  initialEntries: MediaEntry[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState(initialEntries);
  const [type, setType] = useState<TypeFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [favOnly, setFavOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [hour, setHour] = useState<number | null>(null);

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<MediaEntry | null>(null);

  useEffect(() => setEntries(initialEntries), [initialEntries]);
  useEffect(() => setHour(new Date().getHours()), []);

  const stats = useMemo(() => computeStats(entries), [entries]);
  const onLoop = useMemo(
    () =>
      entries
        .filter((e) => e.type === "MUSIC")
        .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
        .slice(0, 8),
    [entries],
  );

  const grid = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (e.type === "MUSIC") return false;
      if (type !== "ALL" && e.type !== type) return false;
      if (status !== "ALL" && e.status !== status) return false;
      if (favOnly && !e.favorite) return false;
      if (q && !`${e.title} ${e.creator}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, type, status, favOnly, query]);

  const upsert = (entry: MediaEntry) =>
    setEntries((prev) => {
      const without = prev.filter((e) => e.id !== entry.id);
      return [entry, ...without].sort(
        (a, b) =>
          Number(b.favorite) - Number(a.favorite) ||
          +new Date(b.updatedAt) - +new Date(a.updatedAt),
      );
    });

  async function handleCreate(data: Partial<MediaEntry>) {
    const created = await api<MediaEntry>("/api/media", { method: "POST", json: data });
    upsert(created);
    router.refresh();
  }
  async function handleUpdate(id: string, data: Partial<MediaEntry>) {
    const updated = await api<MediaEntry>(`/api/media/${id}`, { method: "PATCH", json: data });
    upsert(updated);
    router.refresh();
  }
  async function handleDelete(id: string) {
    await api(`/api/media/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
    router.refresh();
  }
  async function toggleFavorite(entry: MediaEntry) {
    upsert({ ...entry, favorite: !entry.favorite });
    try {
      await api(`/api/media/${entry.id}`, { method: "PATCH", json: { favorite: !entry.favorite } });
      router.refresh();
    } catch {
      upsert(entry);
    }
  }

  const empty = entries.length === 0;

  return (
    <div>
      {/* greeting */}
      <header className="mt-16">
        <p className="t-eyebrow">After Hours</p>
        <h1
          suppressHydrationWarning
          className="mt-4 max-w-[18ch] font-display text-[32px] font-semibold leading-[1.12] tracking-tight text-ink md:text-[44px]"
        >
          {greetingLine(hour)}
          <span className="text-accent">Night Owl.</span>
        </h1>
        <p className="t-excerpt mt-4 max-w-[42ch]">
          A quiet space for everything you felt today.
        </p>
      </header>

      {empty ? (
        <p className="t-excerpt py-24 text-center">
          {canEdit ? "Nothing logged yet. Add the first thing you loved." : "Nothing here yet."}
        </p>
      ) : (
        <>
          {/* stats */}
          <div className="mt-14 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Logged" value={stats.total} />
            <Stat label="Completed" value={stats.completed} />
            <Stat label="Favorites" value={stats.favorites} />
            <Stat label="Avg rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : "—"} />
          </div>

          {/* on loop */}
          {onLoop.length > 0 ? (
            <section className="mt-16">
              <SectionHead>On Loop</SectionHead>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {onLoop.map((entry, i) => (
                  <OnLoopCard
                    key={entry.id}
                    entry={entry}
                    nowPlaying={i === 0}
                    canEdit={canEdit}
                    onEdit={() => setEditing(entry)}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* library */}
          <section className="mt-16">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <SectionHead>The Library</SectionHead>
              {canEdit ? (
                <button
                  onClick={() => setAdding(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                  Add
                </button>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip active={type === "ALL"} onClick={() => setType("ALL")}>All</Chip>
                {GRID_TYPES.map((t) => (
                  <Chip key={t} active={type === t} onClick={() => setType(t)}>
                    {TYPE_LABEL[t]}
                  </Chip>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Chip active={status === "ALL"} onClick={() => setStatus("ALL")}>Any status</Chip>
                {MEDIA_STATUSES.map((s) => (
                  <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                    {STATUS_LABEL[s]}
                  </Chip>
                ))}
                <button
                  onClick={() => setFavOnly((v) => !v)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors ${
                    favOnly ? "border-accent text-accent" : "border-divider text-secondary hover:text-ink"
                  }`}
                >
                  <Star className="h-3 w-3" fill={favOnly ? "currentColor" : "none"} strokeWidth={1.75} />
                  Favorites
                </button>
                <div className="ml-auto flex items-center gap-2 border-b border-divider pb-1">
                  <Search className="h-3.5 w-3.5 text-secondary" strokeWidth={1.75} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="w-36 bg-transparent text-[13px] text-ink placeholder:text-secondary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {grid.length === 0 ? (
              <p className="t-excerpt py-16 text-center">Nothing matches those filters.</p>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {grid.map((entry) => (
                  <MediaCard
                    key={entry.id}
                    entry={entry}
                    canEdit={canEdit}
                    onEdit={() => setEditing(entry)}
                    onToggleFavorite={() => toggleFavorite(entry)}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* floating add for the empty state */}
      {empty && canEdit ? (
        <div className="mt-6 text-center">
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-[14px] font-medium text-canvas transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add an entry
          </button>
        </div>
      ) : null}

      {adding ? (
        <EntryModal
          onClose={() => setAdding(false)}
          onSubmit={async (data) => {
            await handleCreate(data);
            setAdding(false);
          }}
        />
      ) : null}

      {editing ? (
        <EntryModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await handleUpdate(editing.id, data);
            setEditing(null);
          }}
          onDelete={async () => {
            await handleDelete(editing.id);
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return <h2 className="t-eyebrow">{children}</h2>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-divider bg-surface p-4">
      <p className="font-display text-[28px] font-light tabular-nums leading-none tracking-[-0.02em] text-ink">
        {value}
      </p>
      <p className="mt-2 t-label text-secondary">{label}</p>
    </div>
  );
}

function Chip({
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
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
        active ? "bg-ink text-canvas" : "border border-divider text-secondary hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
