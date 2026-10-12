"use client";

import { useMemo } from "react";
import { AlertCircle, Check, Clock, Mail, Pencil, Plus } from "lucide-react";
import { formatDate, formatIDR } from "@/lib/finance-shared";
import { buildBills, summarizeBills, type Bill, type Payment, type Subscription } from "@/lib/google-shared";
import { Card, SectionTitle } from "@/components/finance/ui";

export function Subscriptions({
  subs,
  payments,
  today,
  onAdd,
  onEdit,
  onToggle,
}: {
  subs: Subscription[];
  payments: Payment[];
  today: string;
  onAdd: () => void;
  onEdit: (s: Subscription) => void;
  onToggle: (bill: Bill) => void;
}) {
  const bills = useMemo(() => buildBills(subs, payments, today), [subs, payments, today]);
  const summary = useMemo(() => summarizeBills(bills, today), [bills, today]);
  const inactive = subs.filter((s) => !s.active);

  return (
    <section>
      <SectionTitle
        title="Subscriptions"
        hint="Ticked automatically when a receipt lands in Gmail"
        action={
          <button
            onClick={onAdd}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add
          </button>
        }
      />

      {bills.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">No subscriptions yet</p>
          <p className="mx-auto mt-2 max-w-[44ch] text-[14px] leading-relaxed text-secondary">
            Add Netflix, Spotify, iCloud… with the email address their receipts come from, and each month’s box ticks
            itself when the receipt arrives.
          </p>
        </Card>
      ) : (
        <>
          <dl className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Figure label="Paid this month">
              {summary.paidCount} <span className="text-secondary">of {summary.thisMonth.length}</span>
            </Figure>
            <Figure label="Still due this month">{formatIDR(summary.dueAmount)}</Figure>
            <Figure label="Subscriptions cost you">
              {formatIDR(summary.monthlyEquivalent)} <span className="text-[14px] font-normal text-secondary">/ month</span>
            </Figure>
          </dl>

          <Card className="overflow-hidden">
            <ul className="divide-y divide-divider/70">
              {bills.map((b) => (
                <BillRow key={b.sub.id} bill={b} onToggle={() => onToggle(b)} onEdit={() => onEdit(b.sub)} />
              ))}
            </ul>
          </Card>
        </>
      )}

      {inactive.length ? (
        <p className="mt-3 px-1 text-[12.5px] text-secondary">
          Paused:{" "}
          {inactive.map((s, i) => (
            <span key={s.id}>
              {i ? ", " : ""}
              <button onClick={() => onEdit(s)} className="underline-offset-2 hover:text-ink hover:underline">
                {s.name}
              </button>
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}

function BillRow({ bill: b, onToggle, onEdit }: { bill: Bill; onToggle: () => void; onEdit: () => void }) {
  const paid = b.state === "paid";
  return (
    <li className="group flex items-center gap-4 px-5 py-4 sm:px-6">
      <button
        onClick={onToggle}
        role="checkbox"
        aria-checked={paid}
        aria-label={`${b.sub.name} — mark ${paid ? "unpaid" : "paid"}`}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
          paid ? "bg-gain text-white" : "ring-1 ring-inset ring-divider hover:ring-ink/40"
        }`}
      >
        {paid ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${paid ? "text-secondary" : "text-ink"}`}>{b.sub.name}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-secondary">
          {formatIDR(b.sub.amount)}
          {b.sub.cycle === "YEARLY" ? " / year" : " / month"} · due {formatDate(b.due, { day: "numeric", month: "short" })}
          {paid && b.payment?.source === "gmail" && b.payment.paidAt ? (
            <>
              {" · "}
              <span className="inline-flex items-center gap-1" title={b.payment.emailSubject}>
                <Mail className="h-3 w-3" strokeWidth={1.75} /> receipt{" "}
                {formatDate(b.payment.paidAt.slice(0, 10), { day: "numeric", month: "short" })}
              </span>
            </>
          ) : null}
        </p>
      </div>

      <Status bill={b} />

      <button
        onClick={onEdit}
        aria-label={`Edit ${b.sub.name}`}
        className="rounded-md p-1.5 text-secondary opacity-50 transition-opacity hover:text-ink group-hover:opacity-100"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function Status({ bill: b }: { bill: Bill }) {
  const base = "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium";
  if (b.state === "paid") return <span className={`${base} bg-gain/10 text-gain`}>Paid</span>;
  if (b.state === "overdue")
    return (
      <span className={`${base} bg-loss/10 text-loss`}>
        <AlertCircle className="h-3 w-3" strokeWidth={2.25} />
        {-b.daysLeft === 1 ? "1 day late" : `${-b.daysLeft} days late`}
      </span>
    );
  if (b.state === "due-soon")
    return (
      <span className={`${base} bg-accent/10 text-accent`}>
        <Clock className="h-3 w-3" strokeWidth={2.25} />
        {b.daysLeft === 0 ? "Due today" : b.daysLeft === 1 ? "Tomorrow" : `In ${b.daysLeft} days`}
      </span>
    );
  return <span className={`${base} bg-canvas text-secondary`}>Upcoming</span>;
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <dt className="text-[13px] text-secondary">{label}</dt>
      <dd className="mt-1 text-[20px] font-semibold tracking-[-0.01em] text-ink">{children}</dd>
    </Card>
  );
}
