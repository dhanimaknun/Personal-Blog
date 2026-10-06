"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatPct, formatSignedIDR } from "@/lib/finance-shared";

// Finance Deck building blocks — soft, rounded, quiet. Colour is reserved
// for direction (gain / loss) and the two asset swatches; everything else
// is ink, secondary grey and whitespace.

export function Card({
  className = "",
  children,
  as: Tag = "div",
}: {
  className?: string;
  children: React.ReactNode;
  as?: "div" | "section";
}) {
  return (
    <Tag
      className={`rounded-2xl bg-surface shadow-[0_1px_2px_rgba(28,28,30,0.04),0_8px_28px_-6px_rgba(28,28,30,0.08)] ring-1 ring-divider/60 ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Section title with an optional action on the right. */
export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4 px-1">
      <div>
        <h2 className="font-display text-[19px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-[13px] text-secondary">{hint}</p> : null}
      </div>
      {action}
    </div>
  );
}

const tone = (v: number) => (Math.round(v) === 0 ? "flat" : v > 0 ? "up" : "down");

/** A small rounded pill for a return — the one place gain/loss colour lives. */
export function ReturnPill({ value, pct, size = "sm" }: { value: number; pct: number | null; size?: "sm" | "md" }) {
  const t = tone(value);
  const Icon = t === "flat" ? Minus : t === "up" ? ArrowUpRight : ArrowDownRight;
  const colors =
    t === "flat" ? "bg-canvas text-secondary" : t === "up" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss";
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-medium tabular-nums ${colors} ${
        size === "md" ? "px-2.5 py-1 text-[13px]" : "px-2 py-0.5 text-[12px]"
      }`}
    >
      <Icon className={size === "md" ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={2.25} aria-hidden />
      {formatPct(pct, false)}
    </span>
  );
}

/** A signed rupiah amount — coloured only by direction, never shouty. */
export function SignedAmount({ value, className = "" }: { value: number; className?: string }) {
  const t = tone(value);
  const color = t === "flat" ? "text-ink" : t === "up" ? "text-gain" : "text-loss";
  return <span className={`tabular-nums ${color} ${className}`}>{formatSignedIDR(value)}</span>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-canvas p-0.5 ring-1 ring-divider/70">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
            value === o.id ? "bg-surface text-ink shadow-sm ring-1 ring-divider/70" : "text-secondary hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function IconBadge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      style={{ background: `${color}14`, color }}
    >
      {children}
    </span>
  );
}

export function GhostButton({
  onClick,
  children,
  disabled,
  label,
}: {
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-secondary transition-colors hover:bg-canvas hover:text-ink disabled:opacity-50"
    >
      {children}
    </button>
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
