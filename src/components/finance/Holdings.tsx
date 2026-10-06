"use client";

import { Coins, Landmark, Pencil, Plus } from "lucide-react";
import type { AssetSummary } from "@/lib/finance-calc";
import {
  ASSET_COLOR,
  formatDate,
  formatDateTime,
  formatIDR,
  formatIDRCompact,
  formatPrice,
  formatQuantity,
  type PricePoint,
} from "@/lib/finance-shared";
import { Card, GhostButton, IconBadge, ReturnPill, SignedAmount, Spinner } from "@/components/finance/ui";

export type Instrument = {
  key: string;
  label: string;
  quote: PricePoint | null;
};

/** A fund held, with what it's worth now. */
export type FundHolding = Instrument & { value: number; capital: number; pl: number; plPct: number | null };

/** 3 · Gold portfolio. */
export function GoldCard({
  summary,
  quote,
  retail,
  busy,
  onAdd,
  onSetPrice,
}: {
  summary: AssetSummary;
  /** The price holdings are valued at — Antam's buyback, normally. */
  quote: PricePoint | null;
  /** Antam's buying price for 1 g, for context. */
  retail: PricePoint | null;
  busy: boolean;
  onAdd: () => void;
  onSetPrice: () => void;
}) {
  const held = summary.count > 0;
  return (
    <Card as="section" className="flex flex-col p-6 sm:p-7">
      <Header
        icon={<Coins className="h-5 w-5" strokeWidth={1.75} />}
        color={ASSET_COLOR.GOLD}
        title="Gold"
        subtitle={held ? `${formatQuantity("GOLD", summary.quantity)} held` : "No gold yet"}
        pill={held ? <ReturnPill value={summary.pl} pct={summary.plPct} size="md" /> : null}
      />

      {held ? (
        <>
          <Value value={summary.value} />
          <Facts
            rows={[
              ["Invested", formatIDR(summary.capital)],
              ["Profit / loss", <SignedAmount key="pl" value={summary.pl} />],
            ]}
          />
        </>
      ) : (
        <Empty text="Log a purchase and it’s valued at today’s gold price." />
      )}

      <div className="mt-auto pt-6">
        <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
          <div className="min-w-0">
            <p className="text-[12px] text-secondary">
              {quote?.source === "manual"
                ? "Your gold price"
                : quote?.source === "spot"
                  ? "Spot gold price"
                  : "Antam buyback price"}
            </p>
            <p className="mt-0.5 text-[14px] font-medium tabular-nums text-ink">
              {quote ? (
                <>
                  {formatPrice(Math.round(quote.price))}
                  <span className="font-normal text-secondary"> / gram</span>
                </>
              ) : busy ? (
                <span className="inline-flex items-center gap-2 font-normal text-secondary">
                  <Spinner /> Fetching…
                </span>
              ) : (
                <span className="font-normal text-secondary">Unavailable</span>
              )}
            </p>
            {quote ? (
              <p className="mt-0.5 text-[11.5px] text-secondary">
                {quote.source === "manual"
                  ? `Set by you · ${formatDate(quote.date, { day: "numeric", month: "short" })}`
                  : quote.source === "spot"
                    ? `Antam unavailable · ${formatDateTime(quote.updatedAt)}`
                    : `${retail ? `Buying price ${formatPrice(retail.price)} · ` : ""}${formatDate(quote.date, { day: "numeric", month: "short" })}`}
              </p>
            ) : null}
          </div>
          <GhostButton onClick={onSetPrice} label="Set gold price">
            <Pencil className="h-3.5 w-3.5" />
          </GhostButton>
        </div>
        <AddButton onClick={onAdd}>Add gold purchase</AddButton>
      </div>
    </Card>
  );
}

/** 4 · RDPU (money-market fund) portfolio. */
export function RdpuCard({
  summary,
  funds,
  onAdd,
  onSetPrice,
}: {
  summary: AssetSummary;
  funds: FundHolding[];
  onAdd: () => void;
  onSetPrice: (fund: FundHolding) => void;
}) {
  const held = summary.count > 0;
  return (
    <Card as="section" className="flex flex-col p-6 sm:p-7">
      <Header
        icon={<Landmark className="h-5 w-5" strokeWidth={1.75} />}
        color={ASSET_COLOR.RDPU}
        title="RDPU"
        subtitle={held ? `${funds.length} money-market ${funds.length === 1 ? "fund" : "funds"}` : "Money-market funds"}
        pill={held ? <ReturnPill value={summary.pl} pct={summary.plPct} size="md" /> : null}
      />

      {held ? (
        <>
          <Value value={summary.value} />
          <Facts
            rows={[
              ["Invested", formatIDR(summary.capital)],
              ["Profit / loss", <SignedAmount key="pl" value={summary.pl} />],
            ]}
          />
          <ul className="mt-6 space-y-2">
            {funds.map((f) => (
              <li key={f.key} className="group flex items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px] text-ink" title={f.label}>
                    {f.label}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11.5px] text-secondary">
                    {f.quote ? `NAB ${formatPrice(f.quote.price)} · ${formatDate(f.quote.date, { day: "numeric", month: "short" })}` : "NAB not set"}
                    <button
                      onClick={() => onSetPrice(f)}
                      aria-label={`Set NAB for ${f.label}`}
                      className="rounded p-0.5 opacity-60 transition-opacity hover:text-ink hover:opacity-100"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[14px] font-medium tabular-nums text-ink">{formatIDRCompact(f.value)}</p>
                  <div className="mt-0.5">
                    <ReturnPill value={f.pl} pct={f.plPct} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Empty text="Add a fund — its NAB updates automatically every day." />
      )}

      <div className="mt-auto pt-6">
        <AddButton onClick={onAdd}>Add RDPU investment</AddButton>
      </div>
    </Card>
  );
}

function Header({
  icon,
  color,
  title,
  subtitle,
  pill,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  pill: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <IconBadge color={color}>{icon}</IconBadge>
        <div>
          <h2 className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
          <p className="text-[13px] text-secondary">{subtitle}</p>
        </div>
      </div>
      {pill}
    </div>
  );
}

function Value({ value }: { value: number }) {
  return (
    <p className="mt-6 font-display text-[32px] font-semibold leading-none tracking-[-0.03em] text-ink">
      {formatIDR(value)}
    </p>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-4">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[12px] text-secondary">{label}</dt>
          <dd className="mt-0.5 text-[14px] font-medium tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="mt-6 max-w-[34ch] text-[14px] leading-relaxed text-secondary">{text}</p>;
}

function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-divider px-4 py-2.5 text-[13px] font-medium text-secondary transition-colors hover:border-ink/40 hover:text-ink"
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
      {children}
    </button>
  );
}
