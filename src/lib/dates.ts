const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function monthName(month1to12: number): string {
  return MONTHS[Math.max(1, Math.min(12, month1to12)) - 1];
}

/** { day: "08", month: "SEP", year: "2026" } for the vertical date column. */
export function verticalDate(date: Date | string) {
  const d = new Date(date);
  return {
    day: String(d.getUTCDate()).padStart(2, "0"),
    month: MONTHS[d.getUTCMonth()].slice(0, 3).toUpperCase(),
    year: String(d.getUTCFullYear()),
  };
}

export function longDate(date: Date | string): string {
  const d = new Date(date);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function isoDate(date: Date | string): string {
  return new Date(date).toISOString();
}

export function relativeTime(date: Date | string): string {
  const then = new Date(date).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return longDate(date);
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Good evening";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
