import { PostRow } from "@/components/PostRow";
import type { PostListItem } from "@/lib/posts";

export function PostList({
  posts,
  emptyMessage = "Nothing here yet.",
}: {
  posts: PostListItem[];
  emptyMessage?: string;
}) {
  if (posts.length === 0) {
    return <p className="t-excerpt py-16 text-secondary">{emptyMessage}</p>;
  }

  return (
    <div>
      {posts.map((post) => (
        <PostRow key={post.id} post={post} />
      ))}
    </div>
  );
}
