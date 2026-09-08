export function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-divider bg-white p-5">
      <p className="font-display text-[32px] font-light tabular-nums leading-none tracking-[-0.02em] text-ink">
        {value}
      </p>
      <p className="mt-2 text-[13px] text-secondary">{label}</p>
    </div>
  );
}
