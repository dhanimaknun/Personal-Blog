"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Search, Trash2, X } from "lucide-react";
import { api } from "@/lib/client";
import {
  ASSET_LABEL,
  PLATFORM_SUGGESTIONS,
  formatIDR,
  formatPrice,
  formatDate,
  type Asset,
  type FundQuote,
  type Investment,
} from "@/lib/finance-shared";
import type { InvestmentDraft } from "@/components/finance/useFinance";

type Draft = {
  asset: Asset;
  fundId: number | null;
  fundName: string;
  platform: string;
  date: string;
  quantity: string;
  price: string;
  amount: string;
  notes: string;
};

const str = (n: number | undefined) => (n === undefined || !Number.isFinite(n) ? "" : String(+n.toFixed(6)));
const num = (s: string) => {
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : 0;
};

export function InvestmentModal({
  asset: presetAsset,
  entry,
  today,
  goldPrice,
  onClose,
  onSubmit,
  onDelete,
}: {
  asset: Asset;
  entry?: Investment;
  today: string;
  /** Today's gold price per gram, to prefill a new purchase. */
  goldPrice: number | null;
  onClose: () => void;
  onSubmit: (data: InvestmentDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [d, setD] = useState<Draft>(() => ({
    asset: entry?.asset ?? presetAsset,
    fundId: entry?.fundId ?? null,
    fundName: entry?.fundName ?? "",
    platform: entry?.platform ?? "",
    date: entry?.date ?? today,
    quantity: str(entry?.quantity),
    price: entry ? str(entry.price) : presetAsset === "GOLD" && goldPrice ? str(Math.round(goldPrice)) : "",
    amount: str(entry?.amount),
    notes: entry?.notes ?? "",
  }));
  // Once a derived field is typed into by hand, stop recomputing it.
  const [manual, setManual] = useState({ amount: Boolean(entry), quantity: Boolean(entry) });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isGold = d.asset === "GOLD";
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  // Gold: amount = grams × price.  RDPU: units = amount ÷ NAB.
  useEffect(() => {
    if (isGold && !manual.amount && d.quantity && d.price) {
      set("amount", str(Math.round(num(d.quantity) * num(d.price))));
    }
    if (!isGold && !manual.quantity && d.amount && d.price) {
      set("quantity", str(num(d.amount) / num(d.price)));
    }
  }, [isGold, d.quantity, d.price, d.amount, manual]);

  function switchAsset(a: Asset) {
    setD((p) => ({
      ...p,
      asset: a,
      fundId: null,
      fundName: "",
      quantity: "",
      amount: "",
      price: a === "GOLD" && goldPrice ? str(Math.round(goldPrice)) : "",
    }));
    setManual({ amount: false, quantity: false });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const quantity = num(d.quantity);
    const price = num(d.price);
    const amount = num(d.amount);
    if (!isGold && !d.fundId && !d.fundName.trim()) return setError("Pick a fund.");
    if (!d.date) return setError("Date is required.");
    if (d.date > today) return setError("The date can’t be in the future.");
    if (!(quantity > 0) || !(price > 0) || !(amount > 0)) {
      return setError(isGold ? "Enter the grams, the price per gram and the amount paid." : "Enter the amount, the NAB and the units.");
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        asset: d.asset,
        fundId: isGold ? null : d.fundId,
        fundName: isGold ? "" : d.fundName.trim(),
        platform: d.platform.trim(),
        date: d.date,
        quantity,
        price,
        amount,
        notes: d.notes,
      });
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
        aria-labelledby="investment-modal-title"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[520px] rounded-lg border border-divider bg-surface p-6 sm:p-8"
      >
        <div className="flex items-center justify-between">
          <h2 id="investment-modal-title" className="font-display text-[20px] font-semibold tracking-tight text-ink">
            {entry ? "Edit investment" : isGold ? "New gold purchase" : "New RDPU investment"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-secondary hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-5">
          {!entry ? (
            <Group label="Asset">
              <div className="flex gap-2">
                {(["GOLD", "RDPU"] as Asset[]).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => d.asset !== a && switchAsset(a)}
                    className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                      d.asset === a ? "bg-ink text-canvas" : "border border-divider text-secondary hover:text-ink"
                    }`}
                  >
                    {ASSET_LABEL[a]}
                  </button>
                ))}
              </div>
            </Group>
          ) : null}

          {!isGold ? (
            <Group label="Fund">
              <FundPicker
                value={{ id: d.fundId, name: d.fundName }}
                onPick={(f) => {
                  setD((p) => ({
                    ...p,
                    fundId: f.id,
                    fundName: f.name,
                    // Bought today → the latest NAB is the purchase NAB.
                    price: p.price || (p.date === today || p.date >= f.navDate ? str(f.nav) : p.price),
                  }));
                }}
                onCustom={(name) => setD((p) => ({ ...p, fundId: null, fundName: name }))}
                className={field}
              />
            </Group>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Group label="Date">
              <input type="date" max={today} value={d.date} onChange={(e) => set("date", e.target.value)} className={field} />
            </Group>
            <Group label="Platform">
              <input
                list={`platforms-${d.asset}`}
                value={d.platform}
                onChange={(e) => set("platform", e.target.value)}
                placeholder={isGold ? "Antam, Pegadaian…" : "Bibit, Bareksa…"}
                className={field}
              />
              <datalist id={`platforms-${d.asset}`}>
                {PLATFORM_SUGGESTIONS[d.asset].map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Group>
          </div>

          {isGold ? (
            <div className="grid grid-cols-2 gap-3">
              <Group label="Weight (grams)">
                <NumberInput value={d.quantity} onChange={(v) => set("quantity", v)} placeholder="1" className={field} autoFocus />
              </Group>
              <Group label="Price per gram (Rp)">
                <NumberInput value={d.price} onChange={(v) => set("price", v)} placeholder="0" className={field} />
              </Group>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Group label="Amount invested (Rp)">
                <NumberInput value={d.amount} onChange={(v) => set("amount", v)} placeholder="0" className={field} />
              </Group>
              <Group label="NAB at purchase (Rp)">
                <NumberInput value={d.price} onChange={(v) => set("price", v)} placeholder="0" className={field} />
              </Group>
            </div>
          )}

          {isGold ? (
            <Group label="Total paid (Rp)" hint="Defaults to grams × price — adjust for fees">
              <NumberInput
                value={d.amount}
                onChange={(v) => {
                  setManual((m) => ({ ...m, amount: true }));
                  set("amount", v);
                }}
                placeholder="0"
                className={field}
              />
              {num(d.amount) > 0 ? <p className="mt-1 text-[12px] text-secondary">{formatIDR(num(d.amount))}</p> : null}
            </Group>
          ) : (
            <Group label="Units" hint="Defaults to amount ÷ NAB">
              <NumberInput
                value={d.quantity}
                onChange={(v) => {
                  setManual((m) => ({ ...m, quantity: true }));
                  set("quantity", v);
                }}
                placeholder="0"
                className={field}
              />
              {num(d.amount) > 0 ? <p className="mt-1 text-[12px] text-secondary">{formatIDR(num(d.amount))}</p> : null}
            </Group>
          )}

          <Group label="Notes">
            <textarea
              value={d.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={2}
              placeholder="Optional"
              className={`${field} resize-none`}
            />
          </Group>

          {error ? <p role="alert" className="text-[13px] text-loss">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-ink px-4 py-2 text-[14px] font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : entry ? "Save changes" : "Add"}
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete this investment?")) return;
                  setDeleting(true);
                  try {
                    await onDelete();
                  } catch (err) {
                    setError((err as Error).message);
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
                className="ml-auto inline-flex items-center gap-1.5 text-[13px] text-loss hover:opacity-70 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            ) : null}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 t-label text-secondary">
        {label}
        {hint ? <span className="ml-2 normal-case tracking-normal text-[11px] opacity-80">{hint}</span> : null}
      </p>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="any"
      min="0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...rest}
    />
  );
}

/** Search the money-market fund list; fall back to a typed name for unlisted funds. */
function FundPicker({
  value,
  onPick,
  onCustom,
  className,
}: {
  value: { id: number | null; name: string };
  onPick: (f: FundQuote) => void;
  onCustom: (name: string) => void;
  className: string;
}) {
  const [query, setQuery] = useState(value.name);
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<FundQuote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const id = ++seq.current;
    const t = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await api<FundQuote[]>(`/api/admin/finance/funds?q=${encodeURIComponent(q)}`);
        if (id === seq.current) setResults(list);
      } catch (err) {
        if (id === seq.current) setError((err as Error).message);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(t);
  }, [query, open]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-secondary" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onCustom(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder="Search e.g. “Sucorinvest Money Market”"
          className={`${className} pl-8`}
          aria-autocomplete="list"
        />
        {loading ? <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-secondary" /> : null}
      </div>
      <p className="mt-1 text-[12px] text-secondary">
        {value.id
          ? "Listed fund — its NAB updates automatically."
          : value.name
            ? "Not linked to a listed fund — you’ll set its NAB by hand."
            : "Pick a listed fund so its NAB updates automatically."}
      </p>

      {open && (results.length > 0 || error) ? (
        <ul className="thin-scroll absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-divider bg-surface py-1 shadow-sm">
          {error ? <li className="px-3 py-2 text-[13px] text-loss">{error}</li> : null}
          {results.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(f);
                  setQuery(f.name);
                  setOpen(false);
                }}
                className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-canvas"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">{f.name}</span>
                  <span className="block truncate text-[11.5px] text-secondary">{f.manager}</span>
                </span>
                <span className="shrink-0 text-right text-[12px] tabular-nums text-secondary">
                  {formatPrice(f.nav)}
                  <span className="block text-[11px]">{formatDate(f.navDate, { day: "numeric", month: "short" })}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
