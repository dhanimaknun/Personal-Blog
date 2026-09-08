import { getSession } from "@/lib/auth";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-divider py-3.5 last:border-b-0">
      <span className="text-[13px] text-secondary">{label}</span>
      <span className="text-[14px] text-ink">{value}</span>
    </div>
  );
}

export default async function SettingsPage() {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-2xl px-8 py-14">
      <h1 className="font-display text-[28px] font-medium tracking-tight text-ink">Settings</h1>

      <section className="mt-8 rounded-lg border border-divider bg-white px-5">
        <Row label="Signed in as" value={session?.username ?? "—"} />
        <Row label="Journal name" value={site.name} />
        <Row label="Author" value={site.author} />
        <Row label="Site URL" value={site.url} />
      </section>

      <div className="mt-8 rounded-lg border border-divider bg-white p-5 text-[13px] leading-relaxed text-secondary">
        <p className="font-medium text-ink">Changing these values</p>
        <p className="mt-2">
          Identity strings live in <code className="text-ink">src/lib/site.ts</code>. Login
          credentials come from the <code className="text-ink">ADMIN_USERNAME</code> and{" "}
          <code className="text-ink">ADMIN_PASSWORD_HASH</code> environment variables — generate a
          new hash with <code className="text-ink">npm run hash -- &quot;new-password&quot;</code>.
        </p>
      </div>
    </div>
  );
}
