import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api";
import { serializePayment, serializeSubscription } from "@/lib/google";

export const SubscriptionInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  amount: z.number().min(0).max(1e12),
  cycle: z.enum(["MONTHLY", "YEARLY"]),
  dueDay: z.number().int().min(1).max(31),
  dueMonth: z.number().int().min(1).max(12).default(1),
  matchFrom: z.string().trim().max(200).default(""),
  matchKeyword: z.string().trim().max(120).default(""),
  active: z.boolean().default(true),
  notes: z.string().max(2000).default(""),
});

export const PaymentInput = z.object({
  period: z.string().regex(/^\d{4}(-\d{2})?$/, "Period must be yyyy or yyyy-mm"),
  paid: z.boolean(),
});

async function find(id: string) {
  const sub = await prisma.subscription.findUnique({ where: { id } });
  if (!sub) throw new HttpError("Subscription not found", 404);
  return sub;
}

export async function createSubscription(input: z.infer<typeof SubscriptionInput>) {
  return serializeSubscription(await prisma.subscription.create({ data: input }));
}

export async function updateSubscription(id: string, input: z.infer<typeof SubscriptionInput>) {
  await find(id);
  return serializeSubscription(await prisma.subscription.update({ where: { id }, data: input }));
}

export async function deleteSubscription(id: string) {
  await find(id);
  await prisma.subscription.delete({ where: { id } });
}

/**
 * Tick or untick a period by hand. Unticking keeps an UNPAID row rather than
 * deleting, so the next Gmail sync doesn't tick it straight back.
 */
export async function setPayment(id: string, { period, paid }: z.infer<typeof PaymentInput>) {
  const sub = await find(id);
  const ok = sub.cycle === "MONTHLY" ? /^\d{4}-\d{2}$/.test(period) : /^\d{4}$/.test(period);
  if (!ok) throw new HttpError("Period doesn't match the billing cycle", 422);
  const where = { subscriptionId_period: { subscriptionId: id, period } };
  const row = paid
    ? await prisma.subscriptionPayment.upsert({
        where,
        create: { subscriptionId: id, period, status: "PAID", source: "manual", paidAt: new Date() },
        update: { status: "PAID" },
      })
    : await prisma.subscriptionPayment.upsert({
        where,
        create: { subscriptionId: id, period, status: "UNPAID", source: "manual" },
        update: { status: "UNPAID" },
      });
  return serializePayment(row);
}
