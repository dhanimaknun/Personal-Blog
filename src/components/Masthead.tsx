import Link from "next/link";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/site";
import { Wordmark } from "@/components/Wordmark";
import { FishMark } from "@/components/FishMark";
import { SiteNav } from "@/components/SiteNav";

const LINKS = [
  { href: "/journal", label: "Journal" },
  { href: "/after-hours", label: "After Hours" },
  { href: "/finance-deck", label: "Finance Deck", adminOnly: true },
  { href: "/essential", label: "Essential", adminOnly: true },
  { href: "/about", label: "About" },
];

/**
 * THE JOURNAL. wordmark with the two-fish mark alongside, and the section
 * menu centred beside it. Both sizes link back to the front desk; `compact`
 * is the quiet version for interior pages. `aside` fills the right-hand side.
 */
export async function Masthead({ compact = false, aside }: { compact?: boolean; aside?: React.ReactNode }) {
  const session = await getSession();
  const links = LINKS.filter((l) => !l.adminOnly || session).map(({ href, label }) => ({ href, label }));

  const brand = compact ? (
    <Link href="/" className="group inline-flex items-center gap-2.5">
      <FishMark size={22} className="shrink-0" />
      <Wordmark className="font-display text-[22px] font-extrabold tracking-[-0.04em] text-ink transition-colors group-hover:text-accent" />
    </Link>
  ) : (
    <div className="flex items-center gap-4 sm:gap-6">
      <FishMark className="h-[76px] w-[76px] shrink-0 sm:h-[108px] sm:w-[108px]" />
      <div>
        <h1>
          <Link href="/" className="group">
            <Wordmark className="t-blog-title text-ink transition-colors group-hover:text-accent" />
          </Link>
        </h1>
        <p className="t-author mt-4">{site.byline}</p>
      </div>
    </div>
  );

  // Brand · menu · aside. The outer columns share the leftover width so the
  // menu sits in the middle; below md the menu drops to its own row.
  return (
    <header className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-4 md:grid-cols-[minmax(max-content,1fr)_auto_minmax(0,1fr)]">
      <div className="min-w-0">{brand}</div>
      <div className="col-span-2 row-start-2 min-w-0 md:col-span-1 md:col-start-2 md:row-start-1">
        <SiteNav links={links} />
      </div>
      <div className="justify-self-end md:col-start-3 md:row-start-1">{aside}</div>
    </header>
  );
}
