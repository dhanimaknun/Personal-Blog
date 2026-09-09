/** The two-fish mark. Decorative — transparent PNG, ink-coloured.
 *  Pass `size` for a fixed pixel size, or `className` with sizing utilities
 *  (e.g. `h-24 w-24 sm:h-28 sm:w-28`) for a responsive size. */
export function FishMark({
  size,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const dim = size ?? 48;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/two-fish.png"
      alt=""
      width={dim}
      height={dim}
      aria-hidden
      draggable={false}
      className={`select-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}
