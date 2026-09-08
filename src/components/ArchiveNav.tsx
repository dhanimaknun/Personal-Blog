"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ArchiveYear } from "@/lib/posts";

const NOW = new Date();
const CURRENT_YEAR = NOW.getUTCFullYear();
const CURRENT_MONTH = NOW.getUTCMonth() + 1;

export function ArchiveNav({
  years,
  active,
}: {
  years: ArchiveYear[];
  active?: { year: number; month?: number };
}) {
  const [open, setOpen] = useState<Set<number>>(
    () => new Set([active?.year ?? years[0]?.year].filter(Boolean) as number[]),
  );

  if (years.length === 0) {
    return <p className="t-tag text-secondary">No archives yet.</p>;
  }

  function toggle(year: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  }

  return (
    <ul className="space-y-2.5">
      {years.map((entry) => {
        const isOpen = open.has(entry.year);
        return (
          <li key={entry.year}>
            <button
              type="button"
              onClick={() => toggle(entry.year)}
              aria-expanded={isOpen}
              className="t-tag flex w-full items-baseline gap-2 text-ink transition-colors duration-200 ease-out hover:text-accent"
            >
              <ChevronRight
                className="h-3 w-3 shrink-0 translate-y-[1px] text-secondary transition-transform duration-200 ease-out"
                style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
                strokeWidth={1.75}
              />
              <span className="flex-1 text-left">{entry.year}</span>
              <span className="t-mononum text-secondary">({entry.total})</span>
            </button>

            {isOpen ? (
              <ul className="ml-5 mt-2.5 space-y-2">
                {entry.months.map((m) => {
                  const isActive =
                    active?.year === entry.year && active?.month === m.month;
                  const isCurrent =
                    entry.year === CURRENT_YEAR && m.month === CURRENT_MONTH;
                  const highlight = isActive || isCurrent;
                  return (
                    <li key={m.month}>
                      <Link
                        href={`/archive/${entry.year}/${String(m.month).padStart(2, "0")}`}
                        className={`t-tag flex items-baseline gap-2 transition-colors duration-200 ease-out hover:text-accent ${
                          highlight ? "text-accent" : "text-secondary"
                        }`}
                      >
                        <span
                          className={`h-1 w-1 shrink-0 translate-y-[-2px] rounded-full ${
                            highlight ? "bg-accent" : "bg-transparent"
                          }`}
                          aria-hidden
                        />
                        <span className="flex-1">{m.label}</span>
                        <span className="t-mononum">({m.count})</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
