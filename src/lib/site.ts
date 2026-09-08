// Central place for the few identity strings the journal needs.

export const site = {
  name: "THE JOURNAL",
  // Stylised wordmark shown in the visible header / masthead.
  wordmark: "THE JOURNAL.",
  author: "DHAN",
  byline: "by DHAN",
  description:
    "A minimalist editorial journal. Notes on life, technology, and the things worth slowing down for.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  locale: "en_US",
} as const;

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
