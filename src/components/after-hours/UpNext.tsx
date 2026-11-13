"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Plus, RefreshCw, X } from "lucide-react";
import { api } from "@/lib/client";
import {
  SOURCE_LABEL,
  TYPE_LABEL,
  shelfOf,
  type MediaEntry,
  type Recommendation,
  type Shelf,
} from "@/lib/media-shared";
import { buildTasteProfile } from "@/lib/recs/taste";

const GROUPS: { id: Shelf; label: string }[] = [
  { id: "read", label: "Next read" },
  { id: "watch", label: "Next watch" },
  { id: "anime", label: "Next anime" },
  { id: "listen", label: "Next listen" },
];

function ago(iso: string) {
  const days = Math.floor((Date.now() - +new Date(iso)) / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

export function UpNext({
  entries,
  initialRecs,
  canEdit,
  onAdded,
}: {
  entries: MediaEntry[];
  initialRecs: Recommendation[];
  canEdit: boolean;
  onAdded: (entry: MediaEntry) => void;
}) {
  const [recs, setRecs] = useState(initialRecs);
  const [refreshing, setRefreshing] = useState(false);
  const [note, setNote] = useState("");

  const groups = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        items: recs.filter((r) => shelfOf(r) === g.id).sort((a, b) => b.score - a.score),
      })).filter((g) => g.items.length > 0),
    [recs],
  );
  const [groupId, setGroupId] = useState<Shelf | null>(null);
  const active = groups.find((g) => g.id === groupId) ?? groups[0];

  const taste = useMemo(() => {
    const p = buildTasteProfile(entries);
    return { genres: p.genres.slice(0, 3).map((g) => g.name), moods: p.moods.slice(0, 2).map((m) => m.name) };
  }, [entries]);

  const updatedAt = recs.reduce<string | null>((max, r) => (!max || r.updatedAt > max ? r.updatedAt : max), null);

  async function refresh() {
    setRefreshing(true);
    setNote("");
    try {
      const res = await api<{ items: Recommendation[]; failures: number }>("/api/media/recommendations", {
        method: "POST",
      });
      setRecs(res.items);
      setNote(res.failures ? "Some sources didn’t answer — kept their older picks." : "");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Couldn’t refresh.");
    } finally {
      setRefreshing(false);
    }
  }

  async function act(rec: Recommendation, action: "add" | "dismiss") {
    setRecs((prev) => prev.filter((r) => r.id !== rec.id));
    try {
      const res = await api<{ entry?: MediaEntry }>(`/api/media/recommendations/${rec.id}`, {
        method: "PATCH",
        json: { action },
      });
      if (res.entry) onAdded(res.entry);
    } catch (err) {
      setRecs((prev) => [...prev, rec]);
      setNote(err instanceof Error ? err.message : "Couldn’t save that.");
    }
  }

  if (!groups.length && !canEdit) return null;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="t-eyebrow">Up Next</h2>
        {canEdit ? (
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-divider px-3 py-1.5 text-[13px] text-secondary transition-colors hover:text-ink disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} strokeWidth={1.75} />
            {refreshing ? "Looking around…" : "Refresh picks"}
          </button>
        ) : null}
      </div>

      {taste.genres.length ? (
        <p className="mt-3 max-w-[60ch] text-[13.5px] leading-relaxed text-secondary">
          Picked from what the library leans toward —{" "}
          <span className="text-ink">{taste.genres.join(" · ")}</span>
          {taste.moods.length ? <>, mostly {taste.moods.join(" and ")}</> : null}.
          {updatedAt ? <span className="text-secondary/80"> Updated {ago(updatedAt)}.</span> : null}
        </p>
      ) : null}
      {note ? <p className="mt-2 text-[12.5px] text-accent">{note}</p> : null}

      {!active ? (
        <p className="t-excerpt py-12 text-center">
          No picks yet. Hit <span className="text-ink">Refresh picks</span> to look for some.
        </p>
      ) : (
        <>
          {groups.length > 1 ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {groups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setGroupId(g.id)}
                  className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                    g.id === active.id ? "bg-ink text-canvas" : "border border-divider text-secondary hover:text-ink"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-3 lg:grid-cols-6">
            {active.items.map((rec) => (
              <RecCard
                key={rec.id}
                rec={rec}
                canEdit={canEdit}
                onAdd={() => act(rec, "add")}
                onDismiss={() => act(rec, "dismiss")}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function RecCard({
  rec,
  canEdit,
  onAdd,
  onDismiss,
}: {
  rec: Recommendation;
  canEdit: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const square = rec.type === "MUSIC";

  return (
    <article className="group">
      <div className="relative">
        <a href={rec.url} target="_blank" rel="noopener noreferrer" className="block">
          <div
            className={`pop-card relative overflow-hidden rounded-lg border border-divider bg-surface ${
              square ? "aspect-square" : "aspect-[2/3]"
            }`}
          >
            {rec.cover && !broken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={rec.cover}
                alt=""
                loading="lazy"
                onError={() => setBroken(true)}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-3 text-center">
                <span className="t-label text-secondary">{TYPE_LABEL[rec.type]}</span>
              </div>
            )}
          </div>
        </a>

        {canEdit ? (
          <div className="absolute right-2 top-2 flex gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
            <button
              type="button"
              onClick={onAdd}
              aria-label="Add to library as planned"
              title="Add to library as Planned"
              className="rounded-full bg-canvas/90 p-1 text-ink backdrop-blur-sm transition-colors hover:text-accent"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Not for me"
              title="Not for me"
              className="rounded-full bg-canvas/90 p-1 text-secondary backdrop-blur-sm transition-colors hover:text-ink"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        ) : null}
      </div>

      <a href={rec.url} target="_blank" rel="noopener noreferrer" className="mt-3 block">
        <h3 className="line-clamp-2 font-display text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
          {rec.title}
        </h3>
        {rec.creator ? <p className="mt-0.5 truncate text-[12.5px] text-secondary">{rec.creator}</p> : null}
      </a>
      {rec.reason ? <p className="mt-1.5 line-clamp-2 text-[12.5px] italic leading-snug text-secondary">{rec.reason}</p> : null}
      <p className="mt-1.5 inline-flex items-center gap-0.5 t-tag text-secondary/70">
        {SOURCE_LABEL[rec.source] ?? rec.source}
        <ArrowUpRight className="h-3 w-3" strokeWidth={1.75} />
      </p>
    </article>
  );
}
