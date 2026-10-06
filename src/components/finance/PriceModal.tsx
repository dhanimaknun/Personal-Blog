"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { formatPrice } from "@/lib/finance-shared";
import type { Instrument } from "@/components/finance/AssetSection";

/**
 * Override today's market price for one instrument — e.g. value gold at the
 * Antam buyback price instead of spot, or give an unlisted fund its NAB.
 * Manual prices are never overwritten by the automatic refresh.
 */
export function PriceModal({
  instrument,
  isGold,
  today,
  onClose,
  onSave,
}: {
  instrument: Instrument;
  isGold: boolean;
  today: string;
  onClose: () => void;
  onSave: (date: string, price: number | null) => Promise<void>;
}) {
  const q = instrument.quote;
  const [date, setDate] = useState(today);
  const [price, setPrice] = useState(q ? String(+q.price.toFixed(4)) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isManualToday = q?.source === "manual" && q.date === date;

  async function save(value: number | null) {
    if (value !== null && !(value > 0)) return setError("Enter a price above zero.");
    setSaving(true);
    setError(null);
    try {
      await onSave(date, value);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-lg border border-divider bg-canvas px-3 py-2 text-[14px] text-ink placeholder:text-secondary focus:border-accent focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink/25 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="price-modal-title"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-lg border border-divider bg-surface p-6 sm:p-8"
      >
        <div className="flex items-center justify-between">
          <h2 id="price-modal-title" className="font-display text-[20px] font-semibold tracking-tight text-ink">
            {isGold ? "Set gold price" : "Set NAB"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-secondary hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed text-secondary">
          {isGold
            ? "The automatic price is international spot, converted to rupiah. Enter a dealer’s buyback price here to value your gold at what it would actually sell for."
            : instrument.label}
          {q ? ` Latest: ${formatPrice(q.price)}${q.source === "manual" ? " (manual)" : ""}.` : ""}
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save(parseFloat(price));
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-2 block t-label text-secondary">Date</span>
              <input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} className={field} />
            </label>
            <label className="block">
              <span className="mb-2 block t-label text-secondary">{isGold ? "Rp / gram" : "Rp / unit"}</span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                autoFocus
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={field}
              />
            </label>
          </div>

          {error ? <p role="alert" className="text-[13px] text-loss">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-ink px-4 py-2 text-[14px] font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save price"}
            </button>
            {isManualToday ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => save(null)}
                className="ml-auto text-[13px] text-secondary hover:text-ink disabled:opacity-50"
              >
                Revert to automatic
              </button>
            ) : null}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
