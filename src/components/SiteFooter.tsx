import { site } from "@/lib/site";

const QUOTE = "Life rarely asks to be rushed. It only asks to be lived.";

/** Quiet footer — a quote and the copyright — at the foot of every public page. The menu lives in the masthead. */
export function SiteFooter({ tight = false }: { tight?: boolean }) {
  return (
    <footer
      className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-divider ${
        tight ? "mt-5 pt-4 md:mt-6 md:pt-5" : "mt-24 pt-8"
      }`}
    >
      <p className="t-nav font-normal italic text-ink/80">“{QUOTE}”</p>
      <p className="t-nav font-normal text-secondary">
        {site.copyrightName} © {new Date().getFullYear()}
      </p>
    </footer>
  );
}
