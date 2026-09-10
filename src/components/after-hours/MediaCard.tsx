"use client";

import { Star } from "lucide-react";
import {
  TYPE_LABEL,
  STATUS_LABEL,
  CREATOR_LABEL,
  type MediaEntry,
} from "@/lib/media-shared";

export function MediaCard({
  entry,
  canEdit,
  onEdit,
  onToggleFavorite,
}: {
  entry: MediaEntry;
  canEdit: boolean;
  onEdit: () => void;
  onToggleFavorite: () => void;
}) {
  const year = entry.consumedAt ? new Date(entry.consumedAt).getUTCFullYear() : null;

  return (
    <article className="group relative">
      {/* favorite toggle */}
      {(canEdit || entry.favorite) && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (canEdit) onToggleFavorite();
          }}
          aria-label={entry.favorite ? "Unfavorite" : "Favorite"}
          className={`absolute right-2 top-2 z-10 rounded-full p-1.5 transition-colors ${
            canEdit ? "hover:bg-canvas" : "cursor-default"
          }`}
        >
          <Star
            className={`h-4 w-4 ${entry.favorite ? "text-accent" : "text-canvas/90 drop-shadow"}`}
            fill={entry.favorite ? "currentColor" : "none"}
            strokeWidth={1.75}
          />
        </button>
      )}

      <button
        type="button"
        onClick={() => canEdit && onEdit()}
        className={`block w-full text-left ${canEdit ? "" : "cursor-default"}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-divider bg-surface">
          {entry.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.cover}
              alt=""
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="t-label text-secondary">{TYPE_LABEL[entry.type]}</span>
            </div>
          )}
        </div>

        <p className="mt-3 t-label text-secondary">
          {TYPE_LABEL[entry.type]}
          {entry.rating > 0 ? ` · ${entry.rating.toFixed(1)}★` : ""}
        </p>

        <h3 className="mt-1 font-display text-[16px] font-semibold leading-snug tracking-[-0.01em] text-ink transition-colors group-hover:text-accent">
          {entry.title}
        </h3>

        {entry.creator ? (
          <p className="mt-0.5 text-[13px] text-secondary">
            {CREATOR_LABEL[entry.type]}: {entry.creator}
          </p>
        ) : null}

        <p className="mt-1.5 t-tag text-secondary">
          {STATUS_LABEL[entry.status]}
          {year ? ` · ${year}` : ""}
        </p>

        {entry.notes ? (
          <p className="mt-2 line-clamp-2 text-[13px] italic leading-relaxed text-secondary">
            “{entry.notes}”
          </p>
        ) : null}

        {entry.moods.length > 0 ? (
          <p className="mt-2 t-tag text-secondary/80">
            {entry.moods.slice(0, 3).map((m) => `#${m}`).join("  ")}
          </p>
        ) : null}
      </button>
    </article>
  );
}
