import type { CalendarEvent, Subscription as SubscriptionRow, SubscriptionPayment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { AgendaEvent, Payment, Subscription, SyncState } from "@/lib/google-shared";

export * from "@/lib/google-shared";

export const SYNC_STATE_ID = "google-sync";

export function serializeSubscription(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amount,
    cycle: row.cycle,
    dueDay: row.dueDay,
    dueMonth: row.dueMonth,
    matchFrom: row.matchFrom,
    matchKeyword: row.matchKeyword,
    active: row.active,
    notes: row.notes,
  };
}

export function serializePayment(row: SubscriptionPayment): Payment {
  return {
    subscriptionId: row.subscriptionId,
    period: row.period,
    status: row.status,
    source: row.source === "gmail" ? "gmail" : "manual",
    paidAt: row.paidAt ? row.paidAt.toISOString() : null,
    emailFrom: row.emailFrom,
    emailSubject: row.emailSubject,
  };
}

function serializeEvent(row: CalendarEvent): AgendaEvent {
  return {
    id: row.id,
    calendar: row.calendar,
    color: row.color,
    title: row.title,
    location: row.location,
    allDay: row.allDay,
    start: row.start.toISOString(),
    end: row.end.toISOString(),
  };
}

export async function getAgenda(): Promise<AgendaEvent[]> {
  // Anything still running: all-day rows are stamped 00:00 UTC, so look back a day.
  const from = new Date(Date.now() - 86_400_000);
  const rows = await prisma.calendarEvent.findMany({ where: { end: { gt: from } }, orderBy: { start: "asc" } });
  return rows.map(serializeEvent);
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const rows = await prisma.subscription.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return rows.map(serializeSubscription);
}

/** Payments for the current and previous periods — enough for the checklist. */
export async function getRecentPayments(): Promise<Payment[]> {
  const since = new Date(Date.now() - 400 * 86_400_000);
  const rows = await prisma.subscriptionPayment.findMany({ where: { createdAt: { gte: since } } });
  return rows.map(serializePayment);
}

export async function getSyncState(): Promise<SyncState> {
  const row = await prisma.integrationState.findUnique({ where: { id: SYNC_STATE_ID } });
  return (row?.data as SyncState) ?? null;
}

/** Whether the shared secret the Apps Script authenticates with is set. */
export const syncConfigured = () => Boolean(process.env.GOOGLE_SYNC_SECRET);
