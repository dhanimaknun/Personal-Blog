import Link from "next/link";
import { getArchive, getTagCounts } from "@/lib/posts";
import { site } from "@/lib/site";
import { ArchiveNav } from "@/components/ArchiveNav";

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
      <div className="space-y-16">
        <section>
          <p className="t-sidebar-item leading-[1.8] text-secondary">{site.description}</p>
        </section>

        <section>
          <h2 className="t-sidebar-heading mb-6">Archive</h2>
          <ArchiveNav years={archive} active={activeArchive} />
        </section>

        <section>
          <h2 className="t-sidebar-heading mb-6">Tags</h2>
          {tags.length === 0 ? (
            <p className="t-tag text-secondary">No tags yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {tags.map(({ tag, count }) => {
                const isActive = activeTag === tag;
                return (
                  <li key={tag}>
                    <Link
                      href={`/tags/${tag}`}
                      className={`t-tag flex items-baseline justify-between transition-colors duration-200 ease-out hover:text-accent hover:underline ${
                        isActive ? "text-accent" : "text-ink"
                      }`}
                    >
                      <span>#{tag}</span>
                      <span className="tabular-nums text-secondary">({count})</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
