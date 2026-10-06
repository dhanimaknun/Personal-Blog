import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { getSession } from "@/lib/auth";
import { getInvestments, getMarketPrices, todayJakarta } from "@/lib/finance";
import { FinanceDeck } from "@/components/finance/FinanceDeck";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finance Deck",
  robots: { index: false, follow: false },
};

// Admin-only: anyone without a session gets a plain 404, so the page's
// existence isn't advertised.
export default async function FinanceDeckPage() {
  if (!(await getSession())) notFound();

  // Render straight from the database; the client then refreshes market
  // prices in the background and re-values everything when they land.
  const [investments, prices] = await Promise.all([getInvestments(), getMarketPrices()]);

  return (
    <div className="mx-auto max-w-shell px-6 py-12 md:px-12 lg:px-16 lg:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-14">
          <Masthead compact />
        </div>

        <FinanceDeck investments={investments} prices={prices} today={todayJakarta()} />

        <SiteFooter />
      </div>
    </div>
  );
}
