import { Masthead } from "@/components/Masthead";

/**
 * The journal's page frame: centred, max 1400px, page padding 24 / 48 / 80,
 * a fixed 280px sidebar next to a flexible reading column on desktop that
 * collapses to a single column with the sidebar underneath below `lg`.
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
    <div className="mx-auto max-w-shell px-6 py-16 md:px-12 lg:px-20 lg:py-24">
      <div className="mx-auto max-w-[1164px]">
        <div className="mb-24">
          <Masthead compact={compactMasthead} />
          {header}
        </div>

        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
          <main className="min-w-0">{children}</main>
          <div>{sidebar}</div>
        </div>
      </div>
    </div>
  );
}
