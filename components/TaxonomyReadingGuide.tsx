import Link from "next/link";
import type { Article, Book, Category, PainPoint } from "@prisma/client";
import { ArticleCard } from "@/components/ArticleCard";
import { BookCard } from "@/components/BookCard";

type ArticleWithTags = Article & {
  categories: Category[];
  painPoints: PainPoint[];
};

type BookWithPain = Book & {
  painPoints: PainPoint[];
};

export function TaxonomyReadingGuide({
  name,
  articles,
  books,
  pillar,
}: {
  name: string;
  articles: ArticleWithTags[];
  books: BookWithPain[];
  pillar: ArticleWithTags | null;
}) {
  const firstArticle = pillar || articles[0] || null;
  const secondArticle = articles.find((article) => article.id !== firstArticle?.id) || null;
  const thirdArticle =
    articles.find(
      (article) => article.id !== firstArticle?.id && article.id !== secondArticle?.id,
    ) || null;

  return (
    <section className="mt-10 rounded-3xl border border-amber-100 bg-[#fffaf2] p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Nên bắt đầu từ đâu?
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">
        Một mạch đọc nhẹ cho chủ đề {name.toLowerCase()}
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-700">
        Bạn không cần đọc tất cả trong một lần. Hãy bắt đầu bằng bài giúp gọi
        tên vấn đề, sau đó chọn một cuốn sách gần với hoàn cảnh của mình, rồi
        quay lại đọc sâu hơn khi cần.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <GuideStep
          eyebrow="Bước 1"
          title="Nhận diện vấn đề"
          article={firstArticle}
          fallback="Chọn bài gần nhất với cảm giác hiện tại của bạn."
        />
        <GuideStep
          eyebrow="Bước 2"
          title="Chọn một cuốn gần với mình"
          book={books[0]}
          fallback="Khi chưa chắc nên mua gì, hãy đọc phần điểm hạn chế trước."
        />
        <GuideStep
          eyebrow="Bước 3"
          title="Đọc tiếp để có góc nhìn khác"
          article={secondArticle || thirdArticle}
          fallback="Quay lại sau khi bạn đã có câu hỏi rõ hơn."
        />
      </div>
    </section>
  );
}

export function TaxonomyContentSections({
  articles,
  books,
}: {
  articles: ArticleWithTags[];
  books: BookWithPain[];
}) {
  const awarenessArticles = articles.slice(0, 3);
  const actionArticles = articles.slice(3, 6);

  return (
    <>
      <section className="mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Chọn sách
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              Sách phù hợp nhất
            </h2>
          </div>
        </div>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>

      <section className="mt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
          Đọc tiếp
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">
          Bài giúp bạn hiểu vấn đề rõ hơn
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {awarenessArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      {actionArticles.length ? (
        <section className="mt-12">
          <h2 className="text-2xl font-semibold text-stone-950">
            Bài đọc tiếp theo khi bạn muốn hành động
          </h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {actionArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

function GuideStep({
  eyebrow,
  title,
  article,
  book,
  fallback,
}: {
  eyebrow: string;
  title: string;
  article?: ArticleWithTags | null;
  book?: BookWithPain | null;
  fallback: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-base font-semibold text-stone-950">{title}</h3>
      {article ? (
        <Link
          href={`/bai-viet/${article.slug}`}
          className="mt-3 block rounded-2xl border border-stone-200 bg-stone-50 p-3 hover:border-amber-200 hover:bg-amber-50"
        >
          <span className="text-sm font-semibold text-stone-950">{article.title}</span>
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-600">
            {article.excerpt}
          </span>
        </Link>
      ) : book ? (
        <Link
          href={`/sach/${book.slug}`}
          className="mt-3 block rounded-2xl border border-stone-200 bg-stone-50 p-3 hover:border-amber-200 hover:bg-amber-50"
        >
          <span className="text-sm font-semibold text-stone-950">{book.title}</span>
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-600">
            {book.description}
          </span>
        </Link>
      ) : (
        <p className="mt-3 text-sm leading-6 text-stone-600">{fallback}</p>
      )}
    </div>
  );
}
