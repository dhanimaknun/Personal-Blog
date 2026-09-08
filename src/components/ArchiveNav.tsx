"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
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
    <ul className="space-y-3">
      {years.map((entry) => {
        const isOpen = open.has(entry.year);
        return (
          <li key={entry.year}>
            <button
              type="button"
              onClick={() => toggle(entry.year)}
              aria-expanded={isOpen}
              className="t-sidebar-item flex w-full items-center gap-2 text-ink transition-colors duration-200 ease-out hover:text-accent"
            >
              <ChevronDown
                className="h-4 w-4 text-secondary transition-transform duration-200 ease-out"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                strokeWidth={1.5}
              />
              <span>{entry.year}</span>
              <span className="text-secondary">{entry.total}</span>
            </button>

            {isOpen ? (
              <ul className="ml-6 mt-3 space-y-2 border-l border-divider pl-4">
                {entry.months.map((m) => {
                  const isActive =
                    active?.year === entry.year && active?.month === m.month;
                  const isCurrent =
                    entry.year === CURRENT_YEAR && m.month === CURRENT_MONTH;
                  return (
                    <li key={m.month}>
                      <Link
                        href={`/archive/${entry.year}/${String(m.month).padStart(2, "0")}`}
                        className={`t-tag flex items-baseline justify-between transition-colors duration-200 ease-out hover:text-accent hover:underline ${
                          isActive
                            ? "text-accent"
                            : isCurrent
                              ? "font-semibold text-ink"
                              : "text-secondary"
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
