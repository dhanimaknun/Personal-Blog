import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpLeft } from "lucide-react";
import { Markdown } from "@/components/Markdown";
import { Masthead } from "@/components/Masthead";
import { getAdjacentPosts, getPublishedPostBySlug } from "@/lib/posts";
import { longDate } from "@/lib/dates";
import { site, absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) return { title: "Not found" };

  const url = absoluteUrl(`/${post.slug}`);
  const published = (post.publishedAt ?? post.createdAt).toISOString();

  return {
    title: post.title,
    description: post.excerpt || site.description,
    keywords: post.tags,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt || site.description,
      url,
      publishedTime: published,
      modifiedTime: post.updatedAt.toISOString(),
      authors: [site.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt || site.description,
    },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPublishedPostBySlug(params.slug);
  if (!post) notFound();

  const { previous, next } = await getAdjacentPosts(post);
  const published = post.publishedAt ?? post.createdAt;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt || site.description,
    datePublished: published.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Person", name: site.author },
    publisher: { "@type": "Organization", name: site.name },
    mainEntityOfPage: absoluteUrl(`/${post.slug}`),
    keywords: post.tags.join(", "),
    wordCount: post.content.split(/\s+/).filter(Boolean).length,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-reading px-6 py-16 md:px-12 lg:py-24">
        <div className="mb-24">
          <Masthead compact />
        </div>

        <article>
          <header className="mb-16">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 t-tag text-secondary">
              <time dateTime={published.toISOString()}>{longDate(published)}</time>
              <span aria-hidden>·</span>
              <span>{post.readingTime} min read</span>
            </div>
            <h1 className="t-post-title mt-6 max-w-[720px] text-ink">{post.title}</h1>
          </header>

          <Markdown>{post.content}</Markdown>

          {post.tags.length > 0 ? (
            <ul className="mt-16 flex flex-wrap gap-x-6 gap-y-2">
              {post.tags.map((tag) => (
                <li key={tag} className="t-tag">
                  <Link
                    href={`/tags/${tag}`}
                    className="text-secondary transition-colors duration-200 ease-out hover:text-accent hover:underline"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </article>

        <nav className="mt-24 border-t border-divider pt-14">
          <div className="grid gap-8 sm:grid-cols-2">
            <div>
              {previous ? (
                <Link href={`/${previous.slug}`} className="group block">
                  <span className="flex items-center gap-2 t-eyebrow">
                    <ArrowLeft
                      className="h-[18px] w-[18px] transition-transform duration-200 ease-out group-hover:-translate-x-1.5"
                      strokeWidth={1.5}
                    />
                    Previous
                  </span>
                  <span className="mt-3 block font-display text-[18px] font-normal leading-snug text-ink transition-colors duration-200 ease-out group-hover:text-accent">
                    {previous.title}
                  </span>
                </Link>
              ) : null}
            </div>
            <div className="sm:text-right">
              {next ? (
                <Link href={`/${next.slug}`} className="group block">
                  <span className="flex items-center gap-2 t-eyebrow sm:justify-end">
                    Next
                    <ArrowRight
                      className="h-[18px] w-[18px] transition-transform duration-200 ease-out group-hover:translate-x-1.5"
                      strokeWidth={1.5}
                    />
                  </span>
                  <span className="mt-3 block font-display text-[18px] font-normal leading-snug text-ink transition-colors duration-200 ease-out group-hover:text-accent">
                    {next.title}
                  </span>
                </Link>
              ) : null}
            </div>
          </div>

          <Link
            href="/"
            className="group mt-14 inline-flex items-center gap-2 t-tag text-secondary transition-colors duration-200 ease-out hover:text-accent"
          >
            <ArrowUpLeft
              className="h-[18px] w-[18px] transition-transform duration-200 ease-out group-hover:-translate-x-1 group-hover:-translate-y-1"
              strokeWidth={1.5}
            />
            Back to the journal
          </Link>
        </nav>
      </div>
    </>
  );
}
