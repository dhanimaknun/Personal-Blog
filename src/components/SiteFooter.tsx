import Link from "next/link";
import { getSession } from "@/lib/auth";
import { site } from "@/lib/site";

const LINKS = [
  { href: "/journal", label: "Journal" },
  { href: "/after-hours", label: "After Hours" },
  { href: "/finance-deck", label: "Finance Deck", adminOnly: true },
  { href: "/essential", label: "Essential", adminOnly: true },
  { href: "/about", label: "About" },
];

/** Quiet footer — a small nav and the copyright — at the foot of every public page. */
export async function SiteFooter({ tight = false }: { tight?: boolean }) {
  const session = await getSession();
  const links = LINKS.filter((l) => !l.adminOnly || session);

  return (
    <footer
      className={`flex flex-wrap items-center justify-between gap-3 border-t border-divider ${
        tight ? "mt-5 pt-4 md:mt-6 md:pt-5" : "mt-24 pt-8"
      }`}
    >
      <nav className="flex flex-wrap gap-x-5 gap-y-1">
        {links.map((l) => (
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
