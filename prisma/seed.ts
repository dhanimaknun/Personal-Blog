import { PrismaClient } from "@prisma/client";
import { autoExcerpt, readingTime, slugify } from "../src/lib/text";

const prisma = new PrismaClient();

type Seed = {
  title: string;
  tags: string[];
  publishedAt: string | null;
  status: "DRAFT" | "PUBLISHED";
  content: string;
};

const POSTS: Seed[] = [
  {
    title: "On keeping a journal that outlives the app",
    tags: ["writing", "life"],
    publishedAt: "2026-09-02",
    status: "PUBLISHED",
    content: `A journal is not a product. It has no roadmap, no changelog, no growth target.

It is a place to think slowly, in complete sentences, about things that don't
resolve in a single sitting.

## Why plain text

The format matters less than the habit, but plain text has a quiet advantage:
it will still open in forty years. No proprietary reader, no account, no
migration.

> The best tool is the one that disappears while you use it.

- Write first, arrange later.
- One idea per entry.
- Date everything.

That's the whole system.`,
  },
  {
    title: "The interface should disappear",
    tags: ["design", "technology"],
    publishedAt: "2026-08-19",
    status: "PUBLISHED",
    content: `Good software design is mostly subtraction. You remove chrome until only the
content remains, then you remove a little more.

\`\`\`ts
// before
<Card shadow rounded gradient badge cta>...</Card>

// after
<article>...</article>
\`\`\`

When the interface disappears, attention has somewhere to go.`,
  },
  {
    title: "A week of walking without headphones",
    tags: ["life", "health"],
    publishedAt: "2026-07-11",
    status: "PUBLISHED",
    content: `I left the headphones at home for seven days. Here is what came back:

1. The sound of the city has a rhythm.
2. Ideas arrive when the input stops.
3. Boredom is a doorway, not a wall.

Nothing dramatic. Just a slightly wider morning.`,
  },
  {
    title: "Notes on typography for long reading",
    tags: ["design", "typography"],
    publishedAt: "2026-06-28",
    status: "PUBLISHED",
    content: `A few settings that make text comfortable for an evening, not a glance:

| Setting        | Value        |
| -------------- | ------------ |
| Measure        | ~70 chars    |
| Line height    | 1.7 – 1.8    |
| Paragraph gap  | 1 line       |

The goal is to make the reader forget they are reading a screen.`,
  },
  {
    title: "Why I stopped chasing inbox zero",
    tags: ["work", "life"],
    publishedAt: "2025-12-15",
    status: "PUBLISHED",
    content: `Inbox zero treats a queue of other people's priorities as a personal
scoreboard. I now check twice a day and let the rest wait.

The world did not end. Mostly it did not notice.`,
  },
  {
    title: "Building THE JOURNAL",
    tags: ["technology", "journal", "meta"],
    publishedAt: "2025-11-03",
    status: "PUBLISHED",
    content: `This site is a small full-stack app: Next.js on the front, Prisma and Postgres
behind it, a JWT-guarded writing room at \`/admin\`.

- [x] Markdown editor with autosave
- [x] Draft → publish workflow
- [x] Archive and tag filtering
- [ ] Learn to publish more often

That last one is not a code problem.`,
  },
  {
    title: "Untitled Draft",
    tags: [],
    publishedAt: null,
    status: "DRAFT",
    content: `Some loose thoughts for later…`,
  },
];

async function main() {
  for (const seed of POSTS) {
    const slug = slugify(seed.title) || `entry-${Date.now()}`;
    await prisma.post.upsert({
      where: { slug },
      update: {},
      create: {
        title: seed.title,
        slug,
        content: seed.content,
        excerpt: autoExcerpt(seed.content),
        tags: seed.tags,
        status: seed.status,
        readingTime: readingTime(seed.content),
        publishedAt: seed.publishedAt ? new Date(`${seed.publishedAt}T09:00:00Z`) : null,
      },
    });
    console.log(`  ✓ ${seed.title}`);
  }
}

main()
  .then(() => console.log("\nSeed complete.\n"))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
