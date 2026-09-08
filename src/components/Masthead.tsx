import Link from "next/link";
import { site } from "@/lib/site";
import { Wordmark } from "@/components/Wordmark";

/**
 * THE JOURNAL. wordmark. `compact` is a quiet link back home on interior
 * pages; the full size opens the homepage.
 */
export function Masthead({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <Link href="/" className="link-underline inline-block">
        <Wordmark className="font-display text-[22px] font-extrabold tracking-[-0.04em] text-ink" />
      </Link>
    );
  }

  return (
    <header>
      <h1>
        <Wordmark className="t-blog-title text-ink" />
      </h1>
      <p className="t-author mt-4">{site.byline}</p>
    </header>
  );
}
