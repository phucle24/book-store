type TocItem = {
  id: string;
  title: string;
  level: number;
};

export function ArticleTableOfContents({ items }: { items: TocItem[] }) {
  if (items.length < 3) return null;

  return (
    <nav className="my-8 rounded-3xl border border-amber-100 bg-amber-50/70 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Trong bài này
      </p>
      <div className="mt-3 grid gap-2 text-sm leading-6">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={
              item.level === 3
                ? "ml-4 text-stone-600 hover:text-amber-900"
                : "font-medium text-stone-800 hover:text-amber-900"
            }
          >
            {item.title}
          </a>
        ))}
      </div>
    </nav>
  );
}
