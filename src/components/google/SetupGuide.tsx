"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Card } from "@/components/finance/ui";

/** Step-by-step setup for the Apps Script, with the code ready to copy. */
export function SetupGuide({
  code,
  manifest,
  syncUrl,
  configured,
  isLocal,
}: {
  code: string;
  manifest: string;
  syncUrl: string;
  configured: boolean;
  isLocal: boolean;
}) {
  return (
    <Card className="p-6 sm:p-8">
      <h2 className="font-display text-[20px] font-semibold tracking-[-0.01em] text-ink">Connect your Google account</h2>
      <p className="mt-1 max-w-[60ch] text-[14px] leading-relaxed text-secondary">
        A small Google Apps Script runs in your own account every hour. It reads your calendar and searches Gmail for
        receipts — read-only — and sends the results here. About five minutes, once.
      </p>

      {isLocal ? (
        <p className="mt-4 rounded-xl bg-accent/[0.06] px-4 py-3 text-[13px] leading-relaxed text-ink">
          You’re on <span className="font-mono">{new URL(syncUrl).host}</span>. Google can’t reach your computer, so open
          this page on your <strong>live site</strong> to copy a script that points there.
        </p>
      ) : null}

      <ol className="mt-6 space-y-6">
        <Step n={1} title="Create the shared secret" done={configured}>
          {configured ? (
            <>GOOGLE_SYNC_SECRET is set on this server. Keep its value handy for step 4.</>
          ) : (
            <>
              In a terminal run <Mono>openssl rand -hex 32</Mono>. Put the result in <Mono>.env</Mono> as{" "}
              <Mono>GOOGLE_SYNC_SECRET=&quot;…&quot;</Mono> and in Vercel → Settings → Environment Variables, then
              redeploy.
            </>
          )}
        </Step>

        <Step n={2} title="Make a new Apps Script project">
          Open{" "}
          <a href="https://script.google.com/home/projects/create" target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
            script.google.com
          </a>{" "}
          while signed in to the Google account you want to read, and name the project “The Journal sync”.
        </Step>

        <Step n={3} title="Paste the manifest and the code">
          <span className="block">
            Project Settings (gear) → tick <em>Show “appsscript.json” manifest file</em>. Back in the editor, replace
            <Mono>appsscript.json</Mono> with:
          </span>
          <CodeBlock text={manifest} />
          <span className="mt-3 block">
            Then replace everything in <Mono>Code.gs</Mono> with:
          </span>
          <CodeBlock text={code} tall />
        </Step>

        <Step n={4} title="Add the secret to the script">
          Project Settings → Script Properties → Add script property: name <Mono>SYNC_SECRET</Mono>, value = your{" "}
          <Mono>GOOGLE_SYNC_SECRET</Mono>.
        </Step>

        <Step n={5} title="Run install() once">
          In the editor pick <Mono>install</Mono> in the function menu and press Run. Google asks you to allow read-only
          access to Gmail and Calendar — it shows “Google hasn’t verified this app” because the app is yours: choose
          Advanced → Go to The Journal sync. It syncs right away and then every hour.
        </Step>
      </ol>
    </Card>
  );
}

function Step({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold ${
          done ? "bg-gain text-white" : "bg-canvas text-ink ring-1 ring-divider"
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : n}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        <div className="mt-1 text-[13.5px] leading-relaxed text-secondary">{children}</div>
      </div>
    </li>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[12px] text-ink">{children}</code>;
}

function CodeBlock({ text, tall }: { text: string; tall?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative mt-2">
      <pre
        className={`thin-scroll overflow-auto rounded-xl bg-[#1D1D1F] p-4 font-mono text-[11.5px] leading-relaxed text-[#E8E6E1] ${
          tall ? "max-h-72" : "max-h-48"
        }`}
      >
        {text}
      </pre>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard blocked — the text is selectable */
          }
        }}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white backdrop-blur transition-colors hover:bg-white/20"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
