import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { PostList } from "@/components/PostList";
import { Sidebar } from "@/components/Sidebar";
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
      header={
        <div className="mt-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
            Tag
          </p>
          <h1 className="mt-2 font-display text-[32px] font-semibold tracking-tight text-ink sm:text-[40px]">
            #{tag}
          </h1>
        </div>
      }
    >
      <PostList posts={posts} emptyMessage={`No entries tagged #${tag}.`} />
    </PublicShell>
  );
}
