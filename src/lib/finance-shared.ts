// Client-safe Finance Deck types, constants and formatters (no prisma import).

export type Asset = "GOLD" | "RDPU";
export const ASSETS: Asset[] = ["GOLD", "RDPU"];

export const ASSET_LABEL: Record<Asset, string> = {
  GOLD: "Gold",
  RDPU: "RDPU",
};

/** Series colours — validated as a categorical pair against the white surface. */
export const ASSET_COLOR: Record<Asset, string> = {
  GOLD: "#B07D1A",
  RDPU: "#2F6FA3",
};

export const GAIN_COLOR = "#2E7D4F";
export const LOSS_COLOR = "#B42318";

export const PLATFORM_SUGGESTIONS: Record<Asset, string[]> = {
  GOLD: ["Antam", "Pegadaian", "Galeri 24", "UBS", "Hartadinata", "Pluang", "Tring", "Treasury", "Bank Syariah Indonesia"],
  RDPU: ["Bibit", "Bareksa", "Ajaib", "Pluang", "Makmur", "Tanamduit"],
};

/** Serialised purchase, as the client sees it. `date` is yyyy-mm-dd. */
export type Investment = {
  id: string;
  asset: Asset;
  fundId: number | null;
  fundName: string;
  platform: string;
  quantity: number;
  price: number;
  amount: number;
  date: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Where a price came from. "antam" = Antam's official buyback (or, for the
 * retail key, buying) price; "spot" = international spot, the fallback when
 * Antam's price can't be fetched; "auto" = a fund's NAB; "manual" = set by hand.
 */
export type PriceSource = "antam" | "spot" | "auto" | "manual";

/** One day's closing price for an instrument. `date` is yyyy-mm-dd. */
export type PricePoint = {
  key: string;
  date: string;
  price: number;
  source: PriceSource;
  updatedAt: string;
};

/** A money-market fund as listed by the market data source. */
export type FundQuote = {
  id: number;
  name: string;
  manager: string;
  nav: number;
  navDate: string;
};

/** Outcome of one market refresh — per-instrument errors don't fail the whole run. */
export type RefreshResult = {
  prices: PricePoint[];
  errors: string[];
  refreshedAt: string;
};

export const GOLD_KEY = "GOLD";
/** Antam's per-gram price for buying a 1 g bar — prefills new purchases. */
export const GOLD_RETAIL_KEY = "GOLD:retail";

/** The MarketPrice key an investment is valued against. */
export function priceKey(inv: Pick<Investment, "asset" | "fundId" | "fundName">): string {
  if (inv.asset === "GOLD") return GOLD_KEY;
  return inv.fundId != null ? `RDPU:${inv.fundId}` : `RDPU:name:${inv.fundName.trim().toLowerCase()}`;
}

/** Today's date in Jakarta, yyyy-mm-dd — the market's calendar day. */
export function todayJakarta(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

// ── formatting ────────────────────────────────────────────────

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});
const idrCompact = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const num = (digits: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: digits });

export const formatIDR = (v: number) => idr.format(Math.round(v));
export const formatIDRCompact = (v: number) => idrCompact.format(v);

/** Signed rupiah: "+Rp 12.500" / "−Rp 3.000". */
export function formatSignedIDR(v: number) {
  const rounded = Math.round(v);
  if (rounded === 0) return formatIDR(0);
  return `${rounded > 0 ? "+" : "−"}${idr.format(Math.abs(rounded))}`;
}

export function formatPct(v: number | null, signed = true) {
  if (v === null || !Number.isFinite(v)) return "—";
  const body = num(2).format(Math.abs(v * 100));
  const sign = !signed || Math.abs(v) < 0.00005 ? "" : v > 0 ? "+" : "−";
  return `${sign}${body}%`;
}

export function formatQuantity(asset: Asset, v: number) {
  return asset === "GOLD" ? `${num(4).format(v)} g` : `${num(4).format(v)} unit`;
}

export const formatPrice = (v: number) => `Rp ${num(2).format(v)}`;

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  // Date-only strings are parsed as UTC; render them in UTC so the day never shifts.
  return new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso).toLocaleDateString("id-ID", {
    ...opts,
    timeZone: iso.length === 10 ? "UTC" : "Asia/Jakarta",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

/** Tailwind text class for a signed figure. */
export function signClass(v: number) {
  if (Math.round(v) === 0) return "text-secondary";
  return v > 0 ? "text-gain" : "text-loss";
}
