import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { PostList } from "@/components/PostList";
import { Sidebar } from "@/components/Sidebar";
import { PageHeading } from "@/components/PageHeading";
import { getPublishedPosts } from "@/lib/posts";
import { site, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: { tag: string } };

export function generateMetadata({ params }: Props): Metadata {
  const tag = decodeURIComponent(params.tag).toLowerCase();
  return {
    title: `#${tag}`,
    description: `Entries tagged #${tag} on ${site.name}.`,
    alternates: { canonical: absoluteUrl(`/tags/${tag}`) },
  };
}

export default async function TagPage({ params }: Props) {
  const tag = decodeURIComponent(params.tag).toLowerCase();
  const posts = await getPublishedPosts({ tag });

  return (
    <PublicShell
      compactMasthead
      sidebar={<Sidebar activeTag={tag} />}
      header={<PageHeading eyebrow="Tag" title={`#${tag}`} />}
    >
      <PostList posts={posts} emptyMessage={`No entries tagged #${tag}.`} />
    </PublicShell>
  );
}
