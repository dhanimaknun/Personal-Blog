import { site } from "@/lib/site";

/** "THE JOURNAL" with a terracotta full stop. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      {site.name}
      <span className="text-accent">.</span>
    </span>
  );
}
