# THE JOURNAL — by DHAN

A minimalist editorial journal. Content is the product; the interface disappears.

Built to feel like an Apple writing application that happens to be a blog:
a typography-first public site, and a calm `/admin` writing room behind a login.

---

## Stack

| Layer      | Choice                                                        |
| ---------- | ------------------------------------------------------------ |
| Framework  | Next.js 14 (App Router) · React · TypeScript                 |
| Styling    | Tailwind CSS · Framer Motion · Lucide icons                  |
| Data       | Prisma ORM · PostgreSQL (Supabase)                           |
| API        | Next.js Route Handlers — a Node.js REST API, one deployable  |
| Auth       | JWT session cookie (`jose`) · bcrypt password hash            |
| Security   | Rate limiting · same-origin checks · security headers · Zod  |

> The spec listed a standalone Express server. This build uses Next.js Route
> Handlers instead — the same REST surface (`/api/...`, Node runtime, Prisma)
> in a single app that deploys to GitHub → Vercel with no second service.

---

## 1. Install

```bash
npm install
```

## 2. Environment

`.env` is already wired to your Supabase database. Confirm these keys exist
(see `.env.example` for the full list):

- `DATABASE_URL` — Supabase pooled connection (port 6543)
- `DIRECT_URL` — Supabase direct connection (port 5432), used by `prisma db push`
- `SESSION_SECRET` — `openssl rand -base64 32`
- `ADMIN_USERNAME` / `ADMIN_PASSWORD_HASH`
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` locally; your domain in prod

Set your admin password:

```bash
npm run hash -- "your-real-password"
# paste the printed value into ADMIN_PASSWORD_HASH in .env
```

> **`.env` gotcha:** Next.js expands `$` in `.env` files, so a bcrypt hash must
> have every `$` escaped as `\$` — e.g. `ADMIN_PASSWORD_HASH="\$2a\$12\$..."`.
> On Vercel's dashboard, paste the raw hash with real `$` (no escaping there).
>
> Temporary dev login: **`dhan` / `changeme-dhan`** — change it before deploying.

## 3. Create the schema + seed

```bash
npm run db:push     # creates the Post / PostVersion tables in Supabase
npm run db:seed     # optional: a handful of example entries
```

## 4. Run

```bash
npm run dev
```

- `http://localhost:3000` — the journal
- `http://localhost:3000/admin` — the writing room (redirects to `/admin/login`)

---

## Deploy (GitHub + Vercel + Supabase)

1. **Push to GitHub.** `.env` is gitignored — your secrets stay local.
   ```bash
   git init && git add -A && git commit -m "THE JOURNAL"
   git branch -M main
   git remote add origin git@github.com:<you>/the-journal.git
   git push -u origin main
   ```
2. **Import the repo at [vercel.com](https://vercel.com).**
3. **Add environment variables** in the Vercel project settings — the same keys
   as `.env`, but set `NEXT_PUBLIC_SITE_URL` to your production URL.
4. **Deploy.** The build runs `prisma generate && next build`.
5. **One-time:** push the schema to Supabase from your machine (pointed at the
   same `DATABASE_URL`): `npm run db:push`.

---

## Project structure

```
prisma/
  schema.prisma          Post + PostVersion models (enum status, soft delete)
  seed.ts                example entries
src/
  middleware.ts          guards /admin and mutating /api routes (JWT)
  lib/
    session.ts           edge-safe JWT sign/verify (used by middleware)
    auth.ts              cookie helpers + credential check (bcrypt)
    prisma.ts            Prisma client singleton
    posts.ts             public read queries (feed, archive, tags, search)
    post-actions.ts      mutations: draft, publish, soft-delete, duplicate,
                         version snapshots, restore, stats
    text.ts              slug / reading time / excerpt / tag helpers
    api.ts               route-handler helpers (auth, validation, errors)
    rate-limit.ts        in-memory limiter
    site.ts              journal identity strings — edit here
  components/
    Masthead, PublicShell, PostList, PostRow, Sidebar, ArchiveNav, Markdown
    admin/  AdminSidebar, Editor, AdminPostList, RowActions, StatTile, ...
  app/
    page.tsx                     home — masthead + post list + sidebar
    [slug]/page.tsx              a single entry (800px, prev/next, SEO + JSON-LD)
    tags/[tag]/page.tsx          tag filter
    archive/[year]/[month]       archive by month (and /archive/[year])
    search/page.tsx              search
    about/page.tsx               about (edit the copy inline)
    robots.ts · sitemap.ts · feed.xml/route.ts    SEO + RSS
    admin/
      login/                     sign-in
      (workspace)/               everything behind auth
        page.tsx                 dashboard — "Good morning, DHAN."
        posts · drafts · published · archive · trash · settings
        posts/[id]/page.tsx      the Markdown editor
      preview/[id]/page.tsx      full-page draft preview
    api/
      auth/login · auth/logout · auth/me
      posts (GET list / POST draft)
      posts/[id] (GET / PUT / DELETE soft-delete, ?hard=1 purge)
      posts/[id]/{publish,unpublish,archive,restore,duplicate}
      posts/[id]/versions  ·  posts/[id]/versions/[versionId]/restore
      post/[slug]           public single-entry read
      archive · tags · search · stats
```

---

## The editor

`/admin/posts/[id]` — Markdown with live split preview.

- Autosave every 5s (silent) + `⌘S` / `Ctrl+S` to save a version snapshot
- Word / character counters, reading time
- Auto slug from the title (while a draft), auto excerpt (`✦` to regenerate)
- Undo / redo (`⌘Z` / `⌘⇧Z`) over an in-session history
- Version history drawer with one-click restore
- Publish / unpublish / duplicate / move to trash
- GFM: tables, task lists, code blocks with syntax highlighting, quotes, lists

## Post lifecycle

`DRAFT → PUBLISHED → ARCHIVED`, with a separate soft-delete (`deletedAt`) that
powers **Trash**. Nothing is destroyed until you choose *Delete permanently*.

---

## Customising

- **Identity** (name, author, description, URL): `src/lib/site.ts`
- **About copy**: `src/app/about/page.tsx`
- **Colour + type tokens**: `tailwind.config.ts` and `src/app/globals.css`
- **Reading width / line height**: `.prose-journal` in `globals.css`
