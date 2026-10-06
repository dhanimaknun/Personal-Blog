"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { GAIN_COLOR, LOSS_COLOR } from "@/lib/finance-shared";

// Small, dependency-free SVG charts in the journal's quiet register:
// 2px lines, a hairline solid grid, soft area washes,
// and a crosshair tooltip that reads every series at the hovered date.

const GRID = "#ECEAE4";
const AXIS_TEXT = "#6E6E73";
const SURFACE = "#FFFFFF";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** ~4 round ticks covering [min, max]. */
function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return { lo, hi, ticks };
}

const PAD = { top: 12, right: 12, bottom: 26, left: 64 };

export type LineSeries = {
  id: string;
  label: string;
  color: string;
  values: number[];
  /** A 10% wash under the line. */
  area?: boolean;
};

export function LineChart({
  dates,
  series,
  format,
  formatTick,
  formatDate,
  formatAxisDate = formatDate,
  height = 220,
  signed = false,
  label,
}: {
  dates: string[];
  series: LineSeries[];
  format: (v: number) => string;
  formatTick: (v: number) => string;
  formatDate: (d: string) => string;
  /** Shorter date for the x-axis; the tooltip uses `formatDate`. */
  formatAxisDate?: (d: string) => string;
  height?: number;
  /** Profit/loss mode: zero baseline, green wash above and red below. */
  signed?: boolean;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = dates.length;
  const clipId = useMemo(() => `c${Math.random().toString(36).slice(2, 8)}`, []);

  const geo = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    let min = Math.min(...all);
    let max = Math.max(...all);
    if (signed || min >= 0) min = Math.min(0, min);
    if (signed) max = Math.max(0, max);
    const { lo, hi, ticks } = niceTicks(min, max);
    const w = Math.max(0, width - PAD.left - PAD.right);
    const h = height - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
    const y = (v: number) => PAD.top + h - ((v - lo) / (hi - lo || 1)) * h;
    return { ticks, x, y, w, h };
  }, [series, width, height, n, signed]);

  if (n === 0 || width === 0) return <div ref={ref} style={{ height }} />;

  const path = (vals: number[]) => vals.map((v, i) => `${i ? "L" : "M"}${geo.x(i)},${geo.y(v)}`).join("");
  const areaPath = (vals: number[], base: number) =>
    `${path(vals)}L${geo.x(n - 1)},${geo.y(base)}L${geo.x(0)},${geo.y(base)}Z`;
  const zeroY = geo.y(0);
  const xLabels = n <= 1 ? [0] : Array.from(new Set([0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1]));

  const pick = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left - PAD.left;
    const i = n <= 1 ? 0 : Math.round((px / geo.w) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };

  const tipLeft = hover !== null ? geo.x(hover) : 0;
  const tipOnRight = tipLeft < width / 2;

  return (
    <div ref={ref} className="relative" style={{ height }}>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        tabIndex={0}
        className="block touch-pan-y focus-visible:outline-none"
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)}
        onFocus={() => setHover((h) => h ?? n - 1)}
        onBlur={() => setHover(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? n - 1) - 1));
          if (e.key === "ArrowRight") setHover((h) => Math.min(n - 1, (h ?? 0) + 1));
        }}
      >
        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke={t === 0 && signed ? "#CFCCC3" : GRID} strokeWidth={1} />
            <text x={PAD.left - 10} y={geo.y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill={AXIS_TEXT} className="tabular-nums">
              {formatTick(t)}
            </text>
          </g>
        ))}
        {xLabels.map((i, k) => (
          <text
            key={i}
            x={geo.x(i)}
            y={height - 6}
            textAnchor={k === 0 && n > 1 ? "start" : i === n - 1 && n > 1 ? "end" : "middle"}
            fontSize={11}
            fill={AXIS_TEXT}
          >
            {formatAxisDate(dates[i])}
          </text>
        ))}

        {signed ? (
          <defs>
            <clipPath id={`${clipId}-up`}>
              <rect x={0} y={0} width={width} height={Math.max(0, zeroY)} />
            </clipPath>
            <clipPath id={`${clipId}-down`}>
              <rect x={0} y={zeroY} width={width} height={Math.max(0, height - zeroY)} />
            </clipPath>
          </defs>
        ) : null}

        {series.map((s) =>
          signed ? (
            <g key={s.id}>
              <path d={areaPath(s.values, 0)} fill={GAIN_COLOR} opacity={0.1} clipPath={`url(#${clipId}-up)`} />
              <path d={areaPath(s.values, 0)} fill={LOSS_COLOR} opacity={0.1} clipPath={`url(#${clipId}-down)`} />
              <path d={path(s.values)} fill="none" stroke={GAIN_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${clipId}-up)`} />
              <path d={path(s.values)} fill="none" stroke={LOSS_COLOR} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${clipId}-down)`} />
            </g>
          ) : (
            <g key={s.id}>
              {s.area ? <path d={areaPath(s.values, geo.ticks[0])} fill={s.color} opacity={0.1} /> : null}
              <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          ),
        )}

        {/* end markers */}
        {series.map((s) => {
          const v = s.values[n - 1];
          const color = signed ? (v >= 0 ? GAIN_COLOR : LOSS_COLOR) : s.color;
          return <circle key={s.id} cx={geo.x(n - 1)} cy={geo.y(v)} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />;
        })}

        {hover !== null ? (
          <g pointerEvents="none">
            <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={PAD.top + geo.h} stroke="#B9B5AB" strokeWidth={1} />
            {series.map((s) => {
              const v = s.values[hover];
              const color = signed ? (v >= 0 ? GAIN_COLOR : LOSS_COLOR) : s.color;
              return <circle key={s.id} cx={geo.x(hover)} cy={geo.y(v)} r={4} fill={color} stroke={SURFACE} strokeWidth={2} />;
            })}
          </g>
        ) : null}
      </svg>

      {hover !== null ? (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-[150px] rounded-md border border-divider bg-surface px-3 py-2 shadow-sm"
          style={tipOnRight ? { left: tipLeft + 12 } : { right: width - tipLeft + 12 }}
        >
          <p className="t-label text-secondary">{formatDate(dates[hover])}</p>
          {series.map((s) => {
            const v = s.values[hover];
            const color = signed ? (v >= 0 ? GAIN_COLOR : LOSS_COLOR) : s.color;
            return (
              <div key={s.id} className="mt-1.5 flex items-center gap-2">
                <span className="h-[2px] w-3 shrink-0 rounded-full" style={{ background: color }} />
                <span className="text-[13px] font-semibold tabular-nums text-ink">{format(v)}</span>
                <span className="text-[12px] text-secondary">{s.label}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Part-to-whole as one 100% bar — clearer than a two-slice donut. */
export function AllocationBar({
  parts,
  height = 12,
  showLegend = true,
}: {
  parts: { id: string; label: string; color: string; share: number; detail?: string }[];
  height?: number;
  showLegend?: boolean;
}) {
  const visible = parts.filter((p) => p.share > 0);
  return (
    <div>
      <div className="flex w-full gap-[2px]" style={{ height }} role="img" aria-label={parts.map((p) => `${p.label} ${(p.share * 100).toFixed(1)}%`).join(", ")}>
        {visible.length === 0 ? (
          <div className="h-full w-full rounded-full bg-divider" />
        ) : (
          visible.map((p, i) => (
            <div
              key={p.id}
              className={`h-full ${i === 0 ? "rounded-l-full" : ""} ${i === visible.length - 1 ? "rounded-r-full" : ""}`}
              style={{ width: `${p.share * 100}%`, background: p.color, minWidth: 4 }}
              title={`${p.label} · ${(p.share * 100).toFixed(1)}%`}
            />
          ))
        )}
      </div>
      {showLegend ? (
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5">
        {parts.map((p) => (
          <li key={p.id} className="flex items-center gap-2 text-[13px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: p.color }} />
            <span className="text-ink">{p.label}</span>
            <span className="tabular-nums text-secondary">{(p.share * 100).toFixed(1).replace(".", ",")}%</span>
            {p.detail ? <span className="tabular-nums text-secondary">· {p.detail}</span> : null}
          </li>
        ))}
      </ul>
      ) : null}
    </div>
  );
}

/** Legend row for multi-series line charts: line keys, text in ink. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-2 text-[12px] text-secondary">
          <span className="h-[2px] w-3.5 rounded-full" style={{ background: it.color }} />
          {it.label}
        </li>
      ))}
    </ul>
  );
}
