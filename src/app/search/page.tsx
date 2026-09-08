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
        <div className="mt-10">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
            Search
          </p>
          <form action="/search" className="mt-3 border-b border-ink pb-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              autoFocus
              placeholder="Type and press enter"
              className="w-full bg-transparent font-display text-[28px] font-light tracking-tight text-ink placeholder:text-divider focus:outline-none sm:text-[36px]"
            />
          </form>
          {query ? (
            <p className="mt-4 text-[14px] text-secondary">
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
