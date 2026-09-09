import { site } from "@/lib/site";

/** dhanimaknun © 2026 — quiet, at the foot of every public page. */
export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-divider pt-8">
      <p className="t-label text-secondary">
        {site.copyrightName} © {new Date().getFullYear()}
      </p>
    </footer>
  );
}
