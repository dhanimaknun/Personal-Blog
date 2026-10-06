"use client";

import {
  ASSET_COLOR,
  ASSET_LABEL,
  formatIDR,
  formatIDRCompact,
  formatPct,
} from "@/lib/finance-shared";
import type { PortfolioSummary } from "@/lib/finance-calc";
import { AllocationBar } from "@/components/finance/charts";
import { Card, SignedAmount } from "@/components/finance/ui";

/** 1 · Portfolio summary and 2 · asset allocation — the five-second read. */
export function Overview({ summary }: { summary: PortfolioSummary }) {
  const even = Math.abs(summary.pl) < 1;
  const up = summary.pl >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card as="section" className="p-6 sm:p-8 lg:col-span-2">
        <p className="text-[14px] text-secondary">Total portfolio value</p>
        <p className="mt-2 font-display text-[44px] font-semibold leading-[1.05] tracking-[-0.035em] text-ink sm:text-[56px]">
          {formatIDR(summary.value)}
        </p>
        <p className="mt-3 text-[15px] text-secondary">
          {summary.capital > 0 && even ? (
            <>Right where you started, on {formatIDRCompact(summary.capital)} invested.</>
          ) : summary.capital > 0 ? (
            <>
              You’re{" "}
              <span className={up ? "font-medium text-gain" : "font-medium text-loss"}>
                {up ? "up" : "down"} {formatIDRCompact(Math.abs(summary.pl))}
              </span>{" "}
              on {formatIDRCompact(summary.capital)} invested.
            </>
          ) : (
            "Nothing invested yet."
          )}
        </p>

        <dl className="mt-8 grid grid-cols-1 gap-5 border-t border-divider/70 pt-6 sm:grid-cols-3 sm:gap-6">
          <Metric label="Total profit / loss" hint="If you sold everything today">
            <SignedAmount value={summary.pl} />
          </Metric>
          <Metric label="Today’s change" hint={summary.dailyChange === null ? "After the next price update" : "Since the last close"}>
            {summary.dailyChange === null ? (
              <span className="text-secondary">—</span>
            ) : (
              <>
                <SignedAmount value={summary.dailyChange} />
                <span className="ml-1.5 text-[13px] font-normal text-secondary">{formatPct(summary.dailyChangePct)}</span>
              </>
            )}
          </Metric>
          <Metric
            label="Total return"
            hint={summary.annualized !== null ? `About ${formatPct(summary.annualized, false)} a year` : "On everything you’ve put in"}
          >
            <span className={summary.returnPct === null || even ? "text-ink" : up ? "text-gain" : "text-loss"}>
              {formatPct(summary.returnPct)}
            </span>
          </Metric>
        </dl>
      </Card>

      <Card as="section" className="flex flex-col p-6 sm:p-8">
        <h2 className="text-[14px] text-secondary">Asset allocation</h2>
        <p className="mt-2 font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">
          {allocationHeadline(summary)}
        </p>
        <div className="mt-6">
          <AllocationBar
            height={10}
            showLegend={false}
            parts={summary.allocation.map((a) => ({
              id: a.asset,
              label: ASSET_LABEL[a.asset],
              color: ASSET_COLOR[a.asset],
              share: a.share,
            }))}
          />
        </div>
        <ul className="mt-6 space-y-4 lg:mt-auto lg:pt-6">
          {summary.allocation.map((a) => (
            <li key={a.asset} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-[14px] text-ink">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ASSET_COLOR[a.asset] }} />
                {ASSET_LABEL[a.asset]}
              </span>
              <span className="text-right">
                <span className="text-[14px] font-medium tabular-nums text-ink">{Math.round(a.share * 100)}%</span>
                <span className="ml-2 text-[13px] tabular-nums text-secondary">{formatIDRCompact(a.value)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function allocationHeadline(summary: PortfolioSummary) {
  const [gold, rdpu] = summary.allocation;
  if (summary.value <= 0) return "Not invested yet";
  if (gold.share >= 0.999) return "All in gold";
  if (rdpu.share >= 0.999) return "All in RDPU";
  const lead = gold.share >= rdpu.share ? gold : rdpu;
  return `Mostly ${lead.asset === "GOLD" ? "gold" : "RDPU"}`;
}

function Metric({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-secondary">{label}</dt>
      <dd className="mt-1 text-[20px] font-semibold tracking-[-0.01em]">{children}</dd>
      <dd className="mt-0.5 text-[12px] text-secondary/80">{hint}</dd>
    </div>
  );
}
