import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { PostList } from "@/components/PostList";
import { Sidebar } from "@/components/Sidebar";
import { searchPublishedPosts } from "@/lib/posts";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: `Search ${site.name}.`,
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = (searchParams.q ?? "").trim();
  const posts = query ? await searchPublishedPosts(query) : [];

  return (
    <PublicShell
      compactMasthead
      sidebar={<Sidebar />}
      header={
        <div className="mt-16">
          <p className="t-eyebrow">Search</p>
          <form action="/search" className="mt-4 border-b border-ink pb-3">
            <input
              type="search"
              name="q"
              defaultValue={query}
              autoFocus
              aria-label="Search the journal"
              placeholder="Type and press enter"
              className="w-full bg-transparent font-display text-[32px] font-light tracking-[-0.02em] text-ink placeholder:text-divider focus:outline-none md:text-[48px]"
            />
          </form>
          {query ? (
            <p className="mt-6 t-tag text-secondary">
              {posts.length} result{posts.length === 1 ? "" : "s"} for “{query}”
            </p>
          ) : null}
        </div>
      }
    >
      <PostList
        posts={posts}
        emptyMessage={query ? "Nothing matched that search." : "Enter a search above."}
      />
    </PublicShell>
  );
}
