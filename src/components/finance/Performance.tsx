"use client";

import { useMemo, useState } from "react";
import { addDays, daysBetween, MIN_DAYS_FOR_ANNUALIZED, type MonthRow, type PortfolioSummary, type TimelinePoint } from "@/lib/finance-calc";
import {
  ASSET_LABEL,
  formatDate,
  formatIDR,
  formatIDRCompact,
  formatPct,
} from "@/lib/finance-shared";
import { Legend, LineChart } from "@/components/finance/charts";
import { Card, ReturnPill, Segmented, SectionTitle, SignedAmount } from "@/components/finance/ui";

const RANGES = [
  { id: "3M", label: "3M", days: 91 },
  { id: "6M", label: "6M", days: 182 },
  { id: "1Y", label: "1Y", days: 365 },
  { id: "ALL", label: "All", days: Infinity },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const VALUE_COLOR = "#C8461E";
const CAPITAL_COLOR = "#6E6E73";

const dayDate = (d: string) => formatDate(d, { day: "numeric", month: "short", year: "numeric" });
const dayTick = (d: string) => formatDate(d, { day: "numeric", month: "short" });
const monthTick = (d: string) => formatDate(d, { month: "short", year: "2-digit" });

/** Below a hundredth of a percent reads as "no change", not as a loss. */
const flat = (v: number) => Math.abs(v) < 0.0001;

/** 5 · Investment performance — one chart, three plain-language facts. */
export function Performance({
  timeline,
  monthly,
  summary,
  today,
  busy,
}: {
  timeline: TimelinePoint[];
  monthly: MonthRow[];
  summary: PortfolioSummary;
  today: string;
  busy: boolean;
}) {
  const [range, setRange] = useState<RangeId>("ALL");

  const points = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days;
    if (!Number.isFinite(days)) return timeline;
    const from = addDays(today, -days);
    return timeline.filter((p) => p.date >= from);
  }, [range, timeline, today]);

  const thisMonth = monthly[monthly.length - 1];
  // A "best" asset only means something once the two have actually diverged.
  const best =
    summary.best && !(summary.worst && flat((summary.best.plPct ?? 0) - (summary.worst.plPct ?? 0)) && flat(summary.best.plPct ?? 0))
      ? summary.best
      : null;
  const spanDays = points.length > 1 ? daysBetween(points[0].date, points[points.length - 1].date) : 0;

  return (
    <section>
      <SectionTitle
        title="Performance"
        hint="How your money has grown against what you put in"
        action={
          <Segmented
            label="Time range"
            options={RANGES.map((r) => ({ id: r.id, label: r.label }))}
            value={range}
            onChange={setRange}
          />
        }
      />
      <Card className="p-5 sm:p-7">
        <div className="mb-4 flex justify-end">
          <Legend
            items={[
              { label: "Portfolio value", color: VALUE_COLOR },
              { label: "Money invested", color: CAPITAL_COLOR },
            ]}
          />
        </div>
        <div className={`transition-opacity ${busy ? "opacity-60" : ""}`}>
          {points.length < 2 ? (
            <p className="py-16 text-center text-[14px] text-secondary">
              The chart fills in as your history builds — a price is saved every day.
            </p>
          ) : (
            <LineChart
              label="Portfolio value compared with money invested"
              height={240}
              dates={points.map((p) => p.date)}
              // Invested first so the value line is drawn on top of it.
              series={[
                { id: "capital", label: "Invested", color: CAPITAL_COLOR, values: points.map((p) => p.capital) },
                { id: "value", label: "Value", color: VALUE_COLOR, values: points.map((p) => p.value), area: true },
              ]}
              format={formatIDR}
              formatTick={formatIDRCompact}
              formatDate={dayDate}
              formatAxisDate={spanDays > 120 ? monthTick : dayTick}
            />
          )}
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-5 border-t border-divider/70 pt-6 sm:grid-cols-3">
          <Fact label="This month" hint="Price movement only, new money excluded">
            {thisMonth ? <SignedAmount value={thisMonth.gain} /> : <span className="text-secondary">—</span>}
          </Fact>
          <Fact
            label="Best performer"
            hint={best ? (summary.worst ? "Of your two assets" : "Your only asset so far") : summary.best ? "No difference yet" : "Once you hold something"}
          >
            {best ? (
              <span className="inline-flex items-center gap-2">
                <span className="text-ink">{ASSET_LABEL[best.asset]}</span>
                <ReturnPill value={best.pl} pct={best.plPct} />
              </span>
            ) : (
              <span className="text-secondary">—</span>
            )}
          </Fact>
          <Fact
            label="Yearly pace"
            hint={summary.annualized !== null ? "Estimated annual return" : `Shown after ${MIN_DAYS_FOR_ANNUALIZED} days of history`}
          >
            {summary.annualized !== null ? (
              <span className={flat(summary.annualized) ? "text-ink" : summary.annualized > 0 ? "text-gain" : "text-loss"}>
                {formatPct(summary.annualized)}
              </span>
            ) : (
              <span className="text-secondary">—</span>
            )}
          </Fact>
        </dl>
      </Card>
    </section>
  );
}

function Fact({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-secondary">{label}</dt>
      <dd className="mt-1 text-[17px] font-semibold tracking-[-0.01em]">{children}</dd>
      <dd className="mt-0.5 text-[12px] text-secondary/80">{hint}</dd>
    </div>
  );
}
