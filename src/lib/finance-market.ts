// Finance Deck market data — free, keyless public sources:
//
//   Gold  → spot XAU/USD from gold-api.com × USD/IDR from open.er-api.com,
//           converted to IDR per gram. This is the international spot price,
//           not a dealer's buyback price; set a manual price for a day to
//           value against Antam / Pegadaian instead (manual is never overwritten).
//   RDPU  → latest NAB per unit from Pasardana's public fund list (money-market
//           category, IDR share classes only).
//
// Each fetched quote is upserted as that day's MarketPrice row, so the table
// doubles as the price history the charts are drawn from.

import { prisma } from "@/lib/prisma";
import {
  GOLD_KEY,
  priceKey,
  todayJakarta,
  type FundQuote,
  type RefreshResult,
} from "@/lib/finance-shared";
import { getMarketPrices } from "@/lib/finance";

const TROY_OUNCE_GRAMS = 31.1034768;
const TIMEOUT_MS = 12_000;
/** Don't hit the sources again if a key was refreshed this recently. */
const STALE_AFTER_MS = 30 * 60_000;

const GOLD_URL = "https://api.gold-api.com/price/XAU";
const FX_URL = "https://open.er-api.com/v6/latest/USD";
// type=3 → money-market funds. ~1 MB, so it's cached in memory, not by Next.
const FUNDS_URL = "https://pasardana.id/api/FundSearchResult/GetAll?type=3";
const FUNDS_TTL_MS = 60 * 60_000;

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (FinanceDeck)" },
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  return (await res.json()) as T;
}

// ── gold ──────────────────────────────────────────────────────

/** Spot gold in IDR per gram. */
export async function fetchGoldPricePerGram(): Promise<number> {
  const [gold, fx] = await Promise.all([
    getJson<{ price?: number }>(GOLD_URL),
    getJson<{ result?: string; rates?: Record<string, number> }>(FX_URL),
  ]);
  const usdPerOunce = Number(gold.price);
  const idrPerUsd = Number(fx.rates?.IDR);
  if (!(usdPerOunce > 0)) throw new Error("Gold price source returned no price");
  if (!(idrPerUsd > 0)) throw new Error("Exchange-rate source returned no USD/IDR rate");
  return (usdPerOunce * idrPerUsd) / TROY_OUNCE_GRAMS;
}

// ── funds ─────────────────────────────────────────────────────

type RawFund = {
  Id: number;
  Name: string | null;
  InvestmentManagerName: string | null;
  Type: number | null;
  Currency: number | null;
  NetAssetValue: number | null;
  LastUpdate: string | null;
};

let fundCache: { at: number; funds: FundQuote[] } | null = null;

/** Every IDR money-market fund with a current NAB (memoised for an hour). */
export async function getMoneyMarketFunds(force = false): Promise<FundQuote[]> {
  if (!force && fundCache && Date.now() - fundCache.at < FUNDS_TTL_MS) return fundCache.funds;
  const raw = await getJson<RawFund[]>(FUNDS_URL);
  if (!Array.isArray(raw)) throw new Error("Fund source returned an unexpected payload");
  const funds = raw
    .filter((f) => f.Type === 3 && f.Currency === 0 && f.Name && Number(f.NetAssetValue) > 0 && f.LastUpdate)
    .map((f) => ({
      id: f.Id,
      name: f.Name!.trim(),
      manager: (f.InvestmentManagerName ?? "").replace(/,?\s*PT\.?$/i, "").trim(),
      nav: Number(f.NetAssetValue),
      navDate: f.LastUpdate!.slice(0, 10),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  fundCache = { at: Date.now(), funds };
  return funds;
}

export async function searchFunds(query: string, limit = 20): Promise<FundQuote[]> {
  const funds = await getMoneyMarketFunds();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return funds.slice(0, limit);
  return funds
    .filter((f) => {
      const hay = `${f.name} ${f.manager}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    })
    .slice(0, limit);
}

// ── persistence ───────────────────────────────────────────────

const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Upsert an automatic quote, leaving a manual price for that day untouched. */
async function saveAutoPrice(key: string, date: string, price: number) {
  const where = { key_date: { key, date: asDate(date) } };
  const existing = await prisma.marketPrice.findUnique({ where });
  if (existing?.source === "manual") return;
  await prisma.marketPrice.upsert({
    where,
    create: { key, date: asDate(date), price, source: "auto" },
    update: { price, source: "auto" },
  });
}

export async function saveManualPrice(key: string, date: string, price: number) {
  const where = { key_date: { key, date: asDate(date) } };
  await prisma.marketPrice.upsert({
    where,
    create: { key, date: asDate(date), price, source: "manual" },
    update: { price, source: "manual" },
  });
}

/** Drop a manual override; the next refresh fills the day back in automatically. */
export async function clearManualPrice(key: string, date: string) {
  await prisma.marketPrice.deleteMany({ where: { key, date: asDate(date), source: "manual" } });
}

/** When each key was last written — the throttle for `refreshMarketPrices`. */
async function lastTouched(): Promise<Map<string, number>> {
  const rows = await prisma.marketPrice.groupBy({ by: ["key"], _max: { updatedAt: true } });
  return new Map(rows.map((r) => [r.key, r._max.updatedAt?.getTime() ?? 0]));
}

/**
 * Pull the latest gold price and the NAB of every fund held, store them as
 * today's quotes, and return the full price history. Sources that fail are
 * reported in `errors` — the last stored prices keep the dashboard valid.
 */
export async function refreshMarketPrices({ force = false } = {}): Promise<RefreshResult> {
  const errors: string[] = [];
  const now = Date.now();
  const touched = await lastTouched();
  const isStale = (key: string) => force || now - (touched.get(key) ?? 0) > STALE_AFTER_MS;

  const investments = await prisma.investment.findMany({
    select: { asset: true, fundId: true, fundName: true },
  });
  const ownsGold = investments.some((i) => i.asset === "GOLD");
  const fundIds = Array.from(
    new Set(investments.filter((i) => i.asset === "RDPU" && i.fundId != null).map((i) => i.fundId!)),
  );
  const staleFunds = fundIds.filter((id) => isStale(priceKey({ asset: "RDPU", fundId: id, fundName: "" })));

  const tasks: Promise<void>[] = [];

  // Gold is fetched even with no holdings yet, so the add-purchase form can prefill it.
  if (isStale(GOLD_KEY) || (!ownsGold && !touched.has(GOLD_KEY))) {
    tasks.push(
      fetchGoldPricePerGram()
        .then((price) => saveAutoPrice(GOLD_KEY, todayJakarta(), price))
        .catch((err) => {
          console.error("[finance] gold refresh failed", err);
          errors.push(`Gold price: ${(err as Error).message}`);
        }),
    );
  }

  if (staleFunds.length) {
    tasks.push(
      getMoneyMarketFunds(force)
        .then(async (funds) => {
          const byId = new Map(funds.map((f) => [f.id, f]));
          for (const id of staleFunds) {
            const fund = byId.get(id);
            if (!fund) {
              errors.push(`NAB: fund #${id} is no longer listed`);
              continue;
            }
            await saveAutoPrice(`RDPU:${id}`, fund.navDate, fund.nav);
          }
        })
        .catch((err) => {
          console.error("[finance] fund refresh failed", err);
          errors.push(`RDPU NAB: ${(err as Error).message}`);
        }),
    );
  }

  await Promise.all(tasks);
  return { prices: await getMarketPrices(), errors, refreshedAt: new Date().toISOString() };
}
