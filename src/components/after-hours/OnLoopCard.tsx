"use client";

import { useState } from "react";
import { Music } from "lucide-react";
import type { MediaEntry } from "@/lib/media-shared";

export function OnLoopCard({
  entry,
  nowPlaying,
  canEdit,
  onEdit,
}: {
  entry: MediaEntry;
  nowPlaying?: boolean;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <button
      type="button"
      onClick={() => canEdit && onEdit()}
      className={`flex w-full items-start gap-3 rounded-lg border border-divider bg-surface p-3 text-left transition-colors ${
        canEdit ? "hover:border-secondary/40" : "cursor-default"
      }`}
    >
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-divider bg-canvas">
        {entry.cover && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.cover}
            alt=""
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <Music className="h-4 w-4 text-secondary" strokeWidth={1.5} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {nowPlaying ? <p className="t-label text-accent">Now playing</p> : null}
        <p className="truncate text-[14px] font-medium text-ink">{entry.title}</p>
        <p className="truncate text-[12.5px] text-secondary">{entry.creator || "Unknown artist"}</p>
        {entry.notes ? (
          <p className="mt-0.5 line-clamp-1 text-[12px] italic text-secondary/90">“{entry.notes}”</p>
        ) : null}
      </div>
    </button>
  );
}
