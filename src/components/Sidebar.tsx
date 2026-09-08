import Link from "next/link";
import { getArchive, getTagCounts } from "@/lib/posts";
import { site } from "@/lib/site";
import { ArchiveNav } from "@/components/ArchiveNav";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-secondary">
      {children}
    </h2>
  );
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
    <aside className="lg:sticky lg:top-14 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-2 thin-scroll">
      <div className="space-y-12">
        <section>
          <p className="text-[14px] leading-[1.7] text-secondary">{site.description}</p>
        </section>

        <section>
          <SectionLabel>Archive</SectionLabel>
          <ArchiveNav years={archive} active={activeArchive} />
        </section>

        <section>
          <SectionLabel>Tags</SectionLabel>
          {tags.length === 0 ? (
            <p className="text-[13px] text-secondary">No tags yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {tags.map(({ tag, count }) => {
                const isActive = activeTag === tag;
                return (
                  <li key={tag}>
                    <Link
                      href={`/tags/${tag}`}
                      className={`flex items-center justify-between text-[14px] transition-colors ${
                        isActive ? "text-accent" : "text-ink hover:text-accent"
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
