"use client";

import { useEffect, useState } from "react";

type TocItem = {
  id: string;
  title: string;
  level: number;
};

export function ArticleTableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (items.length < 3) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-18% 0px -70% 0px", threshold: [0, 1] },
    );

    for (const item of items) {
      const element = document.getElementById(item.id);
      if (element) observer.observe(element);
    }

    return () => observer.disconnect();
  }, [items]);

  if (items.length < 3) return null;

  return (
    <nav className="my-8 rounded-3xl border border-amber-100 bg-amber-50/70 p-5 lg:sticky lg:top-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Trong bài này
      </p>
      <div className="mt-3 grid gap-2 text-sm leading-6">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={
              `${item.level === 3 ? "ml-4" : "font-medium"} ${
                activeId === item.id
                  ? "text-amber-900"
                  : item.level === 3
                    ? "text-stone-600 hover:text-amber-900"
                    : "text-stone-800 hover:text-amber-900"
              }`
            }
          >
            {item.title}
          </a>
        ))}
      </div>
    </nav>
  );
}
