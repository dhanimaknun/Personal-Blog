import Link from "next/link";
import { getArchive, getTagCounts } from "@/lib/posts";
import { site } from "@/lib/site";
import { ArchiveNav } from "@/components/ArchiveNav";

function Rule() {
  return <hr className="border-0 border-t border-divider" />;
}

export async function Sidebar({
  activeTag,
  activeArchive,
}: {
  activeTag?: string;
  activeArchive?: { year: number; month?: number };
}) {
  const [archive, tags] = await Promise.all([getArchive(), getTagCounts()]);

  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-10rem)] lg:overflow-y-auto lg:pr-1 thin-scroll">
      <div className="space-y-8">
        <p className="t-blurb">{site.intro}</p>

        <Rule />

        <section>
          <h2 className="t-sidebar-heading mb-5">Archive</h2>
          <ArchiveNav years={archive} active={activeArchive} />
        </section>

        <Rule />

        <section>
          <h2 className="t-sidebar-heading mb-5">Tags</h2>
          {tags.length === 0 ? (
            <p className="t-tag text-secondary">No tags yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {tags.map(({ tag, count }) => {
                const isActive = activeTag === tag;
                return (
                  <li key={tag}>
                    <Link
                      href={`/tags/${tag}`}
                      className={`t-tag flex items-baseline justify-between transition-colors duration-200 ease-out hover:text-accent ${
                        isActive ? "text-accent" : "text-ink"
                      }`}
                    >
                      <span>#{tag}</span>
                      <span className="t-mononum text-secondary">({count})</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Rule />

        <p className="t-blurb">{site.outro}</p>
      </div>
    </aside>
  );
}
