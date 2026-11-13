// Client-safe taste analysis over the After Hours library (no Prisma import).
//
// Every entry gets a weight from how it landed: rating, favorite, and status.
// Loved things pull hard, a dropped one pushes away. Genres, moods, and
// creators inherit those weights, and the strongest entries per type become
// the "seeds" the sources look up recommendations for.

import type { MediaType, MediaStatus } from "@/lib/media-shared";

export type TasteInput = {
  type: MediaType;
  title: string;
  creator: string;
  rating: number;
  genres: string[];
  moods: string[];
  status: MediaStatus;
  favorite: boolean;
};

export type Weighted = { name: string; weight: number };

export type Seed = { type: MediaType; title: string; creator: string; genres: string[]; weight: number };

export type TasteProfile = {
  genres: Weighted[]; // across every type, strongest first
  moods: Weighted[];
  creators: Weighted[];
  seeds: Record<MediaType, Seed[]>;
};

const STATUS_WEIGHT: Record<MediaStatus, number> = {
  COMPLETED: 0.5,
  ONGOING: 0.3,
  PLANNED: 0,
  DROPPED: -1.5,
};

/** How much one entry says about taste. Unrated entries count a little. */
export function entryWeight(e: TasteInput): number {
  const fromRating = e.rating > 0 ? e.rating - 2.5 : 0.5;
  return fromRating + (e.favorite ? 1.5 : 0) + STATUS_WEIGHT[e.status];
}

function rank(map: Map<string, number>): Weighted[] {
  return [...map.entries()]
    .filter(([, w]) => w > 0)
    .map(([name, weight]) => ({ name, weight: Math.round(weight * 100) / 100 }))
    .sort((a, b) => b.weight - a.weight);
}

const SEEDS_PER_TYPE = 4;

export function buildTasteProfile(entries: TasteInput[]): TasteProfile {
  const genres = new Map<string, number>();
  const moods = new Map<string, number>();
  const creators = new Map<string, number>();
  const seeds: Record<MediaType, Seed[]> = { BOOK: [], MOVIE: [], SERIES: [], MANGA: [], MUSIC: [] };

  for (const e of entries) {
    const w = entryWeight(e);
    for (const g of e.genres) genres.set(g, (genres.get(g) ?? 0) + w);
    for (const m of e.moods) moods.set(m, (moods.get(m) ?? 0) + w);
    if (e.creator) creators.set(e.creator, (creators.get(e.creator) ?? 0) + w);
    if (w > 0) seeds[e.type].push({ type: e.type, title: e.title, creator: e.creator, genres: e.genres, weight: w });
  }

  for (const t of Object.keys(seeds) as MediaType[]) {
    seeds[t] = seeds[t].sort((a, b) => b.weight - a.weight).slice(0, SEEDS_PER_TYPE);
  }

  // "fiction" is on nearly everything, so it says nothing about taste.
  genres.delete("fiction");

  return { genres: rank(genres), moods: rank(moods), creators: rank(creators), seeds };
}

/** 0–1: how well a candidate's genres line up with the profile's top genres. */
export function genreAffinity(candidate: string[], profile: Weighted[]): number {
  if (!candidate.length || !profile.length) return 0;
  const top = profile.slice(0, 6);
  const max = top.reduce((s, g) => s + g.weight, 0);
  const have = new Set(candidate.map(normalizeGenre));
  const hit = top.reduce((s, g) => s + (have.has(g.name) ? g.weight : 0), 0);
  return max > 0 ? hit / max : 0;
}

// Source genre names → the library's lowercase vocabulary.
const GENRE_ALIASES: Record<string, string> = {
  "science fiction": "sci-fi",
  "science-fiction": "sci-fi",
  "sci-fi & fantasy": "fantasy",
  "slice-of-life": "slice of life",
  "coming-of-age": "coming of age",
  "romantic comedy": "romance",
  "action & adventure": "action",
  crime: "mystery",
  suspense: "thriller",
};

export function normalizeGenre(g: string): string {
  const v = g.trim().toLowerCase();
  return GENRE_ALIASES[v] ?? v;
}

// Tags that fight a soft profile. When most of the mood weight is on the
// gentle side, picks carrying these are pushed down (not removed).
const SOFT_MOODS = new Set(["comforting", "cozy", "healing", "hopeful", "nostalgic"]);
const DARK_TAGS = new Set(["horror", "gore", "dark", "dark romance", "psychological", "vampire", "demon", "erotica", "spicy", "violence"]);

/** 0–1: how much a candidate's tags clash with a mostly gentle mood profile. */
export function moodClash(candidate: string[], moods: Weighted[]): number {
  const total = moods.reduce((s, m) => s + m.weight, 0);
  if (!total) return 0;
  const soft = moods.reduce((s, m) => s + (SOFT_MOODS.has(m.name) ? m.weight : 0), 0) / total;
  if (soft < 0.4) return 0;
  const dark = candidate.map(normalizeGenre).filter((g) => DARK_TAGS.has(g)).length;
  return Math.min(1, dark / 2) * soft;
}

/** Shortens long titles for a one-line reason. */
export function shortTitle(title: string, max = 32): string {
  return title.length <= max ? title : `${title.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

/** Loose title key for "is this already in the library?" checks. */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(season|s)\s*\d+\b/g, "")
    .replace(/[^a-z0-9]+/g, "");
}
