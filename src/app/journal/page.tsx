import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicShell";
import { PostList } from "@/components/PostList";
import { Sidebar } from "@/components/Sidebar";
import { getPublishedPosts } from "@/lib/posts";
import { site, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Journal",
  description: site.description,
  alternates: { canonical: absoluteUrl("/journal") },
};

export default async function JournalPage() {
  const posts = await getPublishedPosts();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: site.name,
    description: site.description,
    url: absoluteUrl("/journal"),
    author: { "@type": "Person", name: site.author },
    blogPost: posts.slice(0, 20).map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: absoluteUrl(`/${p.slug}`),
      datePublished: (p.publishedAt ?? p.createdAt).toISOString(),
      keywords: p.tags.join(", "),
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PublicShell sidebar={<Sidebar />}>
        <PostList posts={posts} emptyMessage="No entries published yet." />
      </PublicShell>
    </>
  );
}
