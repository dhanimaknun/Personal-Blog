import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Masthead } from "@/components/Masthead";
import { SiteFooter } from "@/components/SiteFooter";
import { GoogleApps } from "@/components/google/GoogleApps";
import { getSession } from "@/lib/auth";
import { appsScriptCode, appsScriptManifest } from "@/lib/apps-script";
import { todayJakarta } from "@/lib/finance-shared";
import { getAgenda, getRecentPayments, getSubscriptions, getSyncState, syncConfigured } from "@/lib/google";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Google Apps",
  robots: { index: false, follow: false },
};

// Admin-only, like the Finance Deck: anyone else gets a plain 404.
export default async function GoogleAppsPage() {
  if (!(await getSession())) notFound();

  const [events, subscriptions, payments, sync] = await Promise.all([
    getAgenda(),
    getSubscriptions(),
    getRecentPayments(),
    getSyncState(),
  ]);
  const syncUrl = absoluteUrl("/api/google/sync");
  const host = new URL(syncUrl).hostname;

  return (
    <div className="mx-auto max-w-shell px-6 py-12 md:px-12 lg:px-16 lg:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-14">
          <Masthead compact />
        </div>

        <GoogleApps
          today={todayJakarta()}
          events={events}
          subscriptions={subscriptions}
          payments={payments}
          sync={sync}
          setup={{
            code: appsScriptCode(syncUrl),
            manifest: appsScriptManifest(),
            syncUrl,
            configured: syncConfigured(),
            isLocal: host === "localhost" || host === "127.0.0.1",
          }}
        />

        <SiteFooter />
      </div>
    </div>
  );
}
