import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Markdown } from "@/components/Markdown";
import { longDate } from "@/lib/dates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function PreviewPage({ params }: { params: { id: string } }) {
  if (!(await getSession())) notFound();

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post) notFound();

  const date = post.publishedAt ?? post.updatedAt;

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-divider bg-[#fffbe6] px-6 py-2 text-[12px] text-ink">
        <span className="font-semibold uppercase tracking-[0.14em]">
          Preview · {post.status.toLowerCase()}
        </span>
        <Link href={`/admin/posts/${post.id}`} className="text-accent hover:opacity-70">
          Back to editor
        </Link>
      </div>

      <article className="mx-auto max-w-reading px-6 py-16">
        <div className="flex items-center gap-3 text-[14px] text-secondary">
          <time>{longDate(date)}</time>
          <span aria-hidden>·</span>
          <span>{post.readingTime} min read</span>
        </div>
        <h1 className="mt-5 font-display text-[40px] font-semibold leading-[1.1] tracking-tight text-ink sm:text-[52px]">
          {post.title}
        </h1>
        <div className="mt-12">
          <Markdown>{post.content || "_Nothing written yet._"}</Markdown>
        </div>
        {post.tags.length > 0 ? (
          <ul className="mt-16 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-secondary">
            {post.tags.map((t) => (
              <li key={t}>#{t}</li>
            ))}
          </ul>
        ) : null}
      </article>
    </>
  );
}
