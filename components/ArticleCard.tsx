import type { Article, Category, PainPoint } from "@prisma/client";
import Link from "next/link";

type ArticleCardData = Article & {
  categories?: Category[];
  painPoints?: PainPoint[];
};

export function ArticleCard({ article }: { article: ArticleCardData }) {
  const tag = article.painPoints?.[0] || article.categories?.[0];

  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {tag ? (
        <Link
          href={`/noi-dau/${tag.slug}`}
          className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800"
        >
          {tag.name}
        </Link>
      ) : null}
      <h3 className="mt-3 text-xl font-semibold leading-snug text-stone-950">
        <Link href={`/bai-viet/${article.slug}`} className="hover:text-amber-900">
          {article.title}
        </Link>
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-600">
        {article.excerpt}
      </p>
      <div className="mt-5 flex items-center justify-between text-sm text-stone-500">
        <span>{article.readingTime} phút đọc</span>
        <Link href={`/bai-viet/${article.slug}`} className="font-medium text-stone-950">
          Đọc tiếp
        </Link>
      </div>
    </article>
  );
}
