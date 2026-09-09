import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import "highlight.js/styles/github.css";

/**
 * Turns `++text++` into an underline. Runs on the mdast tree so no raw
 * HTML is ever parsed — the output stays XSS-safe.
 */
function remarkUnderline() {
  const walk = (node: any) => {
    if (!node.children) return;
    const out: any[] = [];
    for (const child of node.children) {
      if (child.type === "text" && child.value.includes("++")) {
        const parts = child.value.split(/\+\+([^+\n]+)\+\+/g);
        parts.forEach((part: string, i: number) => {
          if (i % 2 === 1) {
            out.push({
              type: "emphasis",
              data: { hName: "u" },
              children: [{ type: "text", value: part }],
            });
          } else if (part) {
            out.push({ type: "text", value: part });
          }
        });
      } else {
        walk(child);
        out.push(child);
      }
    }
    node.children = out;
  };
  return (tree: any) => walk(tree);
}

/**
 * Renders trusted Markdown (written by the admin) to styled HTML.
 * Raw HTML in the source is NOT rendered — react-markdown escapes it by
 * default, keeping the output XSS-safe.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-journal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkUnderline]}
        rehypePlugins={[rehypeSlug, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          a: ({ href, children }) => {
            const external = href?.startsWith("http");
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {children}
              </a>
            );
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
