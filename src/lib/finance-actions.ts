import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { serializeInvestment } from "@/lib/finance";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be yyyy-mm-dd");

export const InvestmentInput = z.object({
  asset: z.enum(["GOLD", "RDPU"]).optional(),
  fundId: z.number().int().positive().nullable().optional(),
  fundName: z.string().trim().max(200).optional(),
  platform: z.string().trim().max(80).optional(),
  quantity: z.number().positive("Quantity must be above zero").optional(),
  price: z.number().positive("Price must be above zero").optional(),
  amount: z.number().positive("Amount must be above zero").optional(),
  date: isoDay.optional(),
  notes: z.string().max(2000).optional(),
});

export type InvestmentInputShape = z.infer<typeof InvestmentInput>;

export const ManualPriceInput = z.object({
  key: z.string().trim().min(1).max(240),
  date: isoDay,
  price: z.number().positive("Price must be above zero").nullable(), // null clears the override
});

export class FinanceError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function toData(input: InvestmentInputShape): Prisma.InvestmentUncheckedUpdateInput {
  const data: Prisma.InvestmentUncheckedUpdateInput = {};
  if (input.asset !== undefined) data.asset = input.asset;
  if (input.fundId !== undefined) data.fundId = input.fundId;
  if (input.fundName !== undefined) data.fundName = input.fundName;
  if (input.platform !== undefined) data.platform = input.platform;
  if (input.quantity !== undefined) data.quantity = input.quantity;
  if (input.price !== undefined) data.price = input.price;
  if (input.amount !== undefined) data.amount = input.amount;
  if (input.date !== undefined) data.date = new Date(`${input.date}T00:00:00Z`);
  if (input.notes !== undefined) data.notes = input.notes;
  return data;
}

function assertComplete(v: InvestmentInputShape) {
  if (!v.asset) throw new FinanceError("Asset is required", 422);
  if (!v.quantity || !v.price || !v.amount || !v.date) {
    throw new FinanceError("Date, quantity, price and amount are required", 422);
  }
  if (v.asset === "RDPU" && !v.fundId && !v.fundName?.trim()) {
    throw new FinanceError("Pick a fund", 422);
  }
}

export async function createInvestment(input: InvestmentInputShape) {
  assertComplete(input);
  if (input.asset === "GOLD") {
    input = { ...input, fundId: null, fundName: "" };
  }
  const row = await prisma.investment.create({ data: toData(input) as Prisma.InvestmentUncheckedCreateInput });
  return serializeInvestment(row);
}

export async function updateInvestment(id: string, input: InvestmentInputShape) {
  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) throw new FinanceError("Investment not found", 404);
  assertComplete({ ...serializeInvestment(existing), ...input });
  const row = await prisma.investment.update({ where: { id }, data: toData(input) });
  return serializeInvestment(row);
}

export async function deleteInvestment(id: string) {
  const existing = await prisma.investment.findUnique({ where: { id } });
  if (!existing) throw new FinanceError("Investment not found", 404);
  await prisma.investment.delete({ where: { id } });
}
