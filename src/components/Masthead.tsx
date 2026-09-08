import Link from "next/link";
import { site } from "@/lib/site";

/**
 * THE JOURNAL wordmark. `compact` is used on interior pages as a quiet
 * link back home; the full size opens the homepage.
 */
export function Masthead({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/"
        className="inline-block font-display font-light tracking-tight text-ink transition-colors hover:text-accent"
      >
        <span className="text-[22px] leading-none">{site.name}</span>
      </Link>
    );
  }

  return (
    <header>
      <h1 className="font-display font-light leading-[1.02] tracking-[-0.03em] text-ink text-[44px] sm:text-[56px] lg:text-[72px]">
        {site.name}
      </h1>
      <p className="mt-3 text-[16px] font-light text-secondary">{site.byline}</p>
    </header>
  );
}
