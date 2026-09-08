import { Masthead } from "@/components/Masthead";

/**
 * Page frame: centred, max 1400px, page padding 24 / 48 / 64, a fixed
 * ~280px sidebar (with a hairline divider) next to a flexible reading
 * column on desktop; single column below `lg`.
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
    <div className="mx-auto max-w-shell px-6 py-12 md:px-12 lg:px-16 lg:py-16">
      <div className="mx-auto max-w-[1180px]">
        <div className={header ? "mb-16" : "mb-14"}>
          <Masthead compact={compactMasthead} />
          {header}
        </div>

        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-0">
          <main className="min-w-0 lg:pr-16">{children}</main>
          <div className="lg:border-l lg:border-divider lg:pl-14">{sidebar}</div>
        </div>
      </div>
    </div>
  );
}
