import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

export function HighlightText({
  text,
  keywords,
}: {
  text: string;
  keywords: string[];
}) {
  return <>{highlightString(text, normalizeHighlightKeywords(keywords))}</>;
}

export function highlightChildren(children: ReactNode, keywords: string[]): ReactNode {
  const normalizedKeywords = normalizeHighlightKeywords(keywords);
  if (!normalizedKeywords.length) return children;

  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return highlightString(child, normalizedKeywords);
    }

    if (!isValidElement(child)) return child;

    const props = child.props as { children?: ReactNode };
    if (!props.children) return child;

    return cloneElement(child as ReactElement<{ children?: ReactNode }>, {
      children: highlightChildren(props.children, normalizedKeywords),
    });
  });
}

export function normalizeHighlightKeywords(keywords: string[]) {
  const seen = new Set<string>();

  return keywords
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length >= 3)
    .filter((keyword) => {
      const key = keyword.toLocaleLowerCase("vi");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.length - a.length);
}

function highlightString(text: string, keywords: string[]) {
  if (!keywords.length) return text;

  const pattern = new RegExp(`(${keywords.map(escapeRegExp).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isMatch = keywords.some(
      (keyword) => keyword.toLocaleLowerCase("vi") === part.toLocaleLowerCase("vi"),
    );

    if (!isMatch) return <Fragment key={`${part}-${index}`}>{part}</Fragment>;

    return (
      <mark
        key={`${part}-${index}`}
        className="rounded-md bg-rose-100 px-1 py-0.5 font-semibold text-rose-900 shadow-[inset_0_-0.22em_0_rgba(244,63,94,0.18)]"
      >
        {part}
      </mark>
    );
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
