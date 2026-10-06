import type { Investment as InvestmentRow, MarketPrice } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { Investment, PricePoint, PriceSource } from "@/lib/finance-shared";

export * from "@/lib/finance-shared";

const day = (d: Date) => d.toISOString().slice(0, 10);

export function serializeInvestment(row: InvestmentRow): Investment {
  return {
    ...row,
    date: day(row.date),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializePrice(row: MarketPrice): PricePoint {
  return {
    key: row.key,
    date: day(row.date),
    price: row.price,
    source: row.source as PriceSource,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getInvestments(): Promise<Investment[]> {
  const rows = await prisma.investment.findMany({ orderBy: [{ date: "desc" }, { createdAt: "desc" }] });
  return rows.map(serializeInvestment);
}

export async function getMarketPrices(): Promise<PricePoint[]> {
  const rows = await prisma.marketPrice.findMany({ orderBy: [{ key: "asc" }, { date: "asc" }] });
  return rows.map(serializePrice);
}
