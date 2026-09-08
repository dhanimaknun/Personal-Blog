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
    return <p className="text-[13px] text-secondary">No archives yet.</p>;
  }

  function toggle(year: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      next.has(year) ? next.delete(year) : next.add(year);
      return next;
    });
  }

  return (
    <ul className="space-y-1">
      {years.map((entry) => {
        const isOpen = open.has(entry.year);
        return (
          <li key={entry.year}>
            <button
              type="button"
              onClick={() => toggle(entry.year)}
              className="flex w-full items-center gap-1.5 py-1 text-[14px] text-ink transition-colors hover:text-accent"
              aria-expanded={isOpen}
            >
              <ChevronRight
                className={`h-3.5 w-3.5 text-secondary transition-transform duration-200 ${
                  isOpen ? "rotate-90" : ""
                }`}
                strokeWidth={2}
              />
              <span className="font-medium">{entry.year}</span>
              <span className="text-secondary">{entry.total}</span>
            </button>

            {isOpen ? (
              <ul className="ml-5 mt-0.5 space-y-0.5 border-l border-divider pl-3">
                {entry.months.map((m) => {
                  const isActive =
                    active?.year === entry.year && active?.month === m.month;
                  const isCurrent =
                    entry.year === CURRENT_YEAR && m.month === CURRENT_MONTH;
                  return (
                    <li key={m.month}>
                      <Link
                        href={`/archive/${entry.year}/${String(m.month).padStart(2, "0")}`}
                        className={`flex items-center justify-between py-1 text-[13px] transition-colors ${
                          isActive
                            ? "text-accent"
                            : isCurrent
                              ? "font-medium text-ink"
                              : "text-secondary hover:text-ink"
                        }`}
                      >
                        <span>{m.label}</span>
                        <span className="tabular-nums">{m.count}</span>
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
