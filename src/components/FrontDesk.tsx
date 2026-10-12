import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, BookOpen, CalendarDays, Check, Clock, Lock, Minus, Music2 } from "lucide-react";
import { relativeTime } from "@/lib/dates";
import { ASSET_COLOR, formatDate, formatIDR, formatPct, formatQuantity } from "@/lib/finance-shared";
import type { AfterHoursPeek, FinancePeek, GooglePeek, JournalPeek } from "@/lib/front-desk";
import { STATUS_LABEL, TYPE_LABEL, type MediaType } from "@/lib/media-shared";

// The landing page's cards. Each one is a doorway with a small live peek at
// what's behind it. The page fits one screen (see `fits`), so cards fill
// their grid cell and shed secondary detail on shorter viewports (`tall:` /
// `xtall:` are min-height breakpoints) instead of growing or clipping.

const CARD_FRAME =
  "group relative flex flex-col rounded-2xl p-4 transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 fits:min-h-0 fits:overflow-hidden tall:p-5 lg:tall:p-6 xtall:p-7";

const CARD = `${CARD_FRAME} bg-surface ring-1 ring-divider/60 shadow-[0_1px_2px_rgba(28,28,30,0.04),0_8px_28px_-6px_rgba(28,28,30,0.08)] hover:shadow-[0_2px_4px_rgba(28,28,30,0.05),0_16px_40px_-8px_rgba(28,28,30,0.14)]`;

// The journal is the site's identity, so its card wears the terracotta of the
// wordmark's full stop, with a warm shadow, instead of white.
const HERO_CARD = `${CARD_FRAME} bg-accent text-white shadow-[0_1px_2px_rgba(200,70,30,0.18),0_12px_32px_-8px_rgba(200,70,30,0.45)] hover:shadow-[0_2px_4px_rgba(200,70,30,0.2),0_20px_44px_-10px_rgba(200,70,30,0.55)]`;

function Eyebrow({ n, label, right, hero }: { n: number; label: string; right?: React.ReactNode; hero?: boolean }) {
  const tone = hero ? "text-white/90" : "text-secondary";
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <p className={`t-label ${tone}`}>
        {String(n).padStart(2, "0")} — {label}
      </p>
      {right ? <span className={`t-label ${tone}`}>{right}</span> : null}
    </div>
  );
}

function Door({ label, hero }: { label: string; hero?: boolean }) {
  return (
    <span className="mt-auto flex shrink-0 items-center justify-between pt-3 tall:pt-4">
      <span
        className={`text-[13px] font-medium transition-colors ${
          hero ? "text-white/90 group-hover/door:text-white" : "text-secondary group-hover:text-ink"
        }`}
      >
        {label}
      </span>
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-full ring-1 transition-colors ${
          hero
            ? "bg-white/15 text-white ring-white/30 group-hover/door:bg-white group-hover/door:text-accent group-hover/door:ring-white"
            : "bg-canvas text-secondary ring-divider/70 group-hover:bg-accent group-hover:text-white group-hover:ring-accent"
        }`}
      >
        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" strokeWidth={1.75} />
      </span>
    </span>
  );
}

// ── 01 · Journal ──────────────────────────────────────────────

/**
 * `roomy`: the card has the full grid height to itself (the visitor layout).
 * The admin card lists recent entries only in the single row of four (lg).
 */
export function JournalCard({ n, peek, roomy }: { n: number; peek: JournalPeek; roomy: boolean }) {
  const { latest, recent, count } = peek;
  return (
    <section className={`${HERO_CARD} ${roomy ? "md:col-span-2" : ""}`}>
      <Eyebrow hero n={n} label="Journal" right={count ? `${count} ${count === 1 ? "entry" : "entries"}` : undefined} />

      {latest ? (
        <div className="mt-4 min-h-0 tall:mt-6">
          <p className="text-[13px] text-white/90">Latest entry · {relativeTime(latest.publishedAt)}</p>
          <Link href={`/${latest.slug}`} className="mt-2 block">
            <h2 className="line-clamp-3 font-display text-[22px] font-semibold leading-[1.18] tracking-[-0.02em] text-white transition-opacity hover:opacity-80 md:text-[26px] xtall:text-[32px]">
              {latest.title}
            </h2>
          </Link>
        </div>
      ) : (
        <p className="mt-4 text-[16px] text-white/90">Nothing published yet.</p>
      )}

      {recent.length > 0 ? (
        // More entries as the screen gets taller. The admin card only has
        // room for them in the tall single row (lg).
        <div className={`mt-5 hidden min-h-0 border-t border-white/25 pt-4 ${roomy ? "md:block" : "lg:block"}`}>
          <p className="text-[13px] text-white/90">Latest</p>
          <ul className="mt-2.5 space-y-2.5">
            {recent.map((p, i) => (
              <li key={p.slug} className={i >= 3 ? "hidden xtall:block" : i === 2 ? "hidden tall:block" : ""}>
                <Link href={`/${p.slug}`} className="group/entry block">
                  <p className="truncate text-[14px] font-medium text-white transition-opacity group-hover/entry:opacity-80">{p.title}</p>
                  <p className="text-[12.5px] text-white/90">{shortDate(p.publishedAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* the card stays a plain section so the post links above can live inside it */}
      <Link href="/journal" className="group/door mt-auto block focus-visible:outline-offset-4 focus-visible:outline-white">
        <Door hero label="Open the journal" />
      </Link>
    </section>
  );
}

function shortDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

// ── 02 · After Hours ──────────────────────────────────────────

const PLURAL: Partial<Record<MediaType, [string, string]>> = {
  BOOK: ["book", "books"],
  MOVIE: ["movie", "movies"],
  SERIES: ["series", "series"],
  MANGA: ["manga", "manga"],
};

/** `roomy`: as for the journal card — the most-recent list needs the height. */
export function AfterHoursCard({ n, peek, roomy }: { n: number; peek: AfterHoursPeek; roomy: boolean }) {
  const tally = (Object.keys(PLURAL) as MediaType[])
    .map((t) => [t, peek.counts[t] ?? 0] as const)
    .filter(([, c]) => c > 0)
    .map(([t, c]) => `${c} ${PLURAL[t]![c === 1 ? 0 : 1]}`);

  return (
    <Link href="/after-hours" className={CARD}>
      <Eyebrow n={n} label="After Hours" />

      {peek.onLoop ? (
        <div className="mt-4 tall:mt-5">
          <p className="hidden text-[13px] text-secondary tall:block lg:block">On loop</p>
          <div className="flex items-center tall:mt-2 lg:mt-2 gap-3.5">
            {peek.onLoop.cover ? (
              <img
                src={peek.onLoop.cover}
                alt=""
                className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-divider/60 xtall:h-14 xtall:w-14"
              />
            ) : (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-canvas text-secondary ring-1 ring-divider/60">
                <Music2 className="h-5 w-5" strokeWidth={1.5} />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
                {peek.onLoop.title}
              </p>
              {peek.onLoop.creator ? <p className="truncate text-[13.5px] text-secondary">{peek.onLoop.creator}</p> : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Everything read, watched and played.
        </p>
      )}

      {tally.length ? <p className="mt-3 hidden text-[13px] text-secondary tall:block lg:block">{tally.join(" · ")}</p> : null}

      {peek.recent.length ? (
        <div className={`mt-5 hidden min-h-0 border-t border-divider/70 pt-4 ${roomy ? "md:block" : "lg:block"}`}>
          <p className="text-[13px] text-secondary">Latest</p>
          <ul className="mt-2.5 space-y-2.5">
            {peek.recent.map((e, i) => (
              <li key={e.id} className={`items-center gap-3 ${i === 2 ? "hidden tall:flex" : "flex"}`}>
                {e.cover ? (
                  <img src={e.cover} alt="" className="h-11 w-8 shrink-0 rounded-md object-cover ring-1 ring-divider/60" />
                ) : (
                  <span className="flex h-11 w-8 shrink-0 items-center justify-center rounded-md bg-canvas text-secondary ring-1 ring-divider/60">
                    <BookOpen className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{e.title}</p>
                  <p className="truncate text-[12.5px] text-secondary">
                    {TYPE_LABEL[e.type]} · {STATUS_LABEL[e.status]}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Door label="Open After Hours" />
    </Link>
  );
}

// ── 04 · Finance Deck (admin) ─────────────────────────────────

export function FinanceCard({ n, peek }: { n: number; peek: FinancePeek | null }) {
  return (
    <Link href="/finance-deck" className={CARD}>
      <Eyebrow
        n={n}
        label="Finance Deck"
        right={
          <span className="inline-flex items-center gap-1" title="Only visible to you">
            <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
            <span className="lg:sr-only">Private</span>
          </span>
        }
      />

      {peek ? (
        <div className="mt-4 tall:mt-5">
          <p className="hidden text-[13px] text-secondary tall:block lg:block">Portfolio value</p>
          <p className="font-display tall:mt-1.5 lg:mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink lg:text-[24px] xtall:text-[30px] lg:xtall:text-[26px]">
            {formatIDR(peek.value)}
          </p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {peek.dailyChange !== null ? (
              <Change value={peek.dailyChange} pct={peek.dailyChangePct} suffix="today" />
            ) : (
              <Change value={peek.pl} pct={peek.returnPct} suffix="overall" />
            )}
            {peek.asOf ? (
              <span className="text-[12px] text-secondary">
                as of {formatDate(peek.asOf, { day: "numeric", month: "short" })}
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Track your gold and money-market funds.
        </p>
      )}

      {peek?.recent.length ? (
        // Only in the tall single row (lg); the 2×2 tablet card has no room.
        <div className="mt-5 hidden min-h-0 border-t border-divider/70 pt-4 lg:block">
          <p className="text-[13px] text-secondary">Latest investments</p>
          <ul className="mt-2.5 space-y-2.5">
            {peek.recent.map((r, i) => (
              <li key={r.id} className={`items-start gap-2.5 ${i === 2 ? "hidden tall:flex" : "flex"}`}>
                <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: ASSET_COLOR[r.asset] }} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">
                    {r.asset === "GOLD" ? `Gold · ${formatQuantity("GOLD", r.quantity)}` : r.fundName}
                  </p>
                  <p className="truncate text-[12.5px] tabular-nums text-secondary">
                    {formatIDR(r.amount)} · {formatDate(r.date, { day: "numeric", month: "short" })}
                    {r.platform ? ` · ${r.platform}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Door label="Open Finance Deck" />
    </Link>
  );
}

// ── 03 · Essential (admin) ────────────────────────────────────

export function GoogleCard({ n, peek }: { n: number; peek: GooglePeek }) {
  const { bills } = peek;
  return (
    <Link href="/essential" className={CARD}>
      <Eyebrow
        n={n}
        label="Essential"
        right={
          <span className="inline-flex items-center gap-1" title="Only visible to you">
            <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
            <span className="lg:sr-only">Private</span>
          </span>
        }
      />

      {!peek.synced ? (
        <p className="mt-4 font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Connect Google Calendar and Gmail.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-6 tall:mt-5 lg:grid-cols-1 lg:gap-4">
          <div className="min-w-0">
            <p className="hidden text-[13px] text-secondary tall:block lg:block">
              {peek.todayCount ? `${peek.todayCount} on today` : "Today"}
            </p>
            <p className="flex items-center gap-2 tall:mt-1.5 lg:mt-1.5">
              <CalendarDays className="h-4 w-4 shrink-0 text-secondary" strokeWidth={1.75} />
              {peek.next ? (
                <span className="min-w-0 truncate font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
                  {peek.next.time ? <span className="tabular-nums text-secondary">{peek.next.time} </span> : null}
                  {peek.next.title}
                </span>
              ) : (
                <span className="text-[15px] text-secondary">Nothing else today</span>
              )}
            </p>
          </div>
          <div className="min-w-0">
            <p className="hidden text-[13px] text-secondary tall:block lg:block">Subscriptions</p>
            <p className="flex items-center gap-2 tall:mt-1.5 lg:mt-1.5">
              {bills.total === 0 ? (
                <span className="text-[15px] text-secondary">None due this month</span>
              ) : bills.attention > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-accent">
                  <Clock className="h-4 w-4" strokeWidth={2} />
                  {bills.attention} need{bills.attention === 1 ? "s" : ""} paying
                </span>
              ) : bills.paid === bills.total ? (
                <span className="inline-flex items-center gap-1.5 text-[15px] font-medium text-gain">
                  <Check className="h-4 w-4" strokeWidth={2.5} />
                  All paid this month
                </span>
              ) : (
                <span className="text-[15px] text-ink">
                  {bills.paid} of {bills.total} paid
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {peek.synced && peek.upcoming.length ? (
        // Only in the tall single row (lg); the 2×2 tablet card has no room.
        <div className="mt-5 hidden min-h-0 border-t border-divider/70 pt-4 lg:block">
          <p className="text-[13px] text-secondary">Upcoming</p>
          <ul className="mt-2.5 space-y-2.5">
            {peek.upcoming.map((e, i) => (
              <li key={e.id} className={`items-start gap-2.5 ${i === 2 ? "hidden tall:flex" : "flex"}`}>
                <span className="mt-[7px] h-2 w-2 shrink-0 rounded-full" style={{ background: e.color || "#9A968C" }} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{e.title}</p>
                  <p className="truncate text-[12.5px] tabular-nums text-secondary">
                    {e.day} · {e.time ?? "All day"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Door label="Open Essential" />
    </Link>
  );
}

function Change({ value, pct, suffix }: { value: number; pct: number | null; suffix: string }) {
  const tone = Math.round(value) === 0 ? "flat" : value > 0 ? "up" : "down";
  const Icon = tone === "flat" ? Minus : tone === "up" ? ArrowUpRight : ArrowDownRight;
  const colors = tone === "flat" ? "bg-canvas text-secondary" : tone === "up" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12.5px] font-medium tabular-nums ${colors}`}>
      <Icon className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
      {formatPct(pct, false)}
      <span className="font-normal opacity-80">{suffix}</span>
    </span>
  );
}
