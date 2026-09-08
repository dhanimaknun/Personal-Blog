import Link from "next/link";
import { Masthead } from "@/components/Masthead";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-reading flex-col justify-center px-6 py-20">
      <Masthead compact />
      <p className="mt-16 font-display text-[40px] font-light tracking-tight text-ink">
        This page has drifted.
      </p>
      <p className="mt-4 text-[16px] text-secondary">
        The entry you were looking for isn’t here.
      </p>
      <Link
        href="/"
        className="mt-8 inline-block text-[15px] text-accent transition-opacity hover:opacity-70"
      >
        Back to the journal
      </Link>
    </div>
  );
}
