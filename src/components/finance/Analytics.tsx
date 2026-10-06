"use client";

import { useMemo, useState } from "react";
import { addDays, type MonthRow, type PortfolioSummary, type TimelinePoint } from "@/lib/finance-calc";
import {
  ASSET_COLOR,
  ASSET_LABEL,
  formatDate,
  formatIDR,
  formatIDRCompact,
  formatPct,
  formatSignedIDR,
  signClass,
} from "@/lib/finance-shared";
import { ColumnChart, Legend, LineChart } from "@/components/finance/charts";
import { Card, Chip, SectionHead } from "@/components/finance/ui";

const RANGES = [
  { id: "3M", label: "3M", days: 91 },
  { id: "6M", label: "6M", days: 182 },
  { id: "1Y", label: "1Y", days: 365 },
  { id: "ALL", label: "All", days: Infinity },
] as const;
type RangeId = (typeof RANGES)[number]["id"];

const VALUE_COLOR = "#C8461E"; // accent — the line the story is about
const CAPITAL_COLOR = "#6E6E73"; // secondary — the reference line

const shortDate = (d: string) => formatDate(d, { day: "numeric", month: "short" });
const monthLabel = (m: string) => formatDate(`${m}-01`, { month: "short", year: "2-digit" });
const monthLong = (m: string) => formatDate(`${m}-01`, { month: "long", year: "numeric" });

export function Analytics({
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
  const [asTable, setAsTable] = useState(false);

  // One filter row scopes every chart and the history table below it.
  const { points, months } = useMemo(() => {
    const days = RANGES.find((r) => r.id === range)!.days;
    if (!Number.isFinite(days)) return { points: timeline, months: monthly };
    const from = addDays(today, -days);
    return {
      points: timeline.filter((p) => p.date >= from),
      months: monthly.filter((m) => m.month >= from.slice(0, 7)),
    };
  }, [range, timeline, monthly, today]);

  const dates = points.map((p) => p.date);
  const best = summary.best;
  const worst = summary.worst;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHead>Portfolio analytics</SectionHead>
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Chip key={r.id} active={range === r.id} onClick={() => setRange(r.id)}>
              {r.label}
            </Chip>
          ))}
          <span className="mx-1 h-4 w-px bg-divider" />
          <Chip active={asTable} onClick={() => setAsTable((v) => !v)}>
            Table view
          </Chip>
        </div>
      </div>

      {/* quick stats */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickStat label="Best performer">
          {best ? (
            <>
              <AssetName asset={best.asset} />
              <span className={`tabular-nums ${signClass(best.pl)}`}>{formatPct(best.plPct)}</span>
            </>
          ) : (
            "—"
          )}
        </QuickStat>
        <QuickStat label="Worst performer">
          {worst ? (
            <>
              <AssetName asset={worst.asset} />
              <span className={`tabular-nums ${signClass(worst.pl)}`}>{formatPct(worst.plPct)}</span>
            </>
          ) : (
            <span className="text-secondary">Needs two assets</span>
          )}
        </QuickStat>
        <QuickStat label="Investments">
          <span className="tabular-nums">{summary.count}</span>
          <span className="text-secondary">
            {summary.firstDate ? `since ${formatDate(summary.firstDate, { month: "short", year: "numeric" })}` : ""}
          </span>
        </QuickStat>
        <QuickStat label="Annualised return">
          {summary.annualized !== null ? (
            <span className={`tabular-nums ${signClass(summary.annualized)}`}>{formatPct(summary.annualized)}</span>
          ) : (
            <span className="text-secondary">Not enough history</span>
          )}
        </QuickStat>
      </div>

      <div className={`transition-opacity ${busy ? "opacity-60" : ""}`}>
        {points.length < 2 ? (
          <Card className="mt-3 p-8 text-center">
            <p className="t-excerpt">
              The charts fill in as history builds up — a price is recorded every day.
            </p>
          </Card>
        ) : asTable ? (
          <HistoryTable months={months} />
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <ChartCard title="Investment growth" note="Portfolio value against capital invested">
              <Legend
                items={[
                  { label: "Portfolio value", color: VALUE_COLOR },
                  { label: "Capital invested", color: CAPITAL_COLOR },
                ]}
              />
              <div className="mt-3">
                <LineChart
                  label="Portfolio value and capital invested over time"
                  dates={dates}
                  series={[
                    { id: "value", label: "Value", color: VALUE_COLOR, values: points.map((p) => p.value), area: true },
                    { id: "capital", label: "Capital", color: CAPITAL_COLOR, values: points.map((p) => p.capital) },
                  ]}
                  format={formatIDR}
                  formatTick={formatIDRCompact}
                  formatDate={shortDate}
                />
              </div>
            </ChartCard>

            <ChartCard title="Profit / loss trend" note="Unrealised gain over time — green above zero, red below">
              <div className="h-[18px]" />
              <div className="mt-3">
                <LineChart
                  signed
                  label="Unrealised profit and loss over time"
                  dates={dates}
                  series={[{ id: "pl", label: "P/L", color: VALUE_COLOR, values: points.map((p) => p.pl) }]}
                  format={formatSignedIDR}
                  formatTick={formatIDRCompact}
                  formatDate={shortDate}
                />
              </div>
            </ChartCard>

            <ChartCard title="Value by asset" note="What each asset class is worth over time">
              <Legend
                items={[
                  { label: ASSET_LABEL.GOLD, color: ASSET_COLOR.GOLD },
                  { label: ASSET_LABEL.RDPU, color: ASSET_COLOR.RDPU },
                ]}
              />
              <div className="mt-3">
                <LineChart
                  label="Gold and RDPU value over time"
                  dates={dates}
                  series={[
                    { id: "gold", label: "Gold", color: ASSET_COLOR.GOLD, values: points.map((p) => p.byAsset.GOLD) },
                    { id: "rdpu", label: "RDPU", color: ASSET_COLOR.RDPU, values: points.map((p) => p.byAsset.RDPU) },
                  ]}
                  format={formatIDR}
                  formatTick={formatIDRCompact}
                  formatDate={shortDate}
                />
              </div>
            </ChartCard>

            <ChartCard title="Monthly performance" note="Market gain each month, new capital excluded">
              <div className="h-[18px]" />
              <div className="mt-3">
                <ColumnChart
                  label="Market gain or loss per month"
                  labels={months.map((m) => m.month)}
                  values={months.map((m) => m.gain)}
                  format={formatSignedIDR}
                  formatTick={formatIDRCompact}
                  formatLabel={monthLabel}
                  detail={(i) => `${formatPct(months[i].returnPct)} return`}
                />
              </div>
            </ChartCard>
          </div>
        )}
      </div>

      {/* performance history — always available, and the charts' table twin */}
      {!asTable && months.length > 0 ? (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none t-label text-secondary hover:text-ink">
            <span className="group-open:hidden">Show performance history ↓</span>
            <span className="hidden group-open:inline">Hide performance history ↑</span>
          </summary>
          <HistoryTable months={months} />
        </details>
      ) : null}
    </section>
  );
}

function ChartCard({ title, note, children }: { title: string; note: string; children: React.ReactNode }) {
  return (
    <Card className="min-w-0 p-5">
      <h3 className="font-display text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
      <p className="mb-4 mt-0.5 text-[12.5px] text-secondary">{note}</p>
      {children}
    </Card>
  );
}

function QuickStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <p className="t-label text-secondary">{label}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[15px] font-medium text-ink">{children}</p>
    </Card>
  );
}

function AssetName({ asset }: { asset: "GOLD" | "RDPU" }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: ASSET_COLOR[asset] }} />
      {ASSET_LABEL[asset]}
    </span>
  );
}

function HistoryTable({ months }: { months: MonthRow[] }) {
  const rows = [...months].reverse();
  return (
    <Card className="thin-scroll mt-3 overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-divider">
            {["Month", "New capital", "Capital to date", "Value at month end", "Market gain", "Return"].map((h, i) => (
              <th key={h} className={`px-4 py-3 t-label font-normal text-secondary ${i ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.month} className="border-b border-divider last:border-0">
              <td className="px-4 py-2.5 text-ink">{monthLong(m.month)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-secondary">{m.flows ? formatIDR(m.flows) : "—"}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink">{formatIDR(m.capital)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums text-ink">{formatIDR(m.endValue)}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${signClass(m.gain)}`}>{formatSignedIDR(m.gain)}</td>
              <td className={`px-4 py-2.5 text-right tabular-nums ${signClass(m.gain)}`}>{formatPct(m.returnPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
