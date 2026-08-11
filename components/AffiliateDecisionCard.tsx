import Link from "next/link";
import type { Book } from "@prisma/client";
import { AffiliateButton } from "@/components/AffiliateButton";
import { BookCover } from "@/components/BookCover";
import { DisclosureBox } from "@/components/DisclosureBox";

type ReadBeforeBuyingArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
};

export function AffiliateDecisionCard({
  book,
  trackingSlug,
  readBeforeBuying = [],
}: {
  book: Book;
  trackingSlug?: string | null;
  readBeforeBuying?: ReadBeforeBuyingArticle[];
}) {
  const buyIf = compactList([...book.suitableFor, ...book.pros]).slice(0, 3);
  const waitIf = compactList([...book.notSuitableFor, ...book.cons]).slice(0, 3);
  const bestFitReaders = compactList([
    ...book.suitableFor,
    ...book.keyLessons.map((lesson) => `Muốn đọc để hiểu thêm về: ${lesson}`),
  ]).slice(0, 4);

  return (
    <section className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
      <div className="grid gap-5 bg-gradient-to-br from-amber-50 via-[#fffaf2] to-rose-50 p-5 sm:p-6 md:grid-cols-[5.5rem_1fr]">
        <BookCover
          title={book.title}
          coverImage={book.coverImage}
          className="relative flex h-32 w-24 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 via-stone-100 to-emerald-100 px-3 text-center text-xs font-semibold text-stone-700"
        />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            Trước khi bấm mua
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">
            {book.title} có đáng để bạn cân nhắc lúc này không?
          </h2>
          <p className="mt-3 text-sm leading-7 text-stone-700">
            Nếu bài viết này đúng với giai đoạn của bạn, hãy xem quyết định mua
            như một bước đọc tiếp, không phải một lời hứa rằng sách sẽ thay đổi mọi
            thứ.
          </p>
        </div>
      </div>

      {bestFitReaders.length ? (
        <div className="border-t border-stone-100 px-5 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-stone-950">
            Cuốn này hợp nhất với kiểu người đọc nào?
          </h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {bestFitReaders.map((item) => (
              <div key={item} className="rounded-2xl border border-stone-200 bg-white/80 px-3 py-2 text-sm leading-6 text-stone-700">
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 border-t border-stone-100 p-5 sm:p-6 md:grid-cols-2">
        <DecisionList title="Nên mua nếu..." items={buyIf} tone="good" />
        <DecisionList title="Chưa nên mua nếu..." items={waitIf} tone="careful" />
      </div>

      {readBeforeBuying.length ? (
        <div className="border-t border-stone-100 px-5 py-5 sm:px-6">
          <h3 className="text-sm font-semibold text-stone-950">
            Nếu còn phân vân, đọc bài này trước
          </h3>
          <div className="mt-3 grid gap-3">
            {readBeforeBuying.slice(0, 2).map((article) => (
              <Link
                key={article.id}
                href={`/bai-viet/${article.slug}`}
                data-intent-event="decision_read_before_buying_clicked"
                data-intent-target="article"
                data-intent-meta={JSON.stringify({ articleId: article.id })}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm transition hover:border-amber-200 hover:bg-amber-50"
              >
                <span className="font-semibold text-stone-950">{article.title}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-600">
                  {article.excerpt}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="border-t border-amber-100 bg-amber-50/70 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <AffiliateButton
            trackingSlug={trackingSlug}
            label="Xem giá trên Shopee"
            size="lg"
            fullWidth
          />
          <DisclosureBox />
        </div>
      </div>
    </section>
  );
}

function DecisionList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "careful";
}) {
  if (!items.length) return null;

  return (
    <div
      className={`rounded-2xl border p-4 ${
        tone === "good"
          ? "border-emerald-100 bg-emerald-50"
          : "border-stone-200 bg-stone-50"
      }`}
    >
      <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function compactList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}
