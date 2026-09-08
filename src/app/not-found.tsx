import Link from "next/link";
import { Masthead } from "@/components/Masthead";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-reading flex-col justify-center px-6 py-24 md:px-12">
      <Masthead compact />
      <p className="mt-24 font-display text-[40px] font-light tracking-[-0.03em] text-ink">
        This page has drifted.
      </p>
      <p className="t-excerpt mt-4 text-secondary">
        The entry you were looking for isn’t here.
      </p>
      <Link
        href="/"
        className="link-underline mt-8 inline-block t-sidebar-item text-accent"
      >
        Back to the journal
      </Link>
    </div>
  );
}
