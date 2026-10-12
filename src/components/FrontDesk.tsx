import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CalendarDays, Check, Clock, Lock, Minus, Music2 } from "lucide-react";
import { relativeTime } from "@/lib/dates";
import { formatDate, formatIDR, formatPct } from "@/lib/finance-shared";
import type { AfterHoursPeek, FinancePeek, GooglePeek, JournalPeek } from "@/lib/front-desk";
import type { MediaType } from "@/lib/media-shared";

// The landing page's cards. Each one is a doorway with a small live peek at
// what's behind it. The page fits one screen (see `fits`), so cards fill
// their grid cell and shed secondary detail on shorter viewports (`tall:` /
// `xtall:` are min-height breakpoints) instead of growing or clipping.

const CARD =
  "group relative flex flex-col rounded-2xl bg-surface p-4 ring-1 ring-divider/60 shadow-[0_1px_2px_rgba(28,28,30,0.04),0_8px_28px_-6px_rgba(28,28,30,0.08)] transition-[transform,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(28,28,30,0.05),0_16px_40px_-8px_rgba(28,28,30,0.14)] fits:min-h-0 fits:overflow-hidden tall:p-5 lg:tall:p-6 xtall:p-7";

function Eyebrow({ n, label, right }: { n: number; label: string; right?: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-3">
      <p className="t-label text-secondary">
        {String(n).padStart(2, "0")} — {label}
      </p>
      {right ? <span className="t-label text-secondary">{right}</span> : null}
    </div>
  );
}

function Door({ label }: { label: string }) {
  return (
    <span className="mt-auto flex shrink-0 items-center justify-between pt-3 tall:pt-4">
      <span className="text-[13px] font-medium text-secondary transition-colors group-hover:text-ink">{label}</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-secondary ring-1 ring-divider/70 transition-colors group-hover:bg-accent group-hover:text-white group-hover:ring-accent">
        <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-px group-hover:translate-x-px" strokeWidth={1.75} />
      </span>
    </span>
  );
}

// ── 01 · Journal ──────────────────────────────────────────────

/**
 * `roomy`: the card has the full grid height to itself (the visitor layout),
 * so it lists recent entries; in the four-card admin grid it stays compact.
 */
export function JournalCard({ n, peek, roomy }: { n: number; peek: JournalPeek; roomy: boolean }) {
  const { latest, recent, count } = peek;
  return (
    <section className={`${CARD} md:col-span-2`}>
      <Eyebrow n={n} label="Journal" right={count ? `${count} ${count === 1 ? "entry" : "entries"}` : undefined} />

      {latest ? (
        <div className="mt-4 min-h-0 tall:mt-6">
          <p className="text-[13px] text-secondary">Latest entry · {relativeTime(latest.publishedAt)}</p>
          <Link href={`/${latest.slug}`} className="mt-2 block">
            <h2 className="line-clamp-2 font-display text-[22px] font-semibold leading-[1.18] tracking-[-0.02em] text-ink transition-colors hover:text-accent md:text-[26px] xtall:text-[32px]">
              {latest.title}
            </h2>
          </Link>
          {latest.excerpt ? (
            <p className={`mt-3 hidden max-w-[58ch] text-[15px] leading-relaxed text-secondary ${roomy ? "md:line-clamp-2" : "md:tall:line-clamp-2"}`}>
              {latest.excerpt}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="t-excerpt mt-4">Nothing published yet.</p>
      )}

      {roomy && recent.length > 0 ? (
        // More entries as the screen gets taller: one, then two, then four.
        <ul className="mt-5 hidden shrink-0 divide-y divide-divider/70 border-t border-divider/70 md:block">
          {recent.map((p, i) => (
            <li key={p.slug} className={i >= 2 ? "hidden xtall:block" : i === 1 ? "hidden tall:block" : ""}>
              <Link
                href={`/${p.slug}`}
                className="flex items-center justify-between gap-4 py-2.5 text-[14.5px] text-ink transition-colors hover:text-accent"
              >
                <span className="truncate">{p.title}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-secondary" strokeWidth={1.75} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}

      {/* the card stays a plain section so the post links above can live inside it */}
      <Link href="/journal" className="mt-auto block focus-visible:outline-offset-4">
        <Door label="Open the journal" />
      </Link>
    </section>
  );
}

// ── 02 · After Hours ──────────────────────────────────────────

const PLURAL: Partial<Record<MediaType, [string, string]>> = {
  BOOK: ["book", "books"],
  MOVIE: ["movie", "movies"],
  SERIES: ["series", "series"],
  MANGA: ["manga", "manga"],
};

export function AfterHoursCard({ n, peek }: { n: number; peek: AfterHoursPeek }) {
  const tally = (Object.keys(PLURAL) as MediaType[])
    .map((t) => [t, peek.counts[t] ?? 0] as const)
    .filter(([, c]) => c > 0)
    .map(([t, c]) => `${c} ${PLURAL[t]![c === 1 ? 0 : 1]}`);

  return (
    <Link href="/after-hours" className={CARD}>
      <Eyebrow n={n} label="After Hours" />

      {peek.onLoop ? (
        <div className="mt-4 tall:mt-5">
          <p className="hidden text-[13px] text-secondary tall:block">On loop</p>
          <div className="flex tall:mt-2 items-center gap-3.5">
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

      {tally.length ? <p className="mt-3 hidden text-[13px] text-secondary tall:block">{tally.join(" · ")}</p> : null}

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
            Private
          </span>
        }
      />

      {peek ? (
        <div className="mt-4 tall:mt-5">
          <p className="hidden text-[13px] text-secondary tall:block">Portfolio value</p>
          <p className="font-display tall:mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink xtall:text-[30px]">
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

      <Door label="Open Finance Deck" />
    </Link>
  );
}

// ── 03 · Google Apps (admin) ──────────────────────────────────

export function GoogleCard({ n, peek }: { n: number; peek: GooglePeek }) {
  const { bills } = peek;
  return (
    <Link href="/google-apps" className={`${CARD} md:col-span-2`}>
      <Eyebrow
        n={n}
        label="Google Apps"
        right={
          <span className="inline-flex items-center gap-1" title="Only visible to you">
            <Lock className="h-3 w-3" strokeWidth={2} aria-hidden />
            Private
          </span>
        }
      />

      {!peek.synced ? (
        <p className="mt-4 font-display text-[17px] font-semibold tracking-[-0.01em] text-ink">
          Connect Google Calendar and Gmail.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-6 tall:mt-5">
          <div className="min-w-0">
            <p className="hidden text-[13px] text-secondary tall:block">
              {peek.todayCount ? `${peek.todayCount} on today` : "Today"}
            </p>
            <p className="flex items-center gap-2 tall:mt-1.5">
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
            <p className="hidden text-[13px] text-secondary tall:block">Subscriptions</p>
            <p className="flex items-center gap-2 tall:mt-1.5">
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

      <Door label="Open Google Apps" />
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
