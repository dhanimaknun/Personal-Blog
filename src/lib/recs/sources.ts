// Internet sources for After Hours recommendations. Each one turns the taste
// profile into raw candidates; ranking and dedupe happen in ./index.ts.
//
//  BOOK   → Open Library (no key): the author's other books + subject search
//  ANIME  → Kitsu (no key): category search over the profile's top genres
//  SERIES / MOVIE → TMDB (TMDB_API_KEY): "recommendations" for each seed
//  MUSIC  → Deezer (no key): artists related to the ones on loop
//
// Only titles, names, and genre words leave the server — never notes or ratings.

import type { MediaType } from "@/lib/media-shared";
import { normalizeGenre, type Seed, type TasteProfile } from "@/lib/recs/taste";

export type Via = "similar" | "artist" | "author" | "genre";

export type Candidate = {
  key: string; // "<source>:<id>"
  type: MediaType;
  title: string;
  altTitles?: string[];
  creator: string;
  cover: string;
  url: string;
  source: string;
  genres: string[];
  quality: number; // 0–1, the source's own rating / popularity
  via: Via;
  seed: string; // seed title (similar/author/artist) or "romance + fantasy" (genre)
  seedWeight: number;
};

const TIMEOUT_MS = 9000;

async function getJson<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { Accept: "application/json", "User-Agent": "TheJournal/1.0 (After Hours)", ...headers },
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} ${res.status}`);
  return (await res.json()) as T;
}

const q = encodeURIComponent;

/** The profile's top genres as pairs: [a,b], [a,c], [b,c] — each pair is one search. */
function genrePairs(genres: string[]): [string, string][] {
  const [a, b, c] = genres;
  const pairs: [string, string][] = [];
  if (a && b) pairs.push([a, b]);
  if (a && c) pairs.push([a, c]);
  if (b && c) pairs.push([b, c]);
  return pairs;
}

const genreSeedWeight = (profile: TasteProfile, pair: string[]) => {
  const top = profile.genres[0]?.weight || 1;
  const sum = pair.reduce((s, g) => s + (profile.genres.find((x) => x.name === g)?.weight ?? 0), 0);
  return Math.min(3, (sum / top) * 1.5);
};

// ── Books · Open Library ──────────────────────────────────────

type OLDoc = {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  ratings_average?: number;
  subject?: string[];
};

// Library genre → Open Library subject. "drama" is left out on purpose:
// on Open Library it means stage plays.
const OL_SUBJECT: Record<string, string> = {
  romance: "romance",
  fantasy: "fantasy",
  mystery: "mystery",
  thriller: "thriller",
  horror: "horror",
  "sci-fi": "science fiction",
  "coming of age": "coming of age",
  "slice of life": "contemporary",
};

// language:eng still lets through records titled in their original script.
const readable = (d: OLDoc) => /[a-z]/i.test(d.title);

const OL_FIELDS = "key,title,author_name,cover_i,ratings_average,subject";

function fromOpenLibrary(d: OLDoc, via: Via, seed: string, seedWeight: number): Candidate {
  return {
    key: `openlibrary:${d.key}`,
    type: "BOOK",
    title: d.title,
    creator: d.author_name?.[0] ?? "",
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
    url: `https://openlibrary.org${d.key}`,
    source: "openlibrary",
    // Subjects come compound ("Fiction, romance, general", "Fairies--Fiction").
    genres: [...new Set((d.subject ?? []).flatMap((s) => s.split(/,|--/)).map(normalizeGenre))]
      .filter((s) => s && s.length < 20)
      .slice(0, 16),
    quality: d.ratings_average ? Math.min(1, d.ratings_average / 5) : 0.6,
    via,
    seed,
    seedWeight,
  };
}

export async function bookCandidates(profile: TasteProfile, errors: string[]): Promise<Candidate[]> {
  const out: Candidate[] = [];
  const tasks: Promise<void>[] = [];

  // More by the authors you rated well.
  for (const s of profile.seeds.BOOK.filter((s) => s.creator)) {
    tasks.push(
      getJson<{ docs: OLDoc[] }>(
        `https://openlibrary.org/search.json?author=${q(s.creator)}&sort=readinglog&limit=8&fields=${OL_FIELDS}`,
      ).then(({ docs }) => {
        for (const d of docs.filter(readable)) out.push(fromOpenLibrary(d, "author", s.creator, s.weight));
      }),
    );
  }

  // Popular books in your strongest genres — taken from everything you log,
  // not just books, since that's where most of the signal is.
  const subjects = profile.genres.map((g) => g.name).filter((g) => OL_SUBJECT[g]);
  for (const pair of genrePairs(subjects)) {
    const query = pair.map((g) => `subject:"${OL_SUBJECT[g]}"`).join(" ") + " language:eng";
    tasks.push(
      getJson<{ docs: OLDoc[] }>(
        `https://openlibrary.org/search.json?q=${q(query)}&sort=readinglog&limit=12&fields=${OL_FIELDS}`,
      ).then(({ docs }) => {
        for (const d of docs.filter(readable)) out.push(fromOpenLibrary(d, "genre", pair.join(" + "), genreSeedWeight(profile, pair)));
      }),
    );
  }

  await settle(tasks, errors);
  return out;
}

// ── Anime · Kitsu ─────────────────────────────────────────────

type KitsuRes = {
  data: {
    id: string;
    attributes: {
      slug: string;
      canonicalTitle: string;
      titles: Record<string, string | null>;
      averageRating: string | null;
      ageRating: string | null;
      posterImage: { medium?: string; large?: string } | null;
    };
    relationships: {
      categories?: { data?: { id: string }[] };
      animeProductions?: { data?: { id: string }[] };
    };
  }[];
  included?: {
    id: string;
    type: string;
    attributes: { title?: string; name?: string; role?: string };
    relationships?: { producer?: { data?: { id: string } } };
  }[];
};

const KITSU_CATEGORY: Record<string, string> = {
  romance: "romance",
  fantasy: "fantasy",
  drama: "drama",
  mystery: "mystery",
  thriller: "thriller",
  horror: "horror",
  comedy: "comedy",
  "sci-fi": "science-fiction",
  "slice of life": "slice-of-life",
  "coming of age": "coming-of-age",
};

// Sequels only make sense after the first season — recommend the start.
const SEQUEL = /\b(season\s*\d+|\d+(st|nd|rd|th)\s+season|part\s*\d+|ii+|the final|movie\s*\d+)\b|:\s*the movie/i;

// The library has no anime type yet, so anime picks are SERIES from Kitsu and
// get their own "Next anime" tab (see UpNext). The genre pairs come from the
// whole profile — manga and K-drama taste both carry over.
export async function animeCandidates(profile: TasteProfile, errors: string[]): Promise<Candidate[]> {
  const ordered = profile.genres.map((g) => g.name).filter((g) => KITSU_CATEGORY[g]);

  const out: Candidate[] = [];
  await settle(
    genrePairs(ordered).map(async (pair) => {
      const url =
        "https://kitsu.io/api/edge/anime" +
        `?filter[categories]=${pair.map((g) => KITSU_CATEGORY[g]).join(",")}` +
        "&filter[subtype]=TV,movie&sort=-userCount&page[limit]=20" +
        "&include=categories,animeProductions.producer&fields[categories]=title&fields[producers]=name";
      const res = await getJson<KitsuRes>(url, { Accept: "application/vnd.api+json" });
      const byId = new Map((res.included ?? []).map((i) => [`${i.type}:${i.id}`, i]));

      for (const m of res.data) {
        const a = m.attributes;
        const title = a.titles.en || a.canonicalTitle;
        if (a.ageRating === "R18" || SEQUEL.test(title) || SEQUEL.test(a.canonicalTitle)) continue;
        const genres = (m.relationships.categories?.data ?? [])
          .map((c) => byId.get(`categories:${c.id}`)?.attributes.title)
          .filter((t): t is string => Boolean(t))
          .map(normalizeGenre);
        const productions = (m.relationships.animeProductions?.data ?? [])
          .map((p) => byId.get(`animeProductions:${p.id}`))
          .filter((p): p is NonNullable<typeof p> => Boolean(p));
        const studio = [...productions.filter((p) => p.attributes.role === "studio"), ...productions]
          .map((p) => p.relationships?.producer?.data?.id)
          .map((id) => (id ? byId.get(`producers:${id}`)?.attributes.name : undefined))
          .find(Boolean);

        out.push({
          key: `kitsu:anime:${m.id}`,
          type: "SERIES",
          title,
          altTitles: Object.values(a.titles).filter((t): t is string => Boolean(t)).concat(a.canonicalTitle),
          creator: studio ?? "",
          cover: a.posterImage?.large || a.posterImage?.medium || "",
          url: `https://kitsu.app/anime/${a.slug}`,
          source: "kitsu",
          genres,
          quality: a.averageRating ? Number(a.averageRating) / 100 : 0.6,
          via: "genre",
          seed: pair.join(" + "),
          seedWeight: genreSeedWeight(profile, pair),
        });
      }
    }),
    errors,
  );
  return out;
}

// ── Series & movies · TMDB ────────────────────────────────────

type TmdbItem = {
  id: number;
  name?: string;
  title?: string;
  original_name?: string;
  original_title?: string;
  poster_path: string | null;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
};

const TMDB_GENRE: Record<number, string> = {
  28: "action", 12: "adventure", 16: "animation", 35: "comedy", 80: "mystery",
  99: "documentary", 18: "drama", 10751: "family", 14: "fantasy", 36: "history",
  27: "horror", 10402: "music", 9648: "mystery", 10749: "romance", 878: "sci-fi",
  53: "thriller", 10752: "war", 37: "western", 10759: "action", 10765: "fantasy",
  10766: "drama", 10768: "war",
};

export const hasTmdb = () => Boolean(process.env.TMDB_API_KEY);

// Accepts either the v3 "API Key" or the v4 "Read Access Token" (a JWT).
function tmdb<T>(path: string): Promise<T> {
  const key = process.env.TMDB_API_KEY!.trim();
  const isToken = key.startsWith("eyJ");
  const sep = path.includes("?") ? "&" : "?";
  const url = `https://api.themoviedb.org/3${path}${isToken ? "" : `${sep}api_key=${key}`}`;
  return getJson<T>(url, isToken ? { Authorization: `Bearer ${key}` } : {});
}

async function screenFor(seed: Seed, kind: "tv" | "movie"): Promise<Candidate[]> {
  const found = await tmdb<{ results: TmdbItem[] }>(`/search/${kind}?query=${q(seed.title)}`);
  const match = found.results[0];
  if (!match) return [];
  const recs = await tmdb<{ results: TmdbItem[] }>(`/${kind}/${match.id}/recommendations`);

  return recs.results.slice(0, 12).map((r) => ({
    key: `tmdb:${kind}:${r.id}`,
    type: kind === "tv" ? "SERIES" : "MOVIE",
    title: (r.name ?? r.title ?? "").trim(),
    altTitles: [r.original_name, r.original_title].filter((t): t is string => Boolean(t)),
    creator: "",
    cover: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : "",
    url: `https://www.themoviedb.org/${kind}/${r.id}`,
    source: "tmdb",
    genres: [...new Set((r.genre_ids ?? []).map((g) => TMDB_GENRE[g]).filter(Boolean))],
    // Thin vote counts make vote_average noisy; pull those toward the middle.
    quality: r.vote_count && r.vote_count >= 20 ? (r.vote_average ?? 6) / 10 : 0.6,
    via: "similar",
    seed: seed.title,
    seedWeight: seed.weight,
  }));
}

export async function screenCandidates(profile: TasteProfile, errors: string[]): Promise<Candidate[]> {
  if (!hasTmdb()) return [];
  const lists = await settle([
    ...profile.seeds.SERIES.map((s) => screenFor(s, "tv")),
    ...profile.seeds.MOVIE.map((s) => screenFor(s, "movie")),
  ], errors);
  return lists.flat();
}

/** TMDB's recommendation lists carry no people — fill in the creator for the final picks. */
export async function tmdbCreator(key: string): Promise<string> {
  const [, kind, id] = key.split(":");
  if (kind === "tv") {
    const d = await tmdb<{ created_by?: { name: string }[] }>(`/tv/${id}`);
    return d.created_by?.[0]?.name ?? "";
  }
  const d = await tmdb<{ crew?: { job: string; name: string }[] }>(`/movie/${id}/credits`);
  return d.crew?.find((c) => c.job === "Director")?.name ?? "";
}

// ── Music · Deezer ────────────────────────────────────────────

type DeezerArtist = { id: number; name: string; nb_fan?: number };
type DeezerTrack = {
  id: number;
  title: string;
  link: string;
  artist: DeezerArtist;
  album: { cover_medium?: string; cover_big?: string };
};

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Resolve a seed to a Deezer artist through its song — artist-name search alone mixes up acts like EXO. */
async function deezerArtist(seed: Seed): Promise<DeezerArtist | null> {
  const { data } = await getJson<{ data: DeezerTrack[] }>(
    `https://api.deezer.com/search?q=${q(`${seed.creator} ${seed.title}`)}&limit=5`,
  );
  return (data.find((t) => sameName(t.artist.name, seed.creator)) ?? data[0])?.artist ?? null;
}

export async function musicCandidates(
  profile: TasteProfile,
  libraryArtists: string[],
  errors: string[],
): Promise<Candidate[]> {
  const known = new Set(libraryArtists.map((a) => a.toLowerCase()));
  const out: Candidate[] = [];

  await settle(
    profile.seeds.MUSIC.filter((s) => s.creator).map(async (seed) => {
      const artist = await deezerArtist(seed);
      if (!artist) return;
      const { data: related } = await getJson<{ data: DeezerArtist[] }>(
        `https://api.deezer.com/artist/${artist.id}/related?limit=8`,
      );
      await settle(
        related
          .filter((r) => !known.has(r.name.toLowerCase()))
          .slice(0, 6)
          .map(async (r) => {
            const { data: top } = await getJson<{ data: DeezerTrack[] }>(
              `https://api.deezer.com/artist/${r.id}/top?limit=1`,
            );
            const t = top[0];
            if (!t) return;
            out.push({
              key: `deezer:${t.id}`,
              type: "MUSIC",
              title: t.title,
              creator: r.name,
              cover: t.album.cover_big || t.album.cover_medium || "",
              url: t.link,
              source: "deezer",
              genres: [],
              quality: r.nb_fan ? Math.min(1, Math.log10(r.nb_fan) / 7) : 0.6,
              via: "artist",
              seed: seed.creator,
              seedWeight: seed.weight,
            });
          }),
        errors,
      );
    }),
    errors,
  );
  return out;
}

// ── helpers ───────────────────────────────────────────────────

/** Promise.allSettled that keeps the wins and logs the losses — one dead source never sinks the rest. */
async function settle<T>(tasks: Promise<T>[], errors: string[]): Promise<T[]> {
  const results = await Promise.allSettled(tasks);
  const wins: T[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") wins.push(r.value);
    else errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  return wins;
}
