// "Up Next" for After Hours: analyse the library, ask the sources, rank, store.
//
// A candidate's score is the sum of what pointed to it — each seed that led
// there adds its weight (a title recommended off two loved shows beats one off
// a single 3-star) — plus how well its genres match the profile and the
// source's own rating. Anything already in the library, or once dismissed or
// added from here, is skipped.

import type { MediaRecommendation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { GENRES, shelfOf, type MediaType } from "@/lib/media-shared";
import {
  buildTasteProfile,
  genreAffinity,
  moodClash,
  shortTitle,
  titleKey,
  type TasteProfile,
} from "@/lib/recs/taste";
import {
  animeCandidates,
  bookCandidates,
  musicCandidates,
  screenCandidates,
  tmdbCreator,
  type Candidate,
  type Via,
} from "@/lib/recs/sources";

export { hasTmdb } from "@/lib/recs/sources";

const PER_SHELF = 6;
const PER_CREATOR = 2;
const PER_SEED = 2; // keeps one loved title from filling a whole row (genre picks are exempt)
const VIA_FACTOR: Record<Via, number> = { similar: 1, artist: 1, author: 0.8, genre: 0.6 };

type Ranked = Candidate & { score: number; seeds: Map<string, Via> };

export function rankCandidates(
  candidates: Candidate[],
  profile: TasteProfile,
  exclude: { titles: Set<string>; keys: Set<string> },
): Ranked[] {
  const merged = new Map<string, Ranked>();
  const keyOf = (c: Candidate) => `${c.type}:${titleKey(c.title)}`;

  for (const c of candidates) {
    if (!c.title || exclude.keys.has(c.key)) continue;
    const titles = [c.title, ...(c.altTitles ?? [])].map(titleKey).filter(Boolean);
    if (titles.some((t) => exclude.titles.has(t))) continue;

    const k = keyOf(c);
    const hit = c.seedWeight * VIA_FACTOR[c.via];
    const prev = merged.get(k);
    if (!prev) {
      merged.set(k, { ...c, score: hit, seeds: new Map([[c.seed, c.via]]) });
    } else if (!prev.seeds.has(c.seed)) {
      prev.score += hit;
      prev.seeds.set(c.seed, c.via);
      prev.genres = [...new Set([...prev.genres, ...c.genres])];
      // A direct "similar" hit explains a pick better than a genre search.
      if (VIA_FACTOR[c.via] > VIA_FACTOR[prev.via]) Object.assign(prev, { via: c.via, seed: c.seed });
    }
  }

  for (const r of merged.values()) {
    r.score += 2 * genreAffinity(r.genres, profile.genres) + r.quality - 2 * moodClash(r.genres, profile.moods);
    r.score = Math.round(r.score * 100) / 100;
  }

  const picked: Ranked[] = [];
  const byShelf = new Map<string, number>();
  const byCreator = new Map<string, number>();
  const bySeed = new Map<string, number>();
  for (const r of [...merged.values()].sort((a, b) => b.score - a.score)) {
    const shelf = shelfOf(r) ?? r.type;
    const n = byShelf.get(shelf) ?? 0;
    const ck = `${r.type}:${r.creator.toLowerCase()}`;
    const cn = r.creator ? byCreator.get(ck) ?? 0 : 0;
    const sk = `${r.type}:${r.seed}`;
    const sn = r.via === "genre" ? 0 : bySeed.get(sk) ?? 0;
    if (n >= PER_SHELF || cn >= PER_CREATOR || sn >= PER_SEED) continue;
    picked.push(r);
    byShelf.set(shelf, n + 1);
    if (r.creator) byCreator.set(ck, cn + 1);
    bySeed.set(sk, sn + 1);
  }
  return picked;
}

/**
 * One line on why this showed up. `used` counts how often each library title
 * has been named so far, so a run of genre picks doesn't all point at one.
 */
export function reasonFor(r: Ranked, profile: TasteProfile, used = new Map<string, number>()): string {
  const seeds = [...r.seeds.entries()].filter(([, via]) => via !== "genre").map(([s]) => shortTitle(s));
  if (r.via === "artist") {
    return seeds.length > 1 ? `Close to ${seeds[0]} and ${seeds[1]}` : `If ${seeds[0]} is on loop`;
  }
  if (r.via === "author") return `More from ${r.seed}`;
  if (r.via === "similar") {
    return seeds.length > 1 ? `Because you loved ${seeds[0]} and ${seeds[1]}` : `Because you loved ${seeds[0]}`;
  }

  // Genre pick: point at the library entry it overlaps most, when there is a clear one.
  const mine = new Set(r.genres);
  // Anime borrows from manga taste as well as series.
  const pool = r.source === "kitsu" ? [...profile.seeds[r.type], ...profile.seeds.MANGA] : profile.seeds[r.type];
  const best = pool
    .map((s) => ({ s, overlap: s.genres.filter((g) => g !== "fiction" && mine.has(g)).length }))
    .filter((x) => x.overlap >= 2 && x.s.weight >= 1.5)
    .sort((a, b) => (used.get(a.s.title) ?? 0) - (used.get(b.s.title) ?? 0) || b.overlap - a.overlap || b.s.weight - a.s.weight)[0];
  if (best) {
    used.set(best.s.title, (used.get(best.s.title) ?? 0) + 1);
    return `If you liked ${shortTitle(best.s.title)}`;
  }
  return `For your ${r.seed} streak`;
}

export type RefreshResult = { counts: Partial<Record<MediaType, number>>; errors: string[]; profile: TasteProfile };

export async function refreshRecommendations(): Promise<RefreshResult> {
  const [entries, settled] = await Promise.all([
    prisma.mediaEntry.findMany(),
    prisma.mediaRecommendation.findMany({ where: { status: { not: "SUGGESTED" } }, select: { key: true } }),
  ]);

  const profile = buildTasteProfile(entries);
  const errors: string[] = [];
  const lists = await Promise.all([
    bookCandidates(profile, errors),
    animeCandidates(profile, errors),
    screenCandidates(profile, errors),
    musicCandidates(profile, entries.filter((e) => e.type === "MUSIC").map((e) => e.creator), errors),
  ]);

  const ranked = rankCandidates(lists.flat(), profile, {
    titles: new Set(entries.map((e) => titleKey(e.title))),
    keys: new Set(settled.map((s) => s.key)),
  });

  await Promise.allSettled(
    ranked
      .filter((r) => r.source === "tmdb" && !r.creator)
      .map(async (r) => {
        r.creator = await tmdbCreator(r.key);
      }),
  );

  const used = new Map<string, number>();
  const rows = ranked.map((r) => ({
    key: r.key,
    type: r.type,
    title: r.title.slice(0, 200),
    creator: r.creator.slice(0, 160),
    cover: r.cover,
    url: r.url,
    source: r.source,
    genres: r.genres.slice(0, 8),
    reason: reasonFor(r, profile, used),
    score: r.score,
  }));

  // A source that failed outright leaves its shelf's old picks in place rather than blanking it.
  const fresh = [...new Map(rows.map((r) => [`${r.type}:${r.source}`, { type: r.type, source: r.source }])).values()];
  await prisma.$transaction([
    prisma.mediaRecommendation.deleteMany({ where: { status: "SUGGESTED", OR: fresh } }),
    prisma.mediaRecommendation.createMany({ data: rows, skipDuplicates: true }),
  ]);

  const counts: RefreshResult["counts"] = {};
  for (const r of rows) counts[r.type] = (counts[r.type] ?? 0) + 1;
  if (errors.length) console.error("[recs]", errors);
  return { counts, errors, profile };
}

export async function getRecommendations(): Promise<MediaRecommendation[]> {
  return prisma.mediaRecommendation.findMany({
    where: { status: "SUGGESTED" },
    orderBy: [{ type: "asc" }, { score: "desc" }],
  });
}

/** "Plan it": copy the pick into the library as PLANNED and retire it from Up Next. */
export async function addRecommendation(id: string) {
  const rec = await prisma.mediaRecommendation.findUnique({ where: { id } });
  if (!rec) throw Object.assign(new Error("Recommendation not found"), { status: 404 });
  const [entry] = await prisma.$transaction([
    prisma.mediaEntry.create({
      data: {
        type: rec.type,
        title: rec.title,
        creator: rec.creator,
        cover: rec.cover,
        // Source tags are noisy ("young adult fiction"); keep the library's own words.
        genres: rec.genres.filter((g) => GENRES.includes(g)),
        status: "PLANNED",
      },
    }),
    prisma.mediaRecommendation.update({ where: { id }, data: { status: "ADDED" } }),
  ]);
  return entry;
}

export async function dismissRecommendation(id: string) {
  const rec = await prisma.mediaRecommendation.findUnique({ where: { id } });
  if (!rec) throw Object.assign(new Error("Recommendation not found"), { status: 404 });
  await prisma.mediaRecommendation.update({ where: { id }, data: { status: "DISMISSED" } });
}
