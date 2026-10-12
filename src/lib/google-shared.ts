// Client-safe Google Apps types and the subscription calendar maths.
// Dates are yyyy-mm-dd strings on the Jakarta calendar.

export type Cycle = "MONTHLY" | "YEARLY";

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  cycle: Cycle;
  dueDay: number;
  dueMonth: number;
  matchFrom: string;
  matchKeyword: string;
  active: boolean;
  notes: string;
};

export type Payment = {
  subscriptionId: string;
  period: string;
  status: "PAID" | "UNPAID";
  source: "gmail" | "manual";
  paidAt: string | null;
  emailFrom: string;
  emailSubject: string;
};

export type AgendaEvent = {
  id: string;
  calendar: string;
  color: string;
  title: string;
  location: string;
  allDay: boolean;
  start: string; // ISO instant; all-day: yyyy-mm-ddT00:00:00.000Z
  end: string;
};

export type SyncState = {
  at: string;
  events: number;
  receipts: number;
  matched: number;
} | null;

/** How far ahead the agenda reaches; the Apps Script asks the server for this. */
export const AGENDA_DAYS = 14;
/** A sync older than this is flagged as stalled (the script runs hourly). */
export const SYNC_STALE_MS = 3 * 60 * 60_000;
/** "Due soon" starts this many days before the due date. */
export const DUE_SOON_DAYS = 7;

// ── dates ─────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, "0");
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const toMs = (iso: string) => Date.parse(`${iso}T00:00:00Z`);
export const dayDiff = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / 86_400_000);

/** Due date for a billing period, with the due day clamped to the month (31 → 30 Sep). */
export function dueDate(sub: Pick<Subscription, "cycle" | "dueDay" | "dueMonth">, period: string): string {
  const y = Number(period.slice(0, 4));
  const m = sub.cycle === "MONTHLY" ? Number(period.slice(5, 7)) : sub.dueMonth;
  return `${y}-${pad(m)}-${pad(Math.min(sub.dueDay, daysInMonth(y, m)))}`;
}

/** The period being tracked now: this month, or this year for yearly plans. */
export function currentPeriod(sub: Pick<Subscription, "cycle">, today: string): string {
  return sub.cycle === "MONTHLY" ? today.slice(0, 7) : today.slice(0, 4);
}

function shiftPeriod(sub: Pick<Subscription, "cycle">, period: string, by: number): string {
  if (sub.cycle === "YEARLY") return String(Number(period) + by);
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/**
 * Which period a payment on `date` settles: the one whose due date is
 * nearest, so a charge on 30 Sep for a bill due 1 Oct counts for October.
 */
export function periodForPayment(sub: Pick<Subscription, "cycle" | "dueDay" | "dueMonth">, date: string): string {
  const own = currentPeriod(sub, date);
  const candidates = [shiftPeriod(sub, own, -1), own, shiftPeriod(sub, own, 1)];
  return candidates.reduce((best, p) =>
    Math.abs(dayDiff(date, dueDate(sub, p))) < Math.abs(dayDiff(date, dueDate(sub, best))) ? p : best,
  );
}

// ── status ────────────────────────────────────────────────────

export type BillState = "paid" | "overdue" | "due-soon" | "upcoming";

export type Bill = {
  sub: Subscription;
  period: string;
  due: string;
  daysLeft: number;
  state: BillState;
  payment: Payment | null;
};

export function billFor(sub: Subscription, payments: Payment[], today: string): Bill {
  const period = currentPeriod(sub, today);
  const due = dueDate(sub, period);
  const payment = payments.find((p) => p.subscriptionId === sub.id && p.period === period) ?? null;
  const daysLeft = dayDiff(today, due);
  const state: BillState =
    payment?.status === "PAID" ? "paid" : daysLeft < 0 ? "overdue" : daysLeft <= DUE_SOON_DAYS ? "due-soon" : "upcoming";
  return { sub, period, due, daysLeft, state, payment };
}

const ORDER: Record<BillState, number> = { overdue: 0, "due-soon": 1, upcoming: 2, paid: 3 };

export function buildBills(subs: Subscription[], payments: Payment[], today: string): Bill[] {
  return subs
    .filter((s) => s.active)
    .map((s) => billFor(s, payments, today))
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || a.due.localeCompare(b.due));
}

export type BillSummary = {
  /** Bills that fall in the current month (all monthly + yearly due this month). */
  thisMonth: Bill[];
  paidCount: number;
  paidAmount: number;
  dueAmount: number;
  /** Everything active, yearly plans spread over twelve months. */
  monthlyEquivalent: number;
  attention: number;
};

export function summarizeBills(bills: Bill[], today: string): BillSummary {
  const month = today.slice(0, 7);
  const thisMonth = bills.filter((b) => b.due.startsWith(month));
  const paid = thisMonth.filter((b) => b.state === "paid");
  return {
    thisMonth,
    paidCount: paid.length,
    paidAmount: paid.reduce((s, b) => s + b.sub.amount, 0),
    dueAmount: thisMonth.filter((b) => b.state !== "paid").reduce((s, b) => s + b.sub.amount, 0),
    monthlyEquivalent: bills.reduce((s, b) => s + (b.sub.cycle === "YEARLY" ? b.sub.amount / 12 : b.sub.amount), 0),
    attention: bills.filter((b) => b.state === "overdue" || b.state === "due-soon").length,
  };
}

// ── Gmail matching ────────────────────────────────────────────

const RECEIPT_WORDS =
  '(receipt OR invoice OR payment OR paid OR tagihan OR pembayaran OR struk OR kwitansi OR "terima kasih")';

/** Characters that would break out of a Gmail search term. */
const clean = (s: string) => s.replace(/["(){}\[\]]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Gmail search for one subscription's receipts. A sender is the reliable
 * signal; with only a name, require a receipt-ish word so newsletters from
 * the same brand don't tick the box.
 */
export function gmailQuery(sub: Pick<Subscription, "name" | "cycle" | "matchFrom" | "matchKeyword">): string {
  const parts: string[] = [];
  const from = clean(sub.matchFrom);
  const keyword = clean(sub.matchKeyword);
  if (from) parts.push(`from:(${from})`);
  if (keyword) parts.push(`"${keyword}"`);
  if (!from) parts.push(`"${clean(sub.name)}"`, RECEIPT_WORDS);
  parts.push(`newer_than:${sub.cycle === "YEARLY" ? 400 : 75}d`);
  return parts.join(" ");
}

// ── agenda ────────────────────────────────────────────────────

/** Calendar day (Jakarta) an event starts on. */
export function eventDay(e: AgendaEvent): string {
  return e.allDay
    ? e.start.slice(0, 10)
    : new Date(e.start).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
}

/** Events grouped by day, today first, days without events left out. */
export function groupAgenda(events: AgendaEvent[], today: string, days = AGENDA_DAYS) {
  const last = new Date(toMs(today) + (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const byDay = new Map<string, AgendaEvent[]>();
  for (const e of [...events].sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start))) {
    // Multi-day events show from their first visible day.
    const day = eventDay(e) < today ? today : eventDay(e);
    if (day > last) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  return Array.from(byDay, ([day, list]) => ({ day, events: list })).sort((a, b) => a.day.localeCompare(b.day));
}
