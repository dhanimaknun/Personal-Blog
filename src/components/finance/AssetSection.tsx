"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Pencil, Plus, Search } from "lucide-react";
import { filterAndSort, type AssetSummary, type Outcome, type Position, type SortKey } from "@/lib/finance-calc";
import {
  ASSET_COLOR,
  formatDate,
  formatDateTime,
  formatIDR,
  formatPct,
  formatPrice,
  formatQuantity,
  formatSignedIDR,
  signClass,
  type Asset,
  type PricePoint,
} from "@/lib/finance-shared";
import { Card, Chip, Delta } from "@/components/finance/ui";

export type Instrument = {
  key: string;
  label: string;
  quote: PricePoint | null;
};

const SORTS: { id: SortKey; label: string }[] = [
  { id: "date", label: "Date" },
  { id: "amount", label: "Capital" },
  { id: "value", label: "Value" },
  { id: "pl", label: "Profit / loss" },
  { id: "plPct", label: "Return %" },
];

const COPY: Record<Asset, { title: string; blurb: string; unitPrice: string; empty: string; add: string }> = {
  GOLD: {
    title: "Gold",
    blurb: "Every gram bought, valued at today’s gold price.",
    unitPrice: "Price / g",
    empty: "No gold purchases yet.",
    add: "Add purchase",
  },
  RDPU: {
    title: "RDPU",
    blurb: "Money-market funds, valued at each fund’s latest NAB.",
    unitPrice: "NAB",
    empty: "No money-market fund investments yet.",
    add: "Add investment",
  },
};

export function AssetSection({
  asset,
  positions,
  summary,
  instruments,
  busy,
  onAdd,
  onEdit,
  onSetPrice,
}: {
  asset: Asset;
  positions: Position[];
  summary: AssetSummary;
  instruments: Instrument[];
  busy: boolean;
  onAdd: () => void;
  onEdit: (p: Position) => void;
  onSetPrice: (instrument: Instrument) => void;
}) {
  const copy = COPY[asset];
  const [query, setQuery] = useState("");
  const [outcome, setOutcome] = useState<Outcome>("ALL");
  const [fund, setFund] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(
    () => filterAndSort(positions, { query, outcome, fund, sort, dir }),
    [positions, query, outcome, fund, sort, dir],
  );

  const isGold = asset === "GOLD";
  const empty = positions.length === 0;

  return (
    <section className="mt-16" aria-labelledby={`${asset}-title`}>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-eyebrow flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: ASSET_COLOR[asset] }} />
            {isGold ? "Gold investment tracker" : "Money-market fund tracker"}
          </p>
          <h2 id={`${asset}-title`} className="mt-3 font-display text-[26px] font-semibold tracking-tight text-ink">
            {copy.title}
          </h2>
          <p className="mt-1 text-[14px] text-secondary">{copy.blurb}</p>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-[13px] font-medium text-canvas transition-opacity hover:opacity-90"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          {copy.add}
        </button>
      </div>

      {/* market quotes */}
      {instruments.length > 0 ? (
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {instruments.map((ins) => (
            <QuoteRow key={ins.key} instrument={ins} isGold={isGold} busy={busy} onSet={() => onSetPrice(ins)} />
          ))}
        </div>
      ) : null}

      {empty ? (
        <Card className="mt-5 p-10 text-center">
          <p className="t-excerpt">{copy.empty}</p>
          <button
            onClick={onAdd}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-divider px-3 py-1.5 text-[13px] text-ink hover:border-ink"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} />
            {copy.add}
          </button>
        </Card>
      ) : (
        <>
          {/* toolbar */}
          <div className="mt-6 flex flex-col gap-3">
            {!isGold && instruments.length > 1 ? (
              <div className="flex flex-wrap items-center gap-2">
                <Chip active={fund === "ALL"} onClick={() => setFund("ALL")}>All funds</Chip>
                {instruments.map((ins) => (
                  <Chip key={ins.key} active={fund === ins.key} onClick={() => setFund(ins.key)}>
                    {ins.label}
                  </Chip>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Chip active={outcome === "ALL"} onClick={() => setOutcome("ALL")}>All</Chip>
              <Chip active={outcome === "GAIN"} onClick={() => setOutcome("GAIN")}>In profit</Chip>
              <Chip active={outcome === "LOSS"} onClick={() => setOutcome("LOSS")}>At a loss</Chip>

              <div className="ml-auto flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-[12px] text-secondary">
                  <span className="sr-only">Sort by</span>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    className="rounded-md border border-divider bg-surface px-2 py-1 text-[12px] text-ink focus:border-accent focus:outline-none"
                  >
                    {SORTS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
                    aria-label={dir === "asc" ? "Ascending — switch to descending" : "Descending — switch to ascending"}
                    className="rounded-md border border-divider p-1.5 text-secondary hover:text-ink"
                  >
                    <ArrowDownUp className={`h-3.5 w-3.5 transition-transform ${dir === "asc" ? "rotate-180" : ""}`} />
                  </button>
                </label>
                <div className="flex items-center gap-2 border-b border-divider pb-1">
                  <Search className="h-3.5 w-3.5 text-secondary" strokeWidth={1.75} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={isGold ? "Search platform, notes" : "Search fund, platform"}
                    aria-label={`Search ${copy.title} investments`}
                    className="w-40 bg-transparent text-[13px] text-ink placeholder:text-secondary focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* list */}
          <div className={`transition-opacity ${busy ? "opacity-60" : ""}`}>
            {rows.length === 0 ? (
              <p className="t-excerpt py-12 text-center">Nothing matches those filters.</p>
            ) : (
              <>
                <Card className="thin-scroll mt-4 hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-divider">
                        <Th>Date</Th>
                        {!isGold ? <Th>Fund</Th> : null}
                        <Th>Platform</Th>
                        <Th right>{isGold ? "Grams" : "Units"}</Th>
                        <Th right>Buy {copy.unitPrice}</Th>
                        <Th right>Capital</Th>
                        <Th right>Value now</Th>
                        <Th right>Profit / loss</Th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((p) => (
                        <tr key={p.id} className="group border-b border-divider last:border-0 hover:bg-canvas">
                          <td className="whitespace-nowrap px-4 py-3 text-ink">{formatDate(p.date)}</td>
                          {!isGold ? <td className="max-w-[220px] truncate px-4 py-3 text-ink" title={p.fundName}>{p.fundName}</td> : null}
                          <td className="px-4 py-3 text-secondary">{p.platform || "—"}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-ink">{formatQuantity(asset, p.quantity).replace(/ (g|unit)$/, "")}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-secondary">{formatPrice(p.price)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-ink">{formatIDR(p.amount)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-ink">{formatIDR(p.value)}</td>
                          <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${signClass(p.pl)}`}>
                            {formatSignedIDR(p.pl)}
                            <span className="ml-1.5 text-[12px] opacity-80">{formatPct(p.plPct)}</span>
                          </td>
                          <td className="px-2 py-3 text-right">
                            <button
                              onClick={() => onEdit(p)}
                              aria-label="Edit"
                              className="rounded-md p-1.5 text-secondary opacity-60 transition-opacity hover:text-ink group-hover:opacity-100"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>

                {/* mobile: stacked cards */}
                <ul className="mt-4 flex flex-col gap-2 md:hidden">
                  {rows.map((p) => (
                    <li key={p.id}>
                      <button onClick={() => onEdit(p)} className="block w-full text-left">
                        <Card className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-medium text-ink">
                                {isGold ? formatQuantity(asset, p.quantity) : p.fundName}
                              </p>
                              <p className="mt-0.5 text-[12px] text-secondary">
                                {formatDate(p.date)}
                                {p.platform ? ` · ${p.platform}` : ""}
                                {!isGold ? ` · ${formatQuantity(asset, p.quantity)}` : ""}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[14px] tabular-nums text-ink">{formatIDR(p.value)}</p>
                              <p className={`text-[12px] tabular-nums ${signClass(p.pl)}`}>
                                {formatSignedIDR(p.pl)} · {formatPct(p.plPct)}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* summary under the list */}
          <Card className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4 p-5 sm:grid-cols-4">
            <Figure label={isGold ? "Total gold" : "Total units"}>
              {formatQuantity(asset, summary.quantity)}
            </Figure>
            <Figure label="Capital invested">{formatIDR(summary.capital)}</Figure>
            <Figure label="Current value">{formatIDR(summary.value)}</Figure>
            <Figure label="Unrealised P/L">
              <Delta value={summary.pl} pct={summary.plPct} size="md" className="font-medium" />
            </Figure>
          </Card>
        </>
      )}
    </section>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 t-label font-normal text-secondary ${right ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="t-label text-secondary">{label}</p>
      <div className="mt-1.5 text-[17px] font-medium tabular-nums text-ink">{children}</div>
    </div>
  );
}

function QuoteRow({
  instrument,
  isGold,
  busy,
  onSet,
}: {
  instrument: Instrument;
  isGold: boolean;
  busy: boolean;
  onSet: () => void;
}) {
  const q = instrument.quote;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-divider bg-canvas px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[12.5px] text-secondary" title={instrument.label}>
          {isGold ? "Gold price today" : instrument.label}
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-[15px] font-medium tabular-nums text-ink">
          {q ? (
            <>
              {formatPrice(q.price)}
              <span className="text-[12px] font-normal text-secondary">
                {isGold ? "/ gram" : "/ unit"} · {isGold ? formatDateTime(q.updatedAt) : formatDate(q.date)}
                {q.source === "manual" ? " · manual" : ""}
              </span>
            </>
          ) : busy ? (
            <span className="text-[13px] font-normal text-secondary">Fetching…</span>
          ) : (
            <span className="text-[13px] font-normal text-secondary">No market price yet</span>
          )}
        </p>
      </div>
      <button onClick={onSet} className="shrink-0 t-label text-secondary transition-colors hover:text-accent">
        Set {isGold ? "price" : "NAB"}
      </button>
    </div>
  );
}

