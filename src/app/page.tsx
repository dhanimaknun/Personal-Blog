import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { AfterHoursCard, FinanceCard, GoogleCard, JournalCard } from "@/components/FrontDesk";
import { getSession } from "@/lib/auth";
import { greetingForHour } from "@/lib/dates";
import { getAfterHoursPeek, getFinancePeek, getGooglePeek, getJournalPeek, jakartaNow } from "@/lib/front-desk";
import { site, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

const name = site.author.charAt(0) + site.author.slice(1).toLowerCase();

/**
 * The front desk: a greeting and one card per section. Visitors see the
 * public sections; a logged-in session also gets the private ones.
 */
export default async function FrontDeskPage() {
  const session = await getSession();
  const [journal, afterHours, finance, google] = await Promise.all([
    getJournalPeek(),
    getAfterHoursPeek(),
    session ? getFinancePeek() : Promise.resolve(null),
    session ? getGooglePeek() : Promise.resolve(null),
  ]);
  const { hour, date } = jakartaNow();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    description: site.description,
    url: site.url,
    author: { "@type": "Person", name: site.author },
    hasPart: [
      { "@type": "Blog", name: "Journal", url: absoluteUrl("/journal") },
      { "@type": "WebPage", name: "After Hours", url: absoluteUrl("/after-hours") },
    ],
  };

  return (
    // One screen on any viewport that `fits` (≥768 wide, ≥640 tall): the page
    // is exactly the viewport tall and the card grid takes what height is
    // left. Phones and very short windows scroll normally instead.
    <div className="mx-auto flex min-h-dvh max-w-shell flex-col px-5 py-6 fits:h-dvh fits:min-h-0 fits:overflow-hidden md:px-12 md:py-8 lg:px-16 md:xtall:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col fits:min-h-0">
        <div className="flex shrink-0 items-center justify-between gap-4">
          <Masthead compact />
          <p className="t-eyebrow hidden sm:block">{date}</p>
        </div>

        <header className="mt-8 shrink-0 md:mt-10 md:xtall:mt-16">
          <p className="t-eyebrow sm:hidden">{date}</p>
          <h1 className="mt-2 font-display text-[32px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:mt-0 md:text-[44px] md:xtall:text-[56px]">
            {greetingForHour(hour)}
            {session ? `, ${name}` : ""}
            <span className="text-accent">.</span>
          </h1>
          <p className="t-excerpt mt-2 hidden max-w-[48ch] md:tall:block xtall:mt-3">{site.intro}</p>
        </header>

        <div
          className={`mt-6 grid flex-1 grid-cols-1 gap-3 md:mt-8 fits:min-h-0 md:grid-cols-3 md:gap-4 md:xtall:mt-10 ${
            session ? "md:grid-rows-2" : "md:grid-rows-1"
          }`}
        >
          {/* visitors: Journal + After Hours on one tall row.
              admin: Journal · After Hours / Essential · Finance Deck */}
          <JournalCard n={1} peek={journal} roomy={!session} />
          <AfterHoursCard n={2} peek={afterHours} />
          {session && google ? <GoogleCard n={3} peek={google} /> : null}
          {session ? <FinanceCard n={4} peek={finance} /> : null}
        </div>

        <SiteFooter tight />
      </div>
    </div>
  );
}
