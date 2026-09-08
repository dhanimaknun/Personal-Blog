import Link from "next/link";
import { site } from "@/lib/site";

/**
 * THE JOURNAL wordmark. `compact` is a quiet link back home on interior
 * pages; the full size opens the homepage.
 */
export function Masthead({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link
        href="/"
        className="link-underline inline-block font-display text-[22px] font-light tracking-[-0.03em] text-ink"
      >
        {site.name}
      </Link>
    );
  }

  return (
    <header>
      <h1 className="t-blog-title text-ink">{site.name}</h1>
      <p className="t-author mt-4">{site.byline}</p>
    </header>
  );
}
