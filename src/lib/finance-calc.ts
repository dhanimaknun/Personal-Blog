// Finance Deck business logic — pure functions over investments + price
// history, shared by the dashboard UI. No I/O, no React, no prisma.

import {
  ASSETS,
  priceKey,
  type Asset,
  type Investment,
  type PricePoint,
  type PriceSource,
} from "@/lib/finance-shared";

// ── dates (yyyy-mm-dd, treated as UTC calendar days) ──────────

const DAY_MS = 86_400_000;
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => fromMs(toMs(iso) + n * DAY_MS);
export const daysBetween = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);

function monthEnd(month: string) {
  const [y, m] = month.split("-").map(Number);
  return fromMs(Date.UTC(y, m, 0)); // day 0 of next month = last day of this one
}
function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return fromMs(Date.UTC(y, m, 1)).slice(0, 7);
}

// ── price book ────────────────────────────────────────────────

type Pt = { date: string; price: number };

export type PriceBook = {
  /** Every known price per key, ascending: market quotes plus purchase prices. */
  series: Map<string, Pt[]>;
  /** The newest market quote per key. */
  latest: Map<string, PricePoint>;
  /** The market quote before `latest`, for the daily change. */
  previous: Map<string, PricePoint>;
};

/**
 * Purchase prices double as historical price points, so the growth charts
 * have something to draw before the daily snapshots began. A market quote
 * on the same day always wins over a purchase price.
 */
export function buildPriceBook(prices: PricePoint[], investments: Investment[]): PriceBook {
  const byKey = new Map<string, Map<string, number>>();
  const put = (key: string, date: string, price: number) => {
    if (!(price > 0)) return;
    let m = byKey.get(key);
    if (!m) byKey.set(key, (m = new Map()));
    m.set(date, price);
  };

  for (const inv of investments) put(priceKey(inv), inv.date, inv.price);

  const market = new Map<string, PricePoint[]>();
  for (const p of prices) {
    put(p.key, p.date, p.price);
    const list = market.get(p.key) ?? [];
    list.push(p);
    market.set(p.key, list);
  }

  const series = new Map<string, Pt[]>();
  byKey.forEach((m, key) => {
    series.set(
      key,
      Array.from(m, ([date, price]) => ({ date, price })).sort((a, b) => a.date.localeCompare(b.date)),
    );
  });

  const latest = new Map<string, PricePoint>();
  const previous = new Map<string, PricePoint>();
  market.forEach((list, key) => {
    list.sort((a, b) => a.date.localeCompare(b.date));
    latest.set(key, list[list.length - 1]);
    if (list.length > 1) previous.set(key, list[list.length - 2]);
  });

  return { series, latest, previous };
}

/** Last known price on or before `date` (binary search). */
function priceAt(series: Pt[] | undefined, date: string): number | undefined {
  if (!series || series.length === 0) return undefined;
  let lo = 0;
  let hi = series.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (series[mid].date <= date) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return found >= 0 ? series[found].price : undefined;
}

// ── positions ─────────────────────────────────────────────────

export type Position = Investment & {
  key: string;
  currentPrice: number;
  priceDate: string | null;
  priceSource: PriceSource | "purchase";
  value: number;
  pl: number;
  plPct: number | null;
};

export function valuePositions(investments: Investment[], book: PriceBook): Position[] {
  return investments.map((inv) => {
    const key = priceKey(inv);
    const quote = book.latest.get(key);
    const series = book.series.get(key);
    // No market quote yet (e.g. a manually named fund) → newest known price.
    const fallback = series?.[series.length - 1];
    const currentPrice = quote?.price ?? fallback?.price ?? inv.price;
    const value = inv.quantity * currentPrice;
    const pl = value - inv.amount;
    return {
      ...inv,
      key,
      currentPrice,
      priceDate: quote?.date ?? fallback?.date ?? null,
      priceSource: quote?.source ?? "purchase",
      value,
      pl,
      plPct: inv.amount > 0 ? pl / inv.amount : null,
    };
  });
}

// ── summaries ─────────────────────────────────────────────────

export type AssetSummary = {
  asset: Asset;
  count: number;
  quantity: number;
  capital: number;
  value: number;
  pl: number;
  plPct: number | null;
  /** Value change between the last two market quotes, for holdings held across both. */
  dailyChange: number | null;
};

export function summarizeAsset(asset: Asset, positions: Position[], book: PriceBook): AssetSummary {
  const own = positions.filter((p) => p.asset === asset);
  let quantity = 0;
  let capital = 0;
  let value = 0;
  let daily = 0;
  let hasDaily = false;

  for (const p of own) {
    quantity += p.quantity;
    capital += p.amount;
    value += p.value;
    const latest = book.latest.get(p.key);
    const prev = book.previous.get(p.key);
    if (latest && prev && p.date <= prev.date) {
      daily += p.quantity * (latest.price - prev.price);
      hasDaily = true;
    }
  }

  const pl = value - capital;
  return {
    asset,
    count: own.length,
    quantity,
    capital,
    value,
    pl,
    plPct: capital > 0 ? pl / capital : null,
    dailyChange: hasDaily ? daily : null,
  };
}

export type PortfolioSummary = {
  capital: number;
  value: number;
  pl: number;
  returnPct: number | null;
  dailyChange: number | null;
  dailyChangePct: number | null;
  /** Money-weighted annual return (XIRR); null until there is ≥ 90 days of history. */
  annualized: number | null;
  allocation: { asset: Asset; value: number; share: number }[];
  byAsset: Record<Asset, AssetSummary>;
  best: AssetSummary | null;
  worst: AssetSummary | null;
  count: number;
  firstDate: string | null;
};

export const MIN_DAYS_FOR_ANNUALIZED = 90;

export function summarizePortfolio(
  positions: Position[],
  book: PriceBook,
  today: string,
): PortfolioSummary {
  const byAsset = Object.fromEntries(
    ASSETS.map((a) => [a, summarizeAsset(a, positions, book)]),
  ) as Record<Asset, AssetSummary>;
  const parts = ASSETS.map((a) => byAsset[a]);

  const capital = parts.reduce((s, a) => s + a.capital, 0);
  const value = parts.reduce((s, a) => s + a.value, 0);
  const pl = value - capital;

  const dailyParts = parts.filter((a) => a.dailyChange !== null);
  const dailyChange = dailyParts.length ? dailyParts.reduce((s, a) => s + (a.dailyChange ?? 0), 0) : null;
  const prevValue = dailyChange !== null ? value - dailyChange : 0;

  const held = parts.filter((a) => a.count > 0 && a.plPct !== null);
  const ranked = [...held].sort((a, b) => (b.plPct ?? 0) - (a.plPct ?? 0));

  const firstDate = positions.length
    ? positions.reduce((min, p) => (p.date < min ? p.date : min), positions[0].date)
    : null;

  let annualized: number | null = null;
  if (firstDate && daysBetween(firstDate, today) >= MIN_DAYS_FOR_ANNUALIZED && value > 0) {
    annualized = xirr([
      ...positions.map((p) => ({ date: p.date, amount: -p.amount })),
      { date: today, amount: value },
    ]);
  }

  return {
    capital,
    value,
    pl,
    returnPct: capital > 0 ? pl / capital : null,
    dailyChange,
    dailyChangePct: dailyChange !== null && prevValue > 0 ? dailyChange / prevValue : null,
    annualized,
    allocation: parts.map((a) => ({ asset: a.asset, value: a.value, share: value > 0 ? a.value / value : 0 })),
    byAsset,
    best: ranked[0] ?? null,
    worst: ranked.length > 1 ? ranked[ranked.length - 1] : null,
    count: positions.length,
    firstDate,
  };
}

/**
 * Annualised internal rate of return for dated cash flows (negative = money
 * in). Newton's method, falling back to bisection when it fails to converge.
 */
export function xirr(flows: { date: string; amount: number }[]): number | null {
  if (flows.length < 2) return null;
  const t0 = flows.reduce((min, f) => (f.date < min ? f.date : min), flows[0].date);
  const ts = flows.map((f) => ({ t: daysBetween(t0, f.date) / 365, a: f.amount }));
  if (!ts.some((f) => f.a < 0) || !ts.some((f) => f.a > 0)) return null;

  const npv = (r: number) => ts.reduce((s, f) => s + f.a / Math.pow(1 + r, f.t), 0);
  const dnpv = (r: number) => ts.reduce((s, f) => s - (f.t * f.a) / Math.pow(1 + r, f.t + 1), 0);

  let r = 0.1;
  for (let i = 0; i < 50; i++) {
    const f = npv(r);
    const d = dnpv(r);
    if (!Number.isFinite(f) || !Number.isFinite(d) || d === 0) break;
    const next = r - f / d;
    if (next <= -0.9999) break;
    if (Math.abs(next - r) < 1e-9) return next;
    r = next;
  }

  let lo = -0.9999;
  let hi = 10;
  let flo = npv(lo);
  if (flo * npv(hi) > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-6) return mid;
    if (flo * fm < 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

// ── history ───────────────────────────────────────────────────

export type TimelinePoint = {
  date: string;
  capital: number;
  value: number;
  pl: number;
  byAsset: Record<Asset, number>;
};

function snapshotAt(investments: Investment[], book: PriceBook, date: string): TimelinePoint {
  const byAsset: Record<Asset, number> = { GOLD: 0, RDPU: 0 };
  let capital = 0;
  for (const inv of investments) {
    if (inv.date > date) continue;
    capital += inv.amount;
    const price = priceAt(book.series.get(priceKey(inv)), date) ?? inv.price;
    byAsset[inv.asset] += inv.quantity * price;
  }
  const value = byAsset.GOLD + byAsset.RDPU;
  return { date, capital, value, pl: value - capital, byAsset };
}

const MAX_POINTS = 150;

/** Portfolio value vs capital from the first purchase to today, at most ~150 points. */
export function buildTimeline(investments: Investment[], book: PriceBook, today: string): TimelinePoint[] {
  if (investments.length === 0) return [];
  const first = investments.reduce((min, i) => (i.date < min ? i.date : min), investments[0].date);
  if (first > today) return [];

  const span = daysBetween(first, today);
  const step = Math.max(1, Math.ceil(span / MAX_POINTS));
  const points: TimelinePoint[] = [];
  for (let d = first; d < today; d = addDays(d, step)) points.push(snapshotAt(investments, book, d));
  points.push(snapshotAt(investments, book, today));
  return points;
}

export type MonthRow = {
  month: string; // yyyy-mm
  startValue: number;
  endValue: number;
  /** New capital invested during the month. */
  flows: number;
  /** Market gain for the month: end − start − new capital. */
  gain: number;
  /** Simple Dietz-style return: gain ÷ (start value + new capital). */
  returnPct: number | null;
  capital: number;
};

export function buildMonthly(investments: Investment[], book: PriceBook, today: string): MonthRow[] {
  if (investments.length === 0) return [];
  const first = investments.reduce((min, i) => (i.date < min ? i.date : min), investments[0].date);
  const rows: MonthRow[] = [];
  const lastMonth = today.slice(0, 7);

  for (let m = first.slice(0, 7); m <= lastMonth; m = nextMonth(m)) {
    const start = snapshotAt(investments, book, addDays(`${m}-01`, -1));
    const endDate = m === lastMonth ? today : monthEnd(m);
    const end = snapshotAt(investments, book, endDate);
    const flows = investments
      .filter((i) => i.date.startsWith(m))
      .reduce((s, i) => s + i.amount, 0);
    const gain = end.value - start.value - flows;
    const base = start.value + flows;
    rows.push({
      month: m,
      startValue: start.value,
      endValue: end.value,
      flows,
      gain,
      returnPct: base > 0 ? gain / base : null,
      capital: end.capital,
    });
  }
  return rows;
}

// ── list helpers ──────────────────────────────────────────────

export type SortKey = "date" | "amount" | "value" | "pl" | "plPct";
export type Outcome = "ALL" | "GAIN" | "LOSS";

export function filterAndSort(
  positions: Position[],
  opts: { query: string; outcome: Outcome; fund: string; sort: SortKey; dir: "asc" | "desc" },
): Position[] {
  const q = opts.query.trim().toLowerCase();
  const list = positions.filter((p) => {
    if (opts.fund !== "ALL" && p.key !== opts.fund) return false;
    if (opts.outcome === "GAIN" && p.pl < 0) return false;
    if (opts.outcome === "LOSS" && p.pl >= 0) return false;
    if (q && !`${p.fundName} ${p.platform} ${p.notes} ${p.date}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const sign = opts.dir === "asc" ? 1 : -1;
  const val = (p: Position): number | string =>
    opts.sort === "date" ? p.date : opts.sort === "plPct" ? p.plPct ?? 0 : p[opts.sort];
  return list.sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    const c = typeof va === "string" ? va.localeCompare(vb as string) : va - (vb as number);
    return c * sign || b.createdAt.localeCompare(a.createdAt);
  });
}
