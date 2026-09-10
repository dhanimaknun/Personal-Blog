import type { Metadata } from "next";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { getSession } from "@/lib/auth";
import { getMediaEntries } from "@/lib/media";
import type { MediaEntry } from "@/lib/media-shared";
import { site, absoluteUrl } from "@/lib/site";
import { AfterHours } from "@/components/after-hours/AfterHours";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "After Hours",
  description: `Everything ${site.author} has been reading, watching, and listening to.`,
  alternates: { canonical: absoluteUrl("/after-hours") },
  openGraph: {
    title: `After Hours — ${site.name}`,
    description: `Everything ${site.author} has been reading, watching, and listening to.`,
    url: absoluteUrl("/after-hours"),
  },
};

export default async function AfterHoursPage() {
  const [session, rows] = await Promise.all([getSession(), getMediaEntries()]);

  const entries: MediaEntry[] = rows.map((e) => ({
    ...e,
    consumedAt: e.consumedAt ? e.consumedAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-shell px-6 py-12 md:px-12 lg:px-16 lg:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-14">
          <Masthead compact />
          <div className="mt-16">
            <p className="t-eyebrow">After Hours</p>
            <h1 className="t-post-title mt-4 max-w-[16ch] text-ink">
              Everything I’ve been into lately.
            </h1>
            <p className="t-excerpt mt-4 max-w-[42ch]">
              A running log of what I read, watch, and keep on loop — with the
              mood it left behind.
            </p>
          </div>
        </div>

        <AfterHours initialEntries={entries} canEdit={Boolean(session)} />

        <SiteFooter />
      </div>
    </div>
  );
}
