import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { highlightChildren } from "@/components/HighlightText";
import { slugify } from "@/lib/slugify";

export function MarkdownRenderer({
  content,
  highlightKeywords = [],
}: {
  content: string;
  highlightKeywords?: string[];
}) {
  const headingIds = new Map<string, number>();

  function nextHeadingId(children: ReactNode) {
    const base = slugify(childrenToText(children));
    const count = (headingIds.get(base) || 0) + 1;
    headingIds.set(base, count);

    return count === 1 ? base : `${base}-${count}`;
  }

  return (
    <div className="article-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h2: ({ children }) => (
            <h2
              id={nextHeadingId(children)}
              className={isDetailedReviewHeading(children) ? "review-detail-heading" : undefined}
            >
              {highlightChildren(children, highlightKeywords)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 id={nextHeadingId(children)}>{highlightChildren(children, highlightKeywords)}</h3>
          ),
          p: ({ children }) => <p>{highlightChildren(children, highlightKeywords)}</p>,
          li: ({ children }) => <li>{highlightChildren(children, highlightKeywords)}</li>,
          blockquote: ({ children }) => (
            <blockquote>{highlightChildren(children, highlightKeywords)}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function isDetailedReviewHeading(children: ReactNode) {
  const text = childrenToText(children).toLocaleLowerCase("vi");
  return (
    text.includes("review chi tiết") ||
    text.includes("góc nhìn sau khi đọc") ||
    text.includes("đánh giá chi tiết")
  );
}

function childrenToText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(childrenToText).join(" ");
  }
  if (isValidElement(children)) {
    const props = children.props as { children?: ReactNode };
    return props.children ? childrenToText(props.children) : "";
  }
  return "";
}
