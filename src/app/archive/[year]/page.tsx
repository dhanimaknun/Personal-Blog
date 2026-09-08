import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/PublicShell";
import { PostList } from "@/components/PostList";
import { Sidebar } from "@/components/Sidebar";
import { PageHeading } from "@/components/PageHeading";
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
      header={<PageHeading eyebrow="Archive" title={String(year)} />}
    >
      <PostList posts={posts} emptyMessage={`No entries from ${year}.`} />
    </PublicShell>
  );
}
