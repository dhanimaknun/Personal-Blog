"use client";

import { useMemo, useState } from "react";
import { AlertCircle, Plus, RefreshCw } from "lucide-react";
import { GOLD_KEY, GOLD_RETAIL_KEY, formatDateTime, type Asset, type Investment, type PricePoint } from "@/lib/finance-shared";
import type { Position } from "@/lib/finance-calc";
import { useFinance } from "@/components/finance/useFinance";
import { Overview } from "@/components/finance/Overview";
import { GoldCard, RdpuCard, type FundHolding, type Instrument } from "@/components/finance/Holdings";
import { Performance } from "@/components/finance/Performance";
import { Transactions } from "@/components/finance/Transactions";
import { InvestmentModal } from "@/components/finance/InvestmentModal";
import { PriceModal } from "@/components/finance/PriceModal";
import { Card, Spinner } from "@/components/finance/ui";

export function FinanceDeck(props: { investments: Investment[]; prices: PricePoint[]; today: string }) {
  const fin = useFinance(props);
  const [adding, setAdding] = useState<Asset | null>(null);
  const [editing, setEditing] = useState<Position | null>(null);
  const [pricing, setPricing] = useState<{ instrument: Instrument; isGold: boolean } | null>(null);

  const goldQuote = fin.book.latest.get(GOLD_KEY) ?? null;
  const goldRetail = fin.book.latest.get(GOLD_RETAIL_KEY) ?? null;
  // A new purchase is priced at what Antam charges, not what it buys back at.
  const purchasePrice = goldRetail?.price ?? goldQuote?.price ?? null;

  /** RDPU holdings rolled up per fund, largest first. */
  const funds = useMemo(() => {
    const byKey = new Map<string, FundHolding>();
    for (const p of fin.positions) {
      if (p.asset !== "RDPU") continue;
      const f = byKey.get(p.key) ?? {
        key: p.key,
        label: p.fundName,
        quote: fin.book.latest.get(p.key) ?? null,
        value: 0,
        capital: 0,
        pl: 0,
        plPct: null,
      };
      f.value += p.value;
      f.capital += p.amount;
      f.pl = f.value - f.capital;
      f.plPct = f.capital > 0 ? f.pl / f.capital : null;
      byKey.set(p.key, f);
    }
    return Array.from(byKey.values()).sort((a, b) => b.value - a.value);
  }, [fin.positions, fin.book]);

  const empty = fin.investments.length === 0;
  const stamp = fin.lastUpdated ?? fin.checkedAt;

  return (
    <div className="mx-auto max-w-[1080px]">
      <header className="mt-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[14px] text-secondary">Finance Deck</p>
          <h1 className="mt-1 font-display text-[30px] font-semibold tracking-[-0.025em] text-ink md:text-[36px]">
            Your investments
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[12.5px] text-secondary" aria-live="polite">
            {fin.refreshing ? "Updating prices…" : stamp ? `Updated ${formatDateTime(stamp)}` : "No prices yet"}
          </p>
          <button
            onClick={() => fin.refresh(true)}
            disabled={fin.refreshing}
            aria-label="Refresh prices"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-surface text-secondary shadow-sm ring-1 ring-divider/70 transition-colors hover:text-ink disabled:opacity-60"
          >
            {fin.refreshing ? <Spinner className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" strokeWidth={1.75} />}
          </button>
          {!empty ? (
            <button
              onClick={() => setAdding("GOLD")}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              Add
            </button>
          ) : null}
        </div>
      </header>

      {fin.errors.length > 0 ? (
        <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl bg-loss/5 px-5 py-4 text-[13px] text-ink">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-loss" strokeWidth={1.75} />
          <div>
            <p className="font-medium">Some prices couldn’t be updated.</p>
            <p className="mt-0.5 text-secondary">Your figures use the last known prices. {fin.errors.join(" · ")}</p>
          </div>
        </div>
      ) : null}

      {empty ? (
        <Card className="mt-10 px-6 py-20 text-center">
          <p className="font-display text-[24px] font-semibold tracking-[-0.02em] text-ink">Start your deck</p>
          <p className="mx-auto mt-2 max-w-[38ch] text-[15px] leading-relaxed text-secondary">
            Add a gold purchase or a money-market fund. From then on, it’s valued for you every day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setAdding("GOLD")}
              className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-canvas transition-opacity hover:opacity-90"
            >
              Add gold
            </button>
            <button
              onClick={() => setAdding("RDPU")}
              className="rounded-full bg-surface px-5 py-2.5 text-[14px] font-medium text-ink ring-1 ring-divider transition-colors hover:ring-ink/30"
            >
              Add RDPU
            </button>
          </div>
        </Card>
      ) : (
        <div className={`mt-10 space-y-14 transition-opacity ${fin.refreshing ? "opacity-[0.85]" : ""}`}>
          {/* 1 · summary  2 · allocation */}
          <Overview summary={fin.summary} />

          {/* 3 · gold  4 · RDPU */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <GoldCard
              summary={fin.summary.byAsset.GOLD}
              quote={goldQuote}
              retail={goldRetail}
              busy={fin.refreshing}
              onAdd={() => setAdding("GOLD")}
              onSetPrice={() =>
                setPricing({ instrument: { key: GOLD_KEY, label: "Gold", quote: goldQuote }, isGold: true })
              }
            />
            <RdpuCard
              summary={fin.summary.byAsset.RDPU}
              funds={funds}
              onAdd={() => setAdding("RDPU")}
              onSetPrice={(f) => setPricing({ instrument: f, isGold: false })}
            />
          </div>

          {/* 5 · performance */}
          <Performance
            timeline={fin.timeline}
            monthly={fin.monthly}
            summary={fin.summary}
            today={fin.today}
            busy={fin.refreshing}
          />

          {/* 6 · transactions */}
          <Transactions positions={fin.positions} onOpen={setEditing} />
        </div>
      )}

      {adding ? (
        <InvestmentModal
          asset={adding}
          today={fin.today}
          goldPrice={purchasePrice}
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
          goldPrice={purchasePrice}
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
