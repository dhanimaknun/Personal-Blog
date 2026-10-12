"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Trash2, X } from "lucide-react";
import { gmailQuery, type Cycle, type Subscription } from "@/lib/google-shared";
import { Segmented } from "@/components/finance/ui";

export type SubscriptionDraft = Omit<Subscription, "id">;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function SubscriptionModal({
  entry,
  onClose,
  onSubmit,
  onDelete,
}: {
  entry?: Subscription;
  onClose: () => void;
  onSubmit: (data: SubscriptionDraft) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  const [d, setD] = useState({
    name: entry?.name ?? "",
    amount: entry ? String(entry.amount) : "",
    cycle: (entry?.cycle ?? "MONTHLY") as Cycle,
    dueDay: String(entry?.dueDay ?? 1),
    dueMonth: entry?.dueMonth ?? 1,
    matchFrom: entry?.matchFrom ?? "",
    matchKeyword: entry?.matchKeyword ?? "",
    active: entry?.active ?? true,
    notes: entry?.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => setD((p) => ({ ...p, [k]: v }));

  const dueDay = Math.min(31, Math.max(1, Math.round(Number(d.dueDay) || 1)));
  const query = d.name.trim() || d.matchFrom.trim() ? gmailQuery({ ...d, name: d.name || "…" }) : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!d.name.trim()) return setError("Give it a name.");
    const amount = Number(d.amount);
    if (!(amount >= 0)) return setError("Enter the amount.");
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name: d.name.trim(),
        amount,
        cycle: d.cycle,
        dueDay,
        dueMonth: d.dueMonth,
        matchFrom: d.matchFrom.trim(),
        matchKeyword: d.matchKeyword.trim(),
        active: d.active,
        notes: d.notes,
      });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  const field =
    "w-full rounded-xl border border-divider bg-canvas px-3.5 py-2.5 text-[14px] text-ink placeholder:text-secondary focus:border-accent focus:outline-none";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink/25 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sub-modal-title"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: [0, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] rounded-2xl bg-surface p-6 shadow-[0_24px_64px_-12px_rgba(28,28,30,0.25)] ring-1 ring-divider/60 sm:p-8"
      >
        <div className="flex items-center justify-between">
          <h2 id="sub-modal-title" className="font-display text-[20px] font-semibold tracking-tight text-ink">
            {entry ? "Edit subscription" : "New subscription"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-secondary hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid grid-cols-5 gap-3">
            <Field label="Name" className="col-span-3">
              <input autoFocus value={d.name} onChange={(e) => set("name", e.target.value)} placeholder="Netflix" className={field} />
            </Field>
            <Field label="Amount (Rp)" className="col-span-2">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="any"
                value={d.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="186000"
                className={field}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Field label="Billed">
              <Segmented
                label="Billing cycle"
                options={[
                  { id: "MONTHLY", label: "Monthly" },
                  { id: "YEARLY", label: "Yearly" },
                ]}
                value={d.cycle}
                onChange={(v) => set("cycle", v)}
              />
            </Field>
            <Field label="Due day">
              <input
                type="number"
                min="1"
                max="31"
                value={d.dueDay}
                onChange={(e) => set("dueDay", e.target.value)}
                className={`${field} w-20`}
              />
            </Field>
            {d.cycle === "YEARLY" ? (
              <Field label="Month">
                <select value={d.dueMonth} onChange={(e) => set("dueMonth", Number(e.target.value))} className={`${field} w-24`}>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
          </div>

          <Field label="Receipt comes from" hint="Email or domain — makes matching reliable">
            <input
              value={d.matchFrom}
              onChange={(e) => set("matchFrom", e.target.value)}
              placeholder="netflix.com"
              className={field}
            />
          </Field>
          <Field label="Keyword" hint="Optional — if one sender bills several things">
            <input
              value={d.matchKeyword}
              onChange={(e) => set("matchKeyword", e.target.value)}
              placeholder="Premium"
              className={field}
            />
          </Field>

          {query ? (
            <p className="rounded-xl bg-canvas px-3.5 py-2.5 font-mono text-[11.5px] leading-relaxed text-secondary">
              Gmail search: {query}
            </p>
          ) : null}

          <label className="flex cursor-pointer items-center gap-2 text-[13px] text-secondary">
            <input type="checkbox" checked={d.active} onChange={(e) => set("active", e.target.checked)} className="accent-accent" />
            Active — uncheck to pause tracking without deleting
          </label>

          {error ? <p role="alert" className="text-[13px] text-loss">{error}</p> : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-medium text-canvas transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : entry ? "Save changes" : "Add"}
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (!confirm("Delete this subscription and its history?")) return;
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

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <p className="mb-2 t-label text-secondary">
        {label}
        {hint ? <span className="ml-2 text-[11px] normal-case tracking-normal opacity-80">{hint}</span> : null}
      </p>
      {children}
    </div>
  );
}
