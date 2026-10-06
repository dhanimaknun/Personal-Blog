// Finance Deck market data — free, keyless public sources:
//
//   Gold  → Antam's official prices as republished on harga-emas.org (run by
//           Pluang; logammulia.com itself blocks automated requests). Holdings
//           are valued at the BUYBACK price — what Antam pays if you sell —
//           and the 1 g buying price is kept as GOLD_RETAIL_KEY to prefill new
//           purchases. If that page can't be read, fall back to international
//           spot: XAU/USD from gold-api.com × USD/IDR from open.er-api.com.
//           A manual price for a day is never overwritten.
//   RDPU  → latest NAB per unit from Pasardana's public fund list (money-market
//           category, IDR share classes only).
//
// Each fetched quote is upserted as that day's MarketPrice row, so the table
// doubles as the price history the charts are drawn from.

import { prisma } from "@/lib/prisma";
import {
  GOLD_KEY,
  GOLD_RETAIL_KEY,
  priceKey,
  todayJakarta,
  type FundQuote,
  type PriceSource,
  type RefreshResult,
} from "@/lib/finance-shared";
import { getMarketPrices } from "@/lib/finance";

const TROY_OUNCE_GRAMS = 31.1034768;
const TIMEOUT_MS = 12_000;
/** Don't hit the sources again if a key was refreshed this recently. */
const STALE_AFTER_MS = 30 * 60_000;

const ANTAM_URL = "https://harga-emas.org/";
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

async function getText(url: string): Promise<string> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (FinanceDeck)" },
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} responded ${res.status}`);
  return res.text();
}

// ── gold ──────────────────────────────────────────────────────

const MONTHS_ID = [
  "januari", "februari", "maret", "april", "mei", "juni",
  "juli", "agustus", "september", "oktober", "november", "desember",
];

const rupiah = (s: string) => Number(s.replace(/\./g, ""));

export type AntamQuote = {
  /** Antam's buyback price per gram. */
  buyback: number;
  /** Antam's price for buying a 1 g bar, when the table could be read. */
  retail: number | null;
  /** The day Antam published the price, yyyy-mm-dd. */
  date: string;
};

/**
 * Antam's prices from harga-emas.org's server-rendered page. The markers are
 * the page's own labels ("Harga pembelian kembali", "Update harga LM Antam");
 * if any of them stops matching, this throws and the caller falls back to spot.
 */
export async function fetchAntamPrice(): Promise<AntamQuote> {
  const html = (await getText(ANTAM_URL)).replace(/<!-- -->/g, "");

  const buyback = rupiah(html.match(/Harga pembelian kembali:\s*Rp\s*([\d.]+)/)?.[1] ?? "");
  if (!(buyback > 100_000)) throw new Error("Antam buyback price not found on harga-emas.org");

  const stamp = html.match(/Update harga LM Antam:\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  const month = stamp ? MONTHS_ID.indexOf(stamp[2].toLowerCase()) : -1;
  if (!stamp || month < 0) throw new Error("Antam price date not found on harga-emas.org");
  const date = `${stamp[3]}-${String(month + 1).padStart(2, "0")}-${stamp[1].padStart(2, "0")}`;

  // The 1 g row of the Antam/Pegadaian table (the UBS table's cells have no <div>).
  const table = html.slice(html.indexOf("iconAntam"));
  const retailRaw = table.match(/<tr><td><p>1<\/p><\/td><td[^>]*><div[^>]*><p>([\d.]+)<\/p>/)?.[1];
  const retail = retailRaw ? rupiah(retailRaw) : null;

  return { buyback, retail: retail && retail > buyback ? retail : null, date };
}

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
async function saveAutoPrice(key: string, date: string, price: number, source: PriceSource = "auto") {
  const where = { key_date: { key, date: asDate(date) } };
  const existing = await prisma.marketPrice.findUnique({ where });
  if (existing?.source === "manual") return;
  await prisma.marketPrice.upsert({
    where,
    create: { key, date: asDate(date), price, source },
    update: { price, source },
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
    tasks.push(refreshGold().catch((err) => {
      console.error("[finance] gold refresh failed", err);
      errors.push(`Gold price: ${(err as Error).message}`);
    }));
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

  async function refreshGold() {
    try {
      const antam = await fetchAntamPrice();
      await saveAutoPrice(GOLD_KEY, antam.date, antam.buyback, "antam");
      if (antam.retail) await saveAutoPrice(GOLD_RETAIL_KEY, antam.date, antam.retail, "antam");
      // Spot stand-ins from while Antam was unreachable would otherwise sort
      // after Antam's (older-dated) quote and keep winning as "latest".
      // ("auto" = spot rows saved before gold switched to Antam.)
      await prisma.marketPrice.deleteMany({
        where: { key: GOLD_KEY, source: { in: ["spot", "auto"] }, date: { gt: asDate(antam.date) } },
      });
    } catch (err) {
      console.error("[finance] Antam price unavailable, using spot", err);
      const spot = await fetchGoldPricePerGram();
      await saveAutoPrice(GOLD_KEY, todayJakarta(), spot, "spot");
      errors.push("Antam’s price couldn’t be read — gold is valued at the international spot price for now.");
    }
  }

  await Promise.all(tasks);
  return { prices: await getMarketPrices(), errors, refreshedAt: new Date().toISOString() };
}
