import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { verticalDate } from "@/lib/dates";
import type { PostListItem } from "@/lib/posts";

export function PostRow({ post }: { post: PostListItem }) {
  const date = verticalDate(post.publishedAt ?? post.createdAt);

  return (
    <article className="border-t border-divider first:border-t-0">
      <Link
        href={`/${post.slug}`}
        className="group flex gap-6 py-10 sm:gap-10 sm:py-12"
      >
        {/* vertical date */}
        <time
          dateTime={new Date(post.publishedAt ?? post.createdAt).toISOString()}
          className="flex w-12 shrink-0 flex-col items-start font-sans text-[13px] font-medium uppercase leading-tight tracking-wide text-secondary"
        >
          <span className="text-[18px] font-semibold text-ink">{date.day}</span>
          <span>{date.month}</span>
          <span>{date.year}</span>
        </time>

        {/* body */}
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[28px] font-semibold leading-[1.12] tracking-tight text-ink transition-colors duration-200 group-hover:text-accent sm:text-[40px] lg:text-[48px]">
            {post.title}
          </h2>

          {post.excerpt ? (
            <p className="mt-4 line-clamp-3 max-w-[60ch] text-[16px] leading-[1.7] text-secondary">
              {post.excerpt}
            </p>
          ) : null}

          {post.tags.length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-secondary">
              {post.tags.map((tag) => (
                <li key={tag}>#{tag}</li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* arrow */}
        <div className="hidden shrink-0 items-center self-center sm:flex">
          <ArrowRight
            className="h-5 w-5 text-secondary transition-all duration-200 group-hover:translate-x-1.5 group-hover:text-accent"
            strokeWidth={1.5}
          />
        </div>
      </Link>
    </article>
  );
}
