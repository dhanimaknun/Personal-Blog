// Data for the landing page ("front desk"): one small, live peek per
// section. Private sections are only queried for a logged-in session.

import { prisma } from "@/lib/prisma";
import { getInvestments, getMarketPrices, todayJakarta } from "@/lib/finance";
import { buildPriceBook, summarizePortfolio, valuePositions } from "@/lib/finance-calc";
import { GOLD_KEY, type Asset } from "@/lib/finance-shared";
import type { MediaStatus, MediaType } from "@/lib/media-shared";
import {
  buildBills,
  dayDiff,
  eventDay,
  formatTime,
  getAgenda,
  getRecentPayments,
  getSubscriptions,
  getSyncState,
  summarizeBills,
} from "@/lib/google";

const PUBLIC_POST = { status: "PUBLISHED" as const, deletedAt: null, publishedAt: { not: null } };

export type JournalPeek = {
  count: number;
  latest: { title: string; slug: string; excerpt: string; publishedAt: Date; readingTime: number } | null;
  recent: { title: string; slug: string; publishedAt: Date }[];
};

export type AfterHoursPeek = {
  onLoop: { title: string; creator: string; cover: string } | null;
  /** The latest books, films, series and manga touched — newest first. */
  recent: { id: string; title: string; cover: string; type: MediaType; status: MediaStatus }[];
  counts: Partial<Record<MediaType, number>>;
};

export type FinancePeek = {
  value: number;
  pl: number;
  returnPct: number | null;
  dailyChange: number | null;
  dailyChangePct: number | null;
  /** Date of the gold quote the figures use, yyyy-mm-dd. */
  asOf: string | null;
  /** The latest purchases, newest first. */
  recent: { id: string; asset: Asset; quantity: number; fundName: string; platform: string; amount: number; date: string }[];
};

export async function getJournalPeek(): Promise<JournalPeek> {
  const [count, posts] = await Promise.all([
    prisma.post.count({ where: PUBLIC_POST }),
    prisma.post.findMany({
      where: PUBLIC_POST,
      orderBy: { publishedAt: "desc" },
      take: 5, // the latest + up to four more for the tall card
      select: { title: true, slug: true, excerpt: true, publishedAt: true, readingTime: true },
    }),
  ]);
  const [latest, ...rest] = posts;
  return {
    count,
    latest: latest ? { ...latest, publishedAt: latest.publishedAt! } : null,
    recent: rest.map((p) => ({ title: p.title, slug: p.slug, publishedAt: p.publishedAt! })),
  };
}

export async function getAfterHoursPeek(): Promise<AfterHoursPeek> {
  const [onLoop, recent, grouped] = await Promise.all([
    prisma.mediaEntry.findFirst({
      where: { type: "MUSIC" },
      orderBy: { updatedAt: "desc" },
      select: { title: true, creator: true, cover: true },
    }),
    prisma.mediaEntry.findMany({
      where: { type: { not: "MUSIC" } },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { id: true, title: true, cover: true, type: true, status: true },
    }),
    prisma.mediaEntry.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);
  return {
    onLoop,
    recent,
    counts: Object.fromEntries(grouped.map((g) => [g.type, g._count._all])),
  };
}

/** Admin only — the caller must check the session first. */
export async function getFinancePeek(): Promise<FinancePeek | null> {
  const [investments, prices] = await Promise.all([getInvestments(), getMarketPrices()]);
  if (investments.length === 0) return null;
  const book = buildPriceBook(prices, investments);
  const summary = summarizePortfolio(valuePositions(investments, book), book, todayJakarta());
  return {
    value: summary.value,
    pl: summary.pl,
    returnPct: summary.returnPct,
    dailyChange: summary.dailyChange,
    dailyChangePct: summary.dailyChangePct,
    asOf: book.latest.get(GOLD_KEY)?.date ?? null,
    // getInvestments is already newest first
    recent: investments.slice(0, 3).map(({ id, asset, quantity, fundName, platform, amount, date }) => ({
      id,
      asset,
      quantity,
      fundName,
      platform,
      amount,
      date,
    })),
  };
}

/** The hour and a long date in Jakarta — the server itself runs in UTC. */
export function jakartaNow(now = new Date()) {
  const hour = Number(
    now.toLocaleString("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Jakarta" }),
  );
  const date = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Jakarta",
  });
  return { hour, date };
}

export type GooglePeek = {
  synced: boolean;
  /** The next thing still to come today (or null). */
  next: { title: string; time: string | null } | null;
  todayCount: number;
  /** The next few events after today, soonest first. */
  upcoming: { id: string; title: string; color: string; day: string; time: string | null }[];
  bills: { paid: number; total: number; attention: number };
};

/** Admin only — the caller must check the session first. */
export async function getGooglePeek(): Promise<GooglePeek> {
  const today = todayJakarta();
  const [events, subs, payments, sync] = await Promise.all([
    getAgenda(),
    getSubscriptions(),
    getRecentPayments(),
    getSyncState(),
  ]);
  const now = Date.now();
  const todays = events.filter((e) => eventDay(e) <= today && (e.allDay ? eventDay(e) === today : Date.parse(e.end) > now));
  const upcoming = todays.find((e) => !e.allDay && Date.parse(e.start) >= now) ?? todays.find((e) => !e.allDay) ?? todays[0];
  const summary = summarizeBills(buildBills(subs, payments, today), today);
  const later = events
    .filter((e) => eventDay(e) > today)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 3);
  return {
    synced: Boolean(sync),
    next: upcoming ? { title: upcoming.title, time: upcoming.allDay ? null : formatTime(upcoming.start) } : null,
    todayCount: events.filter((e) => eventDay(e) === today).length,
    upcoming: later.map((e) => ({
      id: e.id,
      title: e.title,
      color: e.color,
      day: dayLabel(eventDay(e), today),
      time: e.allDay ? null : formatTime(e.start),
    })),
    bills: { paid: summary.paidCount, total: summary.thisMonth.length, attention: summary.attention },
  };
}

/** "Tomorrow", else a short date like "Wed 14 Oct". */
function dayLabel(day: string, today: string) {
  if (dayDiff(today, day) === 1) return "Tomorrow";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}
