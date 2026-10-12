"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

/** The section links in the header; the current section reads in ink. */
export function SiteNav({ links }: { links: NavLink[] }) {
  const pathname = usePathname();
  const current = (href: string) =>
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    // posts and their archives belong to the journal
    (href === "/journal" && /^\/(archive|tags|search)(\/|$)/.test(pathname));

  return (
    <nav aria-label="Sections" className="thin-scroll -mx-1 flex gap-x-5 overflow-x-auto px-1 md:mx-0 md:gap-x-6 md:overflow-visible md:px-0">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={current(l.href) ? "page" : undefined}
          className={`t-nav shrink-0 whitespace-nowrap transition-colors hover:text-accent ${
            current(l.href) ? "text-ink" : "text-secondary"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
