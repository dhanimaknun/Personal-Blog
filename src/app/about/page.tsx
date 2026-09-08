import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { Markdown } from "@/components/Markdown";
import { site, absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${site.name} and ${site.author}.`,
  alternates: { canonical: absoluteUrl("/about") },
};

// Edit this copy to introduce yourself.
const ABOUT = `
${site.name} is a quiet place to think in public — written and kept by ${site.author}.

It is about the things worth slowing down for: how software is made, how a day
is spent, and the small design decisions that add up to a life.

No newsletter pop-ups. No trackers. Just writing.
`;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-reading px-6 py-14 sm:py-20">
      <div className="mb-16">
        <Masthead compact />
      </div>
      <h1 className="mb-10 font-display text-[36px] font-semibold tracking-tight text-ink sm:text-[48px]">
        About
      </h1>
      <Markdown>{ABOUT.trim()}</Markdown>
    </div>
  );
}
