"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import {
  buildMonthly,
  buildPriceBook,
  buildTimeline,
  summarizePortfolio,
  valuePositions,
} from "@/lib/finance-calc";
import type { Investment, PricePoint, RefreshResult } from "@/lib/finance-shared";

/** Re-check the market while the tab stays open; the server throttles too. */
const POLL_MS = 30 * 60_000;

export type InvestmentDraft = Omit<Investment, "id" | "createdAt" | "updatedAt">;

/**
 * Finance Deck state: the purchases, the price history, and everything
 * derived from them. Derivations are memoised on (investments, prices,
 * today), so a new market quote re-values the whole deck automatically.
 */
export function useFinance(initial: { investments: Investment[]; prices: PricePoint[]; today: string }) {
  const [investments, setInvestments] = useState(initial.investments);
  const [prices, setPrices] = useState(initial.prices);
  const [refreshing, setRefreshing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const inFlight = useRef(false);
  const today = initial.today;

  const refresh = useCallback(async (force = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const res = await api<RefreshResult>(`/api/admin/finance/prices/refresh${force ? "?force=1" : ""}`, {
        method: "POST",
      });
      setPrices(res.prices);
      setErrors(res.errors);
      setCheckedAt(res.refreshedAt);
    } catch (err) {
      setErrors([(err as Error).message || "Couldn't reach the market data service."]);
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh(false);
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const derived = useMemo(() => {
    const book = buildPriceBook(prices, investments);
    const positions = valuePositions(investments, book);
    return {
      book,
      positions,
      summary: summarizePortfolio(positions, book, today),
      timeline: buildTimeline(investments, book, today),
      monthly: buildMonthly(investments, book, today),
    };
  }, [investments, prices, today]);

  /** Newest write among the quotes actually used to value holdings. */
  const lastUpdated = useMemo(() => {
    let max: string | null = null;
    derived.book.latest.forEach((p) => {
      if (!max || p.updatedAt > max) max = p.updatedAt;
    });
    return max as string | null;
  }, [derived.book]);

  const sortIn = (list: Investment[]) =>
    [...list].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));

  const create = useCallback(
    async (data: InvestmentDraft) => {
      const created = await api<Investment>("/api/admin/finance/investments", { method: "POST", json: data });
      setInvestments((prev) => sortIn([created, ...prev]));
      // A newly held fund has no quote yet — the throttle lets it through.
      refresh(false);
    },
    [refresh],
  );

  const update = useCallback(
    async (id: string, data: InvestmentDraft) => {
      const updated = await api<Investment>(`/api/admin/finance/investments/${id}`, { method: "PATCH", json: data });
      setInvestments((prev) => sortIn(prev.map((i) => (i.id === id ? updated : i))));
      refresh(false);
    },
    [refresh],
  );

  const remove = useCallback(async (id: string) => {
    await api(`/api/admin/finance/investments/${id}`, { method: "DELETE" });
    setInvestments((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const setManualPrice = useCallback(async (key: string, date: string, price: number | null) => {
    const next = await api<PricePoint[]>("/api/admin/finance/prices", {
      method: "POST",
      json: { key, date, price },
    });
    setPrices(next);
  }, []);

  return {
    investments,
    prices,
    today,
    refreshing,
    errors,
    checkedAt,
    lastUpdated,
    refresh,
    create,
    update,
    remove,
    setManualPrice,
    ...derived,
  };
}
