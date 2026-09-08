import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { verticalDate } from "@/lib/dates";
import type { PostListItem } from "@/lib/posts";

export function PostRow({ post }: { post: PostListItem }) {
  const date = verticalDate(post.publishedAt ?? post.createdAt);
  const iso = new Date(post.publishedAt ?? post.createdAt).toISOString();

  return (
    <article className="border-t border-divider first:border-t-0">
      <Link href={`/${post.slug}`} className="group flex gap-8 py-14 sm:gap-16">
        {/* vertical date */}
        <time
          dateTime={iso}
          className="flex w-16 shrink-0 flex-col items-start leading-none"
        >
          <span className="t-date-num text-ink">{date.day}</span>
          <span className="t-month mt-3 text-ink">{date.month}</span>
          <span className="t-year mt-2">{date.year}</span>
        </time>

        {/* body */}
        <div className="min-w-0 flex-1">
          <h2 className="t-post-title max-w-[720px] text-ink transition-colors duration-200 ease-out group-hover:text-accent">
            {post.title}
          </h2>

          {post.excerpt ? (
            <p className="t-excerpt mt-6 line-clamp-3 max-w-[640px] text-secondary">
              {post.excerpt}
            </p>
          ) : null}

          {post.tags.length > 0 ? (
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
              {post.tags.map((tag) => (
                <li key={tag} className="t-tag text-secondary">
                  #{tag}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* arrow */}
        <div className="hidden shrink-0 items-center self-center sm:flex">
          <ArrowRight
            className="h-[18px] w-[18px] text-secondary transition-transform duration-200 ease-out group-hover:translate-x-1.5 group-hover:text-accent"
            strokeWidth={1.5}
          />
        </div>
      </Link>
    </article>
  );
}
