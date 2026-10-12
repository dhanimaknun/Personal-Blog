"use client";

import { useState } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { api } from "@/lib/client";
import { formatDateTime } from "@/lib/finance-shared";
import { SYNC_STALE_MS, type AgendaEvent, type Bill, type Payment, type Subscription, type SyncState } from "@/lib/google-shared";
import { Agenda } from "@/components/google/Agenda";
import { Subscriptions } from "@/components/google/Subscriptions";
import { SubscriptionModal, type SubscriptionDraft } from "@/components/google/SubscriptionModal";
import { SetupGuide } from "@/components/google/SetupGuide";

export function GoogleApps(props: {
  today: string;
  events: AgendaEvent[];
  subscriptions: Subscription[];
  payments: Payment[];
  sync: SyncState;
  setup: { code: string; manifest: string; syncUrl: string; configured: boolean; isLocal: boolean };
}) {
  const [subs, setSubs] = useState(props.subscriptions);
  const [payments, setPayments] = useState(props.payments);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [showSetup, setShowSetup] = useState(!props.sync);
  const [error, setError] = useState<string | null>(null);

  const synced = Boolean(props.sync);
  const stale = props.sync ? Date.now() - Date.parse(props.sync.at) > SYNC_STALE_MS : false;

  const upsertSub = (s: Subscription) =>
    setSubs((prev) => [...prev.filter((x) => x.id !== s.id), s].sort((a, b) => a.name.localeCompare(b.name)));

  async function toggle(bill: Bill) {
    const paid = bill.state !== "paid";
    const optimistic: Payment = {
      subscriptionId: bill.sub.id,
      period: bill.period,
      status: paid ? "PAID" : "UNPAID",
      source: "manual",
      paidAt: paid ? new Date().toISOString() : null,
      emailFrom: "",
      emailSubject: "",
    };
    const replace = (p: Payment) =>
      setPayments((prev) => [...prev.filter((x) => !(x.subscriptionId === p.subscriptionId && x.period === p.period)), p]);
    const before = bill.payment;
    replace(optimistic);
    setError(null);
    try {
      replace(
        await api<Payment>(`/api/admin/google/subscriptions/${bill.sub.id}/payment`, {
          method: "POST",
          json: { period: bill.period, paid },
        }),
      );
    } catch (err) {
      if (before) replace(before);
      else setPayments((prev) => prev.filter((x) => !(x.subscriptionId === bill.sub.id && x.period === bill.period)));
      setError((err as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-[1080px]">
      <header className="mt-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[14px] text-secondary">Essential</p>
          <h1 className="mt-1 font-display text-[30px] font-semibold tracking-[-0.025em] text-ink md:text-[36px]">
            Your days & your bills
          </h1>
        </div>
        <p className="text-[12.5px] text-secondary">
          {props.sync ? `Synced ${formatDateTime(props.sync.at)} · hourly` : "Not connected yet"}
        </p>
      </header>

      {stale ? (
        <Notice>
          The last sync was {formatDateTime(props.sync!.at)} — the script should run hourly. Open it in
          script.google.com and check Executions for errors.
        </Notice>
      ) : null}
      {error ? <Notice>{error}</Notice> : null}

      <div className="mt-10 space-y-14">
        <Agenda events={props.events} today={props.today} synced={synced} />

        <Subscriptions
          subs={subs}
          payments={payments}
          today={props.today}
          onAdd={() => setAdding(true)}
          onEdit={setEditing}
          onToggle={toggle}
        />

        <section>
          {synced ? (
            <button
              onClick={() => setShowSetup((v) => !v)}
              className="mb-4 inline-flex items-center gap-1.5 px-1 text-[13px] font-medium text-secondary hover:text-ink"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showSetup ? "rotate-180" : ""}`} />
              {showSetup ? "Hide setup" : "Setup & script"}
            </button>
          ) : null}
          {showSetup ? <SetupGuide {...props.setup} /> : null}
        </section>
      </div>

      {adding ? (
        <SubscriptionModal
          onClose={() => setAdding(false)}
          onSubmit={async (data: SubscriptionDraft) => {
            upsertSub(await api<Subscription>("/api/admin/google/subscriptions", { method: "POST", json: data }));
            setAdding(false);
          }}
        />
      ) : null}

      {editing ? (
        <SubscriptionModal
          entry={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (data) => {
            upsertSub(await api<Subscription>(`/api/admin/google/subscriptions/${editing.id}`, { method: "PATCH", json: data }));
            setEditing(null);
          }}
          onDelete={async () => {
            await api(`/api/admin/google/subscriptions/${editing.id}`, { method: "DELETE" });
            setSubs((prev) => prev.filter((s) => s.id !== editing.id));
            setPayments((prev) => prev.filter((p) => p.subscriptionId !== editing.id));
            setEditing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="mt-6 flex items-start gap-3 rounded-2xl bg-loss/5 px-5 py-4 text-[13px] text-ink">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-loss" strokeWidth={1.75} />
      <p>{children}</p>
    </div>
  );
}
