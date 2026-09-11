"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X, Star, Pencil } from "lucide-react";
import {
  TYPE_LABEL,
  STATUS_LABEL,
  CREATOR_LABEL,
  MOODS,
  type MediaEntry,
} from "@/lib/media-shared";
import { longDate } from "@/lib/dates";

export function DetailModal({
  entry,
  canEdit,
  onClose,
  onEdit,
}: {
  entry: MediaEntry;
  canEdit: boolean;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [broken, setBroken] = useState(false);
  const showCover = entry.cover && !broken;
  const date = entry.consumedAt ?? entry.createdAt;

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
        className="grid w-full max-w-[720px] gap-6 rounded-lg border border-divider bg-surface p-6 sm:grid-cols-[220px_1fr] sm:gap-8 sm:p-8"
      >
        {/* cover */}
        <div className="relative">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-divider bg-canvas">
            {showCover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.cover}
                alt=""
                onError={() => setBroken(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="t-label text-secondary">{TYPE_LABEL[entry.type]}</span>
              </div>
            )}
          </div>
          {entry.rating > 0 ? (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-ink/85 px-2 py-1 text-[12px] font-medium text-canvas">
              <Star className="h-3 w-3 text-accent" fill="currentColor" strokeWidth={0} />
              {entry.rating.toFixed(1)}
            </span>
          ) : null}
        </div>

        {/* details */}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-[26px] font-semibold leading-tight tracking-tight text-ink sm:text-[30px]">
              {entry.title}
            </h2>
            <div className="flex shrink-0 items-center gap-1.5">
              {canEdit ? (
                <button
                  onClick={onEdit}
                  className="inline-flex items-center gap-1.5 rounded-full border border-divider px-3 py-1 text-[12px] text-ink transition-colors hover:border-secondary/50"
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.75} />
                  Edit
                </button>
              ) : null}
              <button onClick={onClose} className="rounded-md p-1 text-secondary hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {entry.creator ? (
            <p className="mt-1 text-[13.5px] text-secondary">
              {CREATOR_LABEL[entry.type]}: {entry.creator}
            </p>
          ) : null}

          <p className="mt-3 t-label text-secondary">
            {TYPE_LABEL[entry.type]} · {longDate(date)}
          </p>

          <span className="mt-4 inline-block rounded-full border border-divider px-3 py-1 text-[12px] text-ink">
            {STATUS_LABEL[entry.status]}
          </span>

          {entry.genres.length > 0 ? (
            <div className="mt-6">
              <p className="t-label text-secondary">Genres</p>
              <p className="mt-2 t-tag text-secondary">
                {entry.genres.map((g) => `#${g}`).join("  ")}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="t-label text-secondary">Mood</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MOODS.map((m) => {
                const active = entry.moods.includes(m);
                return (
                  <span
                    key={m}
                    className={`rounded-full px-2.5 py-1 text-[11.5px] transition-colors ${
                      active ? "bg-ink text-canvas" : "border border-divider text-secondary"
                    }`}
                  >
                    {m}
                  </span>
                );
              })}
            </div>
          </div>

          {entry.notes ? (
            <div className="mt-6">
              <p className="t-label text-secondary">Notes</p>
              <p className="mt-2 text-[14.5px] italic leading-relaxed text-ink">
                “{entry.notes}”
              </p>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
