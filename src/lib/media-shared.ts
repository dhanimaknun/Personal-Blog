// Client-safe media constants + pure helpers (no Prisma import).

export type MediaType = "BOOK" | "MOVIE" | "SERIES" | "MANGA" | "MUSIC";
export type MediaStatus = "PLANNED" | "ONGOING" | "COMPLETED" | "DROPPED";

export type MediaEntry = {
  id: string;
  type: MediaType;
  title: string;
  creator: string;
  cover: string;
  rating: number;
  genres: string[];
  moods: string[];
  status: MediaStatus;
  notes: string;
  favorite: boolean;
  consumedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const MEDIA_TYPES: MediaType[] = ["BOOK", "MOVIE", "SERIES", "MANGA", "MUSIC"];
export const MEDIA_STATUSES: MediaStatus[] = ["PLANNED", "ONGOING", "COMPLETED", "DROPPED"];

export const TYPE_LABEL: Record<MediaType, string> = {
  BOOK: "Book",
  MOVIE: "Movie",
  SERIES: "Series",
  MANGA: "Manga",
  MUSIC: "Music",
};

export const STATUS_LABEL: Record<MediaStatus, string> = {
  PLANNED: "Planned",
  ONGOING: "In progress",
  COMPLETED: "Completed",
  DROPPED: "Dropped",
};

export const CREATOR_LABEL: Record<MediaType, string> = {
  BOOK: "Author",
  MOVIE: "Director",
  SERIES: "Creator",
  MANGA: "Author",
  MUSIC: "Artist",
};

export const GENRES = [
  "fiction", "non-fiction", "sci-fi", "fantasy", "mystery", "thriller",
  "romance", "drama", "horror", "slice of life", "documentary", "coming of age",
];

export const MOODS = [
  "comforting", "melancholic", "healing", "existential", "chaotic",
  "cozy", "intense", "nostalgic", "hopeful", "bittersweet",
];

export type MediaStats = {
  total: number;
  byType: { type: MediaType; count: number }[];
  favorites: number;
  completed: number;
  avgRating: number;
  thisYear: number;
  topMoods: { mood: string; count: number }[];
};

export function computeStats(entries: MediaEntry[]): MediaStats {
  const year = new Date().getUTCFullYear();
  const rated = entries.filter((e) => e.rating > 0);
  const moodCounts = new Map<string, number>();
  for (const e of entries) for (const m of e.moods) moodCounts.set(m, (moodCounts.get(m) ?? 0) + 1);

  return {
    total: entries.length,
    byType: MEDIA_TYPES.map((type) => ({
      type,
      count: entries.filter((e) => e.type === type).length,
    })).filter((t) => t.count > 0),
    favorites: entries.filter((e) => e.favorite).length,
    completed: entries.filter((e) => e.status === "COMPLETED").length,
    avgRating: rated.length
      ? Math.round((rated.reduce((s, e) => s + e.rating, 0) / rated.length) * 10) / 10
      : 0,
    thisYear: entries.filter((e) => {
      const d = new Date(e.consumedAt ?? e.createdAt);
      return d.getUTCFullYear() === year;
    }).length,
    topMoods: [...moodCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([mood, count]) => ({ mood, count })),
  };
}
