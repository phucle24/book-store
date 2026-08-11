import Link from "next/link";
import type { Book, PainPoint } from "@prisma/client";
import { BookCard } from "@/components/BookCard";

type ReadNextArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
};

type ReadNextProps = {
  painPoint?: PainPoint | null;
  featuredArticle?: ReadNextArticle | null;
  secondaryArticles: ReadNextArticle[];
  books: Book[];
};

export function ReadNext({
  painPoint,
  featuredArticle,
  secondaryArticles,
  books,
}: ReadNextProps) {
  const secondary = dedupeArticles(
    secondaryArticles.filter((article) => article.id !== featuredArticle?.id),
  ).slice(0, 4);
  const visibleBooks = books.slice(0, 2);

  if (!featuredArticle && !secondary.length && !visibleBooks.length) return null;

  return (
    <section className="mx-auto mt-10 max-w-4xl rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Đọc tiếp theo trạng thái của bạn
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">
        Nếu bạn muốn đi thêm một bước nhỏ
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        {painPoint
          ? `Những gợi ý dưới đây tiếp tục xoay quanh "${painPoint.name}", nhưng đi theo hướng dễ đọc hơn: hiểu thêm, thử một góc nhìn khác, rồi mới cân nhắc mua sách.`
          : "Những gợi ý dưới đây giúp bạn đọc tiếp mà không phải chọn quá nhiều hướng cùng lúc."}
      </p>

      {featuredArticle ? (
        <Link
          href={`/bai-viet/${featuredArticle.slug}`}
          data-intent-event="read_next_featured_clicked"
          data-intent-target="article"
          data-intent-meta={JSON.stringify({ articleId: featuredArticle.id })}
          className="mt-5 block rounded-3xl border border-amber-200 bg-amber-50 p-5 transition hover:-translate-y-0.5 hover:bg-amber-100"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
            Bài nên đọc tiếp
          </span>
          <span className="mt-2 block text-xl font-semibold leading-snug text-stone-950">
            {featuredArticle.title}
          </span>
          <span className="mt-2 line-clamp-2 block text-sm leading-6 text-stone-700">
            {featuredArticle.excerpt}
          </span>
        </Link>
      ) : null}

      {secondary.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {secondary.map((article) => (
            <Link
              key={article.id}
              href={`/bai-viet/${article.slug}`}
              data-intent-event="read_next_secondary_clicked"
              data-intent-target="article"
              data-intent-meta={JSON.stringify({ articleId: article.id })}
              className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm transition hover:border-amber-200 hover:bg-amber-50"
            >
              <span className="font-semibold leading-snug text-stone-950">
                {article.title}
              </span>
              <span className="mt-2 line-clamp-2 block text-xs leading-5 text-stone-600">
                {article.excerpt}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      {visibleBooks.length ? (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-stone-950">
            Sách có thể cân nhắc sau khi đọc
          </h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {visibleBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function dedupeArticles(articles: ReadNextArticle[]) {
  const seen = new Set<string>();
  return articles.filter((article) => {
    if (seen.has(article.id)) return false;
    seen.add(article.id);
    return true;
  });
}
