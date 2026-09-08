import { Masthead } from "@/components/Masthead";

/**
 * The journal's canonical page frame: centred, max 1400px, a 75/25 two
 * column split on desktop that collapses to a single column with the
 * sidebar underneath on tablet and mobile.
 */
export function PublicShell({
  children,
  sidebar,
  header,
  compactMasthead = false,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  header?: React.ReactNode;
  compactMasthead?: boolean;
}) {
  return (
    <div className="mx-auto min-h-screen max-w-shell px-6 py-14 sm:px-10 sm:py-20 lg:px-16">
      <div className="mb-14 sm:mb-20">
        <Masthead compact={compactMasthead} />
        {header}
      </div>

      <div className="grid grid-cols-1 gap-x-16 gap-y-20 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <main className="min-w-0">{children}</main>
        <div className="lg:pt-2">{sidebar}</div>
      </div>
    </div>
  );
}
