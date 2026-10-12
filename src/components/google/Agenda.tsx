"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { formatDate } from "@/lib/finance-shared";
import { dayDiff, formatTime, groupAgenda, type AgendaEvent } from "@/lib/google-shared";
import { Card, SectionTitle } from "@/components/finance/ui";

const UPCOMING_DAYS = 6;

function dayLabel(day: string, today: string) {
  const diff = dayDiff(today, day);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatDate(day, { weekday: "long", day: "numeric", month: "short" });
}

/** Today in full, then the next few days that have something on. */
export function Agenda({ events, today, synced }: { events: AgendaEvent[]; today: string; synced: boolean }) {
  // Re-render every minute so "now" and past events stay current. Starts
  // null so the server render and first client render agree.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const days = useMemo(() => groupAgenda(events, today), [events, today]);
  const todays = days.find((d) => d.day === today)?.events ?? [];
  const later = days.filter((d) => d.day !== today).slice(0, UPCOMING_DAYS);

  return (
    <section>
      <SectionTitle
        title="Agenda"
        hint={synced ? `${todays.length ? `${todays.length} on today` : "Nothing on today"} · from Google Calendar` : "From Google Calendar"}
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="p-6 sm:p-7 lg:col-span-3">
          <p className="t-label text-secondary">Today</p>
          <p className="mt-1 font-display text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {formatDate(today, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          {!synced ? (
            <Empty>Your calendar shows up here after the first sync.</Empty>
          ) : todays.length === 0 ? (
            <Empty>A clear day — nothing on the calendar.</Empty>
          ) : (
            <ul className="mt-5 space-y-1">
              {todays.map((e) => (
                <EventRow key={e.id} event={e} now={now} />
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6 sm:p-7 lg:col-span-2">
          <p className="t-label text-secondary">Coming up</p>
          {!synced || later.length === 0 ? (
            <Empty>{synced ? "Nothing else in the next two weeks." : "—"}</Empty>
          ) : (
            <div className="mt-4 space-y-5">
              {later.map((d) => (
                <div key={d.day}>
                  <p className="text-[13px] font-medium text-ink">{dayLabel(d.day, today)}</p>
                  <ul className="mt-1.5 space-y-1.5">
                    {d.events.map((e) => (
                      <li key={e.id} className="flex items-baseline gap-2.5 text-[13.5px]">
                        <span className="mt-1 h-2 w-2 shrink-0 self-start rounded-full" style={{ background: e.color || "#9A968C" }} />
                        <span className="w-[42px] shrink-0 tabular-nums text-secondary">{e.allDay ? "All day" : formatTime(e.start)}</span>
                        <span className="min-w-0 truncate text-ink">{e.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

function EventRow({ event: e, now }: { event: AgendaEvent; now: number | null }) {
  const start = Date.parse(e.start);
  const end = Date.parse(e.end);
  const happening = now !== null && !e.allDay && start <= now && now < end;
  const over = now !== null && !e.allDay && end <= now;
  return (
    <li
      className={`flex items-start gap-4 rounded-xl px-3 py-3 transition-colors ${happening ? "bg-accent/[0.06]" : "hover:bg-canvas"} ${
        over ? "opacity-45" : ""
      }`}
    >
      <span className="mt-1 h-9 w-1 shrink-0 rounded-full" style={{ background: e.color || "#9A968C" }} />
      <div className="w-[92px] shrink-0 pt-0.5 text-[13px] tabular-nums text-secondary">
        {e.allDay ? "All day" : `${formatTime(e.start)} – ${formatTime(e.end)}`}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
          <span className="truncate">{e.title}</span>
          {happening ? (
            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-white">Now</span>
          ) : null}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-secondary">
          {e.location ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={1.75} />
              <span className="truncate">{e.location}</span>
            </span>
          ) : null}
          {e.calendar ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3" strokeWidth={1.75} />
              {e.calendar}
            </span>
          ) : null}
        </p>
      </div>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 text-[14px] text-secondary">{children}</p>;
}
