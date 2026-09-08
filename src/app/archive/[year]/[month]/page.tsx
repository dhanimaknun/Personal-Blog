import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { PostList } from "@/components/PostList";
import { Sidebar } from "@/components/Sidebar";
import { getPostsByMonth } from "@/lib/posts";
import { monthName } from "@/lib/dates";
import { site, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: { year: string; month: string } };

function parse(params: Props["params"]) {
  const year = Number(params.year);
  const month = Number(params.month);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return null;
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return { year, month };
}

export function generateMetadata({ params }: Props): Metadata {
  const parsed = parse(params);
  if (!parsed) return { title: "Archive" };
  const label = `${monthName(parsed.month)} ${parsed.year}`;
  return {
    title: label,
    description: `Entries from ${label} on ${site.name}.`,
    alternates: {
      canonical: absoluteUrl(`/archive/${parsed.year}/${String(parsed.month).padStart(2, "0")}`),
    },
  };
}

export default async function ArchiveMonthPage({ params }: Props) {
  const parsed = parse(params);
  if (!parsed) notFound();

  const posts = await getPostsByMonth(parsed.year, parsed.month);
  const label = `${monthName(parsed.month)} ${parsed.year}`;

  return (
    <PublicShell
      compactMasthead
      sidebar={<Sidebar activeArchive={parsed} />}
      header={
        <div className="mt-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
            Archive
          </p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight text-ink sm:text-[40px]">
            {label}
          </h1>
        </div>
      }
    >
      <PostList posts={posts} emptyMessage={`No entries from ${label}.`} />
    </PublicShell>
  );
}
