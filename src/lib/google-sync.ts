// The receiving end of the Google Apps Script sync.
//
// The script (see src/lib/apps-script.ts) runs hourly inside the owner's
// Google account. It first GETs /api/google/sync for the Gmail searches to
// run, then POSTs the calendar window and any matching receipts back. Both
// calls carry `Authorization: Bearer <GOOGLE_SYNC_SECRET>`.

import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api";
import { todayJakarta } from "@/lib/finance-shared";
import { AGENDA_DAYS, SYNC_STATE_ID, gmailQuery, periodForPayment } from "@/lib/google";

export function assertSyncSecret(req: Request) {
  const secret = process.env.GOOGLE_SYNC_SECRET;
  if (!secret) throw new HttpError("Google sync is not configured", 503);
  const given = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
  const expected = Buffer.from(secret);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw new HttpError("Unauthorized", 401);
  }
}

// ── 1 · what the script should search for ─────────────────────

export async function syncConfig() {
  const subs = await prisma.subscription.findMany({ where: { active: true } });
  return {
    daysAhead: AGENDA_DAYS,
    searches: subs.map((s) => ({ subscriptionId: s.id, query: gmailQuery(s) })),
  };
}

// ── 2 · what the script sends back ────────────────────────────

const isoDay = /^\d{4}-\d{2}-\d{2}$/;

export const SyncPayload = z.object({
  events: z
    .array(
      z.object({
        id: z.string().min(1).max(300),
        calendar: z.string().max(200).default(""),
        color: z.string().max(20).default(""),
        title: z.string().max(500).default(""),
        location: z.string().max(500).default(""),
        allDay: z.boolean(),
        start: z.string().max(40),
        end: z.string().max(40),
      }),
    )
    .max(1000),
  receipts: z
    .array(
      z.object({
        subscriptionId: z.string().min(1).max(40),
        messageId: z.string().min(1).max(100),
        from: z.string().max(300).default(""),
        subject: z.string().max(500).default(""),
        date: z.string().datetime(),
      }),
    )
    .max(500),
});

const toInstant = (value: string, allDay: boolean) => {
  const d = allDay && isoDay.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  if (Number.isNaN(d.getTime())) throw new HttpError(`Invalid event time: ${value}`, 422);
  return d;
};

export async function ingestSync(payload: z.infer<typeof SyncPayload>) {
  const events = payload.events.map((e) => ({
    id: e.id,
    calendar: e.calendar,
    color: e.color,
    title: e.title || "(No title)",
    location: e.location,
    allDay: e.allDay,
    start: toInstant(e.start, e.allDay),
    end: toInstant(e.end, e.allDay),
  }));

  // The payload is the whole window, so replace rather than merge: events
  // deleted in Google drop out here too.
  await prisma.$transaction([
    prisma.calendarEvent.deleteMany({}),
    prisma.calendarEvent.createMany({ data: events, skipDuplicates: true }),
  ]);

  // Receipts → payments. An existing row for the period (paid, or explicitly
  // marked unpaid) always wins over a new Gmail match.
  const subs = new Map(
    (await prisma.subscription.findMany({ where: { id: { in: payload.receipts.map((r) => r.subscriptionId) } } })).map(
      (s) => [s.id, s],
    ),
  );
  let matched = 0;
  for (const r of [...payload.receipts].sort((a, b) => a.date.localeCompare(b.date))) {
    const sub = subs.get(r.subscriptionId);
    if (!sub) continue;
    const paidOn = new Date(r.date).toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
    const period = periodForPayment(sub, paidOn);
    const created = await prisma.subscriptionPayment.createMany({
      data: [
        {
          subscriptionId: sub.id,
          period,
          status: "PAID",
          source: "gmail",
          paidAt: new Date(r.date),
          emailFrom: r.from,
          emailSubject: r.subject,
          messageId: r.messageId,
        },
      ],
      skipDuplicates: true, // the (subscription, period) unique key
    });
    matched += created.count;
  }

  const state = { at: new Date().toISOString(), events: events.length, receipts: payload.receipts.length, matched };
  await prisma.integrationState.upsert({
    where: { id: SYNC_STATE_ID },
    create: { id: SYNC_STATE_ID, data: state },
    update: { data: state },
  });
  return { ok: true, ...state, today: todayJakarta() };
}
