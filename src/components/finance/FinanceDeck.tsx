"use client";

import { useMemo, useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { GOLD_KEY, formatDateTime, type Asset, type Investment, type PricePoint } from "@/lib/finance-shared";
import type { Position } from "@/lib/finance-calc";
import { useFinance } from "@/components/finance/useFinance";
import { SummaryCards } from "@/components/finance/SummaryCards";
import { Analytics } from "@/components/finance/Analytics";
import { AssetSection, type Instrument } from "@/components/finance/AssetSection";
import { InvestmentModal } from "@/components/finance/InvestmentModal";
import { PriceModal } from "@/components/finance/PriceModal";
import { Card, Spinner } from "@/components/finance/ui";

export function FinanceDeck(props: { investments: Investment[]; prices: PricePoint[]; today: string }) {
  const fin = useFinance(props);
  const [adding, setAdding] = useState<Asset | null>(null);
  const [editing, setEditing] = useState<Position | null>(null);
  const [pricing, setPricing] = useState<{ instrument: Instrument; isGold: boolean } | null>(null);

  const goldQuote = fin.book.latest.get(GOLD_KEY) ?? null;

  const { gold, rdpu, funds } = useMemo(() => {
    const gold = fin.positions.filter((p) => p.asset === "GOLD");
    const rdpu = fin.positions.filter((p) => p.asset === "RDPU");
    const byKey = new Map<string, Instrument>();
    for (const p of rdpu) {
      if (!byKey.has(p.key)) byKey.set(p.key, { key: p.key, label: p.fundName, quote: fin.book.latest.get(p.key) ?? null });
    }
    return { gold, rdpu, funds: Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label)) };
  }, [fin.positions, fin.book]);

  const empty = fin.investments.length === 0;
  const stamp = fin.lastUpdated ?? fin.checkedAt;

  return (
    <div>
      <header className="mt-16 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="t-eyebrow">Finance Deck</p>
          <h1 className="mt-4 max-w-[18ch] font-display text-[32px] font-semibold leading-[1.12] tracking-tight text-ink md:text-[44px]">
            Slow money, <span className="text-accent">kept honest.</span>
          </h1>
          <p className="t-excerpt mt-4 max-w-[46ch]">Gold and money-market funds, valued at today’s prices.</p>
        </div>

        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <button
            onClick={() => fin.refresh(true)}
            disabled={fin.refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-divider bg-surface px-3 py-1.5 text-[13px] text-ink transition-colors hover:border-ink disabled:opacity-60"
          >
            {fin.refreshing ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.75} />}
            {fin.refreshing ? "Updating prices…" : "Refresh prices"}
          </button>
          <p className="t-label text-secondary" aria-live="polite">
            {stamp ? `Prices updated ${formatDateTime(stamp)} WIB` : fin.refreshing ? "Fetching market data…" : "No market data yet"}
          </p>
        </div>
      </header>

      {fin.errors.length > 0 ? (
        <div role="alert" className="mt-8 flex items-start gap-2.5 rounded-lg border border-loss/30 bg-loss/5 px-4 py-3 text-[13px] text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-loss" strokeWidth={1.75} />
          <div>
            <p>Some market data couldn’t be updated — figures use the last known prices.</p>
            <ul className="mt-1 text-secondary">
              {fin.errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {empty ? (
        <Card className="mt-14 px-6 py-16 text-center">
          <p className="font-display text-[22px] font-semibold tracking-tight text-ink">Nothing tracked yet.</p>
          <p className="t-excerpt mx-auto mt-2 max-w-[40ch]">
            Log your first gold purchase or money-market fund — the dashboard values it automatically from then on.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setAdding("GOLD")}
              className="rounded-lg bg-ink px-4 py-2 text-[14px] font-medium text-canvas transition-opacity hover:opacity-90"
            >
              Add gold purchase
            </button>
            <button
              onClick={() => setAdding("RDPU")}
              className="rounded-lg border border-divider px-4 py-2 text-[14px] text-ink hover:border-ink"
            >
              Add RDPU investment
            </button>
          </div>
        </Card>
      ) : (
        <>
          <div className={`mt-14 transition-opacity ${fin.refreshing ? "opacity-80" : ""}`}>
            <SummaryCards summary={fin.summary} fundCount={funds.length} />
          </div>

          <Analytics
            timeline={fin.timeline}
            monthly={fin.monthly}
            summary={fin.summary}
            today={fin.today}
            busy={fin.refreshing}
          />

          <AssetSection
            asset="GOLD"
            positions={gold}
            summary={fin.summary.byAsset.GOLD}
            instruments={[{ key: GOLD_KEY, label: "Gold", quote: goldQuote }]}
            busy={fin.refreshing}
            onAdd={() => setAdding("GOLD")}
            onEdit={setEditing}
            onSetPrice={(instrument) => setPricing({ instrument, isGold: true })}
          />

          <AssetSection
            asset="RDPU"
            positions={rdpu}
            summary={fin.summary.byAsset.RDPU}
            instruments={funds}
            busy={fin.refreshing}
            onAdd={() => setAdding("RDPU")}
            onEdit={setEditing}
            onSetPrice={(instrument) => setPricing({ instrument, isGold: false })}
          />
        </>
      )}

      {adding ? (
        <InvestmentModal
          asset={adding}
          today={fin.today}
          goldPrice={goldQuote?.price ?? null}
          onClose={() => setAdding(null)}
          onSubmit={async (data) => {
            await fin.create(data);
            setAdding(null);
          }}
        />
      ) : null}

      {editing ? (
        <InvestmentModal
          asset={editing.asset}
          entry={editing}
          today={fin.today}
          goldPrice={goldQuote?.price ?? null}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            await fin.update(editing.id, data);
            setEditing(null);
          }}
          onDelete={async () => {
            await fin.remove(editing.id);
            setEditing(null);
          }}
        />
      ) : null}

      {pricing ? (
        <PriceModal
          instrument={pricing.instrument}
          isGold={pricing.isGold}
          today={fin.today}
          onClose={() => setPricing(null)}
          onSave={(date, price) => fin.setManualPrice(pricing.instrument.key, date, price)}
        />
      ) : null}
    </div>
  );
}
