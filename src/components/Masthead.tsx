import Link from "next/link";
import { site } from "@/lib/site";
import { Wordmark } from "@/components/Wordmark";
import { FishMark } from "@/components/FishMark";

/**
 * THE JOURNAL. wordmark with the two-fish mark alongside. Both sizes link
 * back to the front desk; `compact` is the quiet version for interior pages.
 */
export function Masthead({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link href="/" className="group inline-flex items-center gap-2.5">
        <FishMark size={22} className="shrink-0" />
        <Wordmark className="font-display text-[22px] font-extrabold tracking-[-0.04em] text-ink transition-colors group-hover:text-accent" />
      </Link>
    );
  }

  return (
    <header className="flex items-center gap-4 sm:gap-6">
      <FishMark className="h-[76px] w-[76px] shrink-0 sm:h-[108px] sm:w-[108px]" />
      <div>
        <h1>
          <Link href="/" className="group">
            <Wordmark className="t-blog-title text-ink transition-colors group-hover:text-accent" />
          </Link>
        </h1>
        <p className="t-author mt-4">{site.byline}</p>
      </div>
    </header>
  );
}
