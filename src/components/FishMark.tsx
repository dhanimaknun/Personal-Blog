/** The two-fish mark. Decorative — transparent PNG, ink-coloured. */
export function FishMark({
  size = 48,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/two-fish.png"
      alt=""
      width={size}
      height={size}
      aria-hidden
      draggable={false}
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
