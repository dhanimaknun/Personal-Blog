import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getStats } from "@/lib/post-actions";
import { getSession } from "@/lib/auth";
import { greeting, relativeTime, longDate } from "@/lib/dates";
import { site } from "@/lib/site";
import { StatTile } from "@/components/admin/StatTile";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  const name = (session?.username || site.author).toUpperCase();

  const [stats, latestDraft, latestPublished, recent] = await Promise.all([
    getStats(),
    prisma.post.findFirst({
      where: { status: "DRAFT", deletedAt: null },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.post.findFirst({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.post.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  const continueTarget = latestDraft ?? latestPublished;

  return (
    <div className="mx-auto max-w-3xl px-8 py-16">
      <p className="font-display text-[15px] font-light tracking-tight text-secondary">
        {site.wordmark}
      </p>
      <h1 className="mt-3 font-display text-[40px] font-light leading-tight tracking-tight text-ink">
        {greeting()}, {name}.
      </h1>
      <p className="mt-1 font-display text-[40px] font-light leading-tight tracking-tight text-secondary">
        Continue writing?
      </p>

      {/* Continue writing card */}
      <div className="mt-10 rounded-lg border border-divider bg-white p-6">
        {continueTarget ? (
          <>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
              {latestDraft ? "Latest draft" : "Latest published"}
            </p>
            <h2 className="mt-3 font-display text-[24px] font-medium leading-snug tracking-tight text-ink">
              {continueTarget.title}
            </h2>
            <p className="mt-1.5 text-[13px] text-secondary">
              Last edited {relativeTime(continueTarget.updatedAt)}
            </p>
            <Link
              href={`/admin/posts/${continueTarget.id}`}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Continue writing
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </>
        ) : (
          <>
            <h2 className="font-display text-[22px] font-medium tracking-tight text-ink">
              A blank page.
            </h2>
            <p className="mt-1.5 text-[13px] text-secondary">
              Nothing written yet. Start your first entry.
            </p>
          </>
        )}
      </div>

      {/* Statistics */}
      <section className="mt-14">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
          Statistics
        </h3>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Published" value={stats.published} />
          <StatTile label="Drafts" value={stats.drafts} />
          <StatTile label="Words written" value={stats.wordsWritten.toLocaleString()} />
          <StatTile label="Posts this month" value={stats.postsThisMonth} />
        </div>

        {stats.mostUsedTags.length > 0 ? (
          <div className="mt-4 rounded-lg border border-divider bg-white p-5">
            <p className="text-[13px] text-secondary">Most used tags</p>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[14px] text-ink">
              {stats.mostUsedTags.map((t) => (
                <li key={t.tag}>
                  #{t.tag} <span className="text-secondary">({t.count})</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {/* Latest posts */}
      <section className="mt-14">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
          Latest posts
        </h3>
        <ul className="mt-3 divide-y divide-divider">
          {recent.map((post) => (
            <li key={post.id}>
              <Link
                href={`/admin/posts/${post.id}`}
                className="group flex items-center gap-4 py-3.5"
              >
                <span className="min-w-0 flex-1 truncate text-[15px] text-ink group-hover:text-accent">
                  {post.title}
                </span>
                <span className="shrink-0 text-[12px] uppercase tracking-wide text-secondary">
                  {post.status.toLowerCase()}
                </span>
                <span className="hidden shrink-0 text-[12px] text-secondary sm:block">
                  {longDate(post.updatedAt)}
                </span>
              </Link>
            </li>
          ))}
          {recent.length === 0 ? (
            <li className="py-4 text-[14px] text-secondary">No posts yet.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}
