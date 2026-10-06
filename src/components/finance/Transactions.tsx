"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Coins, Landmark, Search } from "lucide-react";
import { filterAndSort, type Position, type SortKey } from "@/lib/finance-calc";
import { ASSET_COLOR, formatDate, formatIDR, formatQuantity, type Asset } from "@/lib/finance-shared";
import { Card, IconBadge, ReturnPill, Segmented, SectionTitle } from "@/components/finance/ui";

const RECENT = 5;

const SORTS: { id: SortKey; label: string }[] = [
  { id: "date", label: "Newest" },
  { id: "amount", label: "Largest" },
  { id: "plPct", label: "Best return" },
];

/** 6 · Recent transactions — five at a glance, everything one tap away. */
export function Transactions({ positions, onOpen }: { positions: Position[]; onOpen: (p: Position) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [asset, setAsset] = useState<"ALL" | Asset>("ALL");
  const [sort, setSort] = useState<SortKey>("date");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const list = filterAndSort(positions, {
      query: expanded ? query : "",
      outcome: "ALL",
      fund: "ALL",
      asset: expanded ? asset : "ALL",
      sort: expanded ? sort : "date",
      dir: "desc",
    });
    return expanded ? list : list.slice(0, RECENT);
  }, [positions, expanded, query, asset, sort]);

  return (
    <section>
      <SectionTitle
        title={expanded ? "All transactions" : "Recent transactions"}
        hint={expanded ? `${positions.length} purchases` : undefined}
        action={
          positions.length > RECENT || expanded ? (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[13px] font-medium text-accent transition-opacity hover:opacity-75"
            >
              {expanded ? "Show recent" : `View all ${positions.length}`}
            </button>
          ) : null
        }
      />

      {expanded ? (
        <div className="mb-3 flex flex-wrap items-center gap-3 px-1">
          <Segmented
            label="Asset"
            options={[
              { id: "ALL", label: "All" },
              { id: "GOLD", label: "Gold" },
              { id: "RDPU", label: "RDPU" },
            ]}
            value={asset}
            onChange={setAsset}
          />
          <Segmented label="Sort" options={SORTS} value={sort} onChange={setSort} />
          <label className="ml-auto flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 ring-1 ring-divider/70 focus-within:ring-accent/50">
            <Search className="h-3.5 w-3.5 text-secondary" strokeWidth={1.75} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search transactions"
              className="w-32 bg-transparent text-[13px] text-ink placeholder:text-secondary focus:outline-none"
            />
          </label>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="px-6 py-12 text-center text-[14px] text-secondary">
            {positions.length === 0 ? "No transactions yet." : "Nothing matches that search."}
          </p>
        ) : (
          <ul className="divide-y divide-divider/70">
            {rows.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => onOpen(p)}
                  className="group flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-canvas/70 sm:px-6"
                >
                  <IconBadge color={ASSET_COLOR[p.asset]}>
                    {p.asset === "GOLD" ? (
                      <Coins className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    ) : (
                      <Landmark className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    )}
                  </IconBadge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink">
                      {p.asset === "GOLD" ? `Bought ${formatQuantity("GOLD", p.quantity)} of gold` : p.fundName}
                    </p>
                    <p className="mt-0.5 truncate text-[12.5px] text-secondary">
                      {formatDate(p.date)}
                      {p.platform ? ` · ${p.platform}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[14px] font-medium tabular-nums text-ink">{formatIDR(p.amount)}</p>
                    <div className="mt-1">
                      <ReturnPill value={p.pl} pct={p.plPct} />
                    </div>
                  </div>
                  <ChevronRight className="hidden h-4 w-4 shrink-0 text-divider transition-colors group-hover:text-secondary sm:block" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
