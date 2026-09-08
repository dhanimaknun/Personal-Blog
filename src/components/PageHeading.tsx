export function PageHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mt-16">
      <p className="t-eyebrow">{eyebrow}</p>
      <h1 className="t-post-title mt-4 text-ink">{title}</h1>
    </div>
  );
}
