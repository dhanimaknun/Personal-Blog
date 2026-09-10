import Link from "next/link";
import { site } from "@/lib/site";

const LINKS = [
  { href: "/", label: "Journal" },
  { href: "/after-hours", label: "After Hours" },
  { href: "/about", label: "About" },
];

/** Quiet footer — a small nav and the copyright — at the foot of every public page. */
export function SiteFooter() {
  return (
    <footer className="mt-24 flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-8">
      <nav className="flex flex-wrap gap-x-5 gap-y-1">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="t-label text-secondary transition-colors hover:text-accent"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="t-label text-secondary">
        {site.copyrightName} © {new Date().getFullYear()}
      </p>
    </footer>
  );
}
