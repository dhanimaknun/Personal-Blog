"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPct, formatSignedIDR, signClass } from "@/lib/finance-shared";

// Small pieces shared across the Finance Deck, styled like After Hours.

export function SectionHead({ children }: { children: React.ReactNode }) {
  return <h2 className="t-eyebrow">{children}</h2>;
}

export function Chip({
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
      aria-pressed={active}
      className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
        active ? "bg-ink text-canvas" : "border border-divider text-secondary hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={`pop-tile rounded-lg border border-divider bg-surface ${className}`}>{children}</div>;
}

/**
 * A signed money figure with its percentage, in green / red. The arrow icon
 * carries direction too, so it never rests on colour alone.
 */
export function Delta({
  value,
  pct,
  className = "",
  size = "sm",
}: {
  value: number | null;
  pct?: number | null;
  className?: string;
  size?: "sm" | "md";
}) {
  if (value === null) return <span className={`text-secondary ${className}`}>—</span>;
  const Icon = Math.round(value) === 0 ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  const text = size === "md" ? "text-[15px]" : "text-[13px]";
  return (
    <span className={`inline-flex items-center gap-1 tabular-nums ${text} ${signClass(value)} ${className}`}>
      <Icon className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} strokeWidth={2} aria-hidden />
      {formatSignedIDR(value)}
      {pct !== undefined ? <span className="opacity-80">({formatPct(pct)})</span> : null}
    </span>
  );
}

export function Spinner({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
