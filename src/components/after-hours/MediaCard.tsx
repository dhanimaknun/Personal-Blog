"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import {
  TYPE_LABEL,
  STATUS_LABEL,
  type MediaEntry,
} from "@/lib/media-shared";

export function MediaCard({
  entry,
  canEdit,
  onOpen,
  onToggleFavorite,
}: {
  entry: MediaEntry;
  canEdit: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const year = entry.consumedAt ? new Date(entry.consumedAt).getUTCFullYear() : null;
  const showCover = entry.cover && !broken;

  return (
    <article className="group">
      <div className="relative">
        <button type="button" onClick={onOpen} className="block w-full">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-divider bg-surface">
            {showCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.cover}
                alt=""
                onError={() => setBroken(true)}
                className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="t-label text-secondary">{TYPE_LABEL[entry.type]}</span>
              </div>
            )}

            {showCover ? (
              <span className="absolute left-2 top-2 rounded-md bg-canvas/90 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-ink backdrop-blur-sm">
                {TYPE_LABEL[entry.type]}
              </span>
            ) : null}

            {entry.rating > 0 ? (
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-canvas/90 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-ink backdrop-blur-sm">
                <Star className="h-3 w-3 text-accent" fill="currentColor" strokeWidth={0} />
                {entry.rating.toFixed(1)}
              </span>
            ) : null}
          </div>
        </button>

        {(canEdit || entry.favorite) && (
          <button
            type="button"
            onClick={() => canEdit && onToggleFavorite()}
            aria-label={entry.favorite ? "Unfavorite" : "Favorite"}
            className={`absolute right-2 top-2 rounded-full bg-canvas/90 p-1 backdrop-blur-sm transition-colors ${
              canEdit ? "hover:text-accent" : "cursor-default"
            }`}
          >
            <Star
              className={`h-3.5 w-3.5 ${entry.favorite ? "text-accent" : "text-secondary"}`}
              fill={entry.favorite ? "currentColor" : "none"}
              strokeWidth={1.75}
            />
          </button>
        )}
      </div>

      <button type="button" onClick={onOpen} className="mt-3 block w-full text-left">
        <h3 className="font-display text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
          {entry.title}
        </h3>
        {entry.creator ? (
          <p className="mt-0.5 text-[12.5px] text-secondary">{entry.creator}</p>
        ) : null}
        <p className="mt-1 t-tag text-secondary">
          {STATUS_LABEL[entry.status]}
          {year ? ` · ${year}` : ""}
        </p>
        {entry.moods.length > 0 ? (
          <p className="mt-1.5 t-tag text-secondary/80">
            {entry.moods.slice(0, 3).map((m) => `#${m}`).join("  ")}
          </p>
        ) : null}
        {entry.notes ? (
          <p className="mt-2 line-clamp-2 text-[12.5px] italic leading-relaxed text-secondary">
            “{entry.notes}”
          </p>
        ) : null}
      </button>
    </article>
  );
}
