"use client";

import {
  ASSETS,
  ASSET_COLOR,
  ASSET_LABEL,
  formatIDR,
  formatPct,
  formatQuantity,
  formatSignedIDR,
  signClass,
} from "@/lib/finance-shared";
import { MIN_DAYS_FOR_ANNUALIZED, type PortfolioSummary } from "@/lib/finance-calc";
import { AllocationBar } from "@/components/finance/charts";
import { Card, Delta } from "@/components/finance/ui";

export function SummaryCards({ summary, fundCount }: { summary: PortfolioSummary; fundCount: number }) {
  const gold = summary.byAsset.GOLD;
  const rdpu = summary.byAsset.RDPU;

  const holdings = [
    gold.count ? formatQuantity("GOLD", gold.quantity) : null,
    rdpu.count ? `${fundCount} ${fundCount === 1 ? "fund" : "funds"}` : null,
  ].filter(Boolean);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* hero: what it's all worth today */}
      <Card className="p-5 sm:col-span-2 lg:row-span-2 lg:p-7">
        <p className="t-label text-secondary">Current portfolio value</p>
        <p className="mt-3 font-display text-[40px] font-semibold leading-none tracking-[-0.03em] text-ink md:text-[52px]">
          {formatIDR(summary.value)}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Delta value={summary.dailyChange} pct={summary.dailyChangePct} size="md" />
          <span className="text-[13px] text-secondary">since the previous close</span>
        </div>

        <div className="mt-8">
          <p className="mb-3 t-label text-secondary">Asset allocation</p>
          <AllocationBar
            parts={summary.allocation.map((a) => ({
              id: a.asset,
              label: ASSET_LABEL[a.asset],
              color: ASSET_COLOR[a.asset],
              share: a.share,
              detail: formatIDR(a.value),
            }))}
          />
        </div>
      </Card>

      <Tile label="Total assets" value={holdings.join(" · ") || "—"}>
        {summary.count} {summary.count === 1 ? "purchase" : "purchases"} across{" "}
        {ASSETS.filter((a) => summary.byAsset[a].count).length || 0} asset classes
      </Tile>

      <Tile label="Capital invested" value={formatIDR(summary.capital)}>
        What you put in, fees included
      </Tile>

      <Tile label="Est. profit / loss" value={formatSignedIDR(summary.pl)} tone={summary.pl}>
        Unrealised, at today’s prices
      </Tile>

      <Tile label="Total return" value={formatPct(summary.returnPct)} tone={summary.pl}>
        {summary.annualized !== null
          ? `${formatPct(summary.annualized)} a year (money-weighted)`
          : `Annualised after ${MIN_DAYS_FOR_ANNUALIZED} days of history`}
      </Tile>
    </div>
  );
}

function Tile({
  label,
  value,
  tone,
  children,
}: {
  label: string;
  value: string;
  tone?: number;
  children?: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <p className="t-label text-secondary">{label}</p>
      <p
        className={`mt-3 font-display text-[24px] font-semibold leading-tight tracking-[-0.02em] ${
          tone === undefined ? "text-ink" : signClass(tone)
        }`}
      >
        {value}
      </p>
      {children ? <p className="mt-1.5 text-[12.5px] leading-snug text-secondary">{children}</p> : null}
    </Card>
  );
}
