import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { PostList } from "@/components/PostList";
import { Sidebar } from "@/components/Sidebar";
import { getPostsByYear } from "@/lib/posts";
import { site, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: { year: string } };

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: `Archive ${params.year}`,
    description: `Entries from ${params.year} on ${site.name}.`,
    alternates: { canonical: absoluteUrl(`/archive/${params.year}`) },
  };
}

export default async function ArchiveYearPage({ params }: Props) {
  const year = Number(params.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2200) notFound();

  const posts = await getPostsByYear(year);

  return (
    <PublicShell
      compactMasthead
      sidebar={<Sidebar activeArchive={{ year }} />}
      header={
        <div className="mt-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
            Archive
          </p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight text-ink sm:text-[40px]">
            {year}
          </h1>
        </div>
      }
    >
      <PostList posts={posts} emptyMessage={`No entries from ${year}.`} />
    </PublicShell>
  );
}
