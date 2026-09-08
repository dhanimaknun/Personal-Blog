import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { verticalDate } from "@/lib/dates";
import type { PostListItem } from "@/lib/posts";

export function PostRow({ post, index }: { post: PostListItem; index: number }) {
  const date = verticalDate(post.publishedAt ?? post.createdAt);
  const iso = new Date(post.publishedAt ?? post.createdAt).toISOString();

  return (
    <article className="border-t border-divider first:border-t-0">
      <Link href={`/${post.slug}`} className="group flex gap-6 py-12 sm:gap-10 sm:py-14">
        {/* vertical date + rule */}
        <time dateTime={iso} className="flex w-14 shrink-0 flex-col items-start">
          <span className="t-date-num text-ink">{date.day}</span>
          <span className="t-date-part mt-2 text-secondary">{date.month}</span>
          <span className="t-date-part mt-1 text-secondary">{date.year}</span>
          <span className="mt-6 w-px flex-1 bg-divider" aria-hidden />
        </time>

        {/* body */}
        <div className="min-w-0 flex-1">
          <h2 className="t-post-title max-w-[640px] text-ink transition-colors duration-200 ease-out group-hover:text-accent">
            {post.title}
          </h2>

          {post.excerpt ? (
            <p className="t-excerpt mt-4 line-clamp-3 max-w-[560px]">{post.excerpt}</p>
          ) : null}

          {post.tags.length > 0 ? (
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2">
              {post.tags.map((tag) => (
                <li key={tag} className="t-tag uppercase text-secondary">
                  #{tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* index + arrow */}
        <div className="hidden shrink-0 flex-col items-end justify-between sm:flex">
          <span className="t-index">{String(index).padStart(2, "0")}</span>
          <ArrowRight
            className="h-[18px] w-[18px] text-ink transition-transform duration-200 ease-out group-hover:translate-x-1.5 group-hover:text-accent"
            strokeWidth={1.5}
          />
        </div>
      </Link>
    </article>
  );
}
