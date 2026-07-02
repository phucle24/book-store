import Link from "next/link";
import {
  getPainJourney,
  selectJourneyArticle,
  selectJourneyBook,
  type JourneyArticleRef,
  type JourneyBookRef,
  type TaxonomyRef,
} from "@/lib/pain-journey";

export function PainJourneyBlock({
  painPoint,
  articles,
  books,
}: {
  painPoint?: TaxonomyRef | null;
  articles: JourneyArticleRef[];
  books: JourneyBookRef[];
}) {
  if (!painPoint) return null;

  const journey = getPainJourney(painPoint);

  return (
    <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-emerald-100 bg-[#f8fbf6] p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
        Mạch đọc theo nỗi đau
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">
        Bạn đang ở đoạn nào của vấn đề này?
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
        {journey.intro}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {journey.states.slice(0, 3).map((state) => {
          const article = selectJourneyArticle(state, articles);
          const book = selectJourneyBook(state, books);

          return (
            <article key={state.id} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
              <h3 className="text-base font-semibold text-stone-950">{state.label}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-700">{state.readerLine}</p>
              <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
                {state.nudge}
              </p>

              <div className="mt-4 space-y-2">
                {article ? (
                  <Link
                    href={`/bai-viet/${article.slug}`}
                    data-intent-event="journey_item_clicked"
                    data-intent-target="article"
                    data-intent-meta={JSON.stringify({
                      state: state.id,
                      articleId: article.id,
                      painPointId: painPoint.id,
                    })}
                    className="block rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm transition hover:border-amber-200 hover:bg-amber-50"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-500">
                      Đọc tiếp
                    </span>
                    <span className="mt-1 line-clamp-2 block font-semibold leading-5 text-stone-950">
                      {article.title}
                    </span>
                  </Link>
                ) : null}

                {book ? (
                  <Link
                    href={`/sach/${book.slug}`}
                    data-intent-event="journey_item_clicked"
                    data-intent-target="book"
                    data-intent-meta={JSON.stringify({
                      state: state.id,
                      bookId: book.id,
                      painPointId: painPoint.id,
                    })}
                    className="block rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-sm transition hover:border-amber-300 hover:bg-amber-50"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
                      Sách gần nhất
                    </span>
                    <span className="mt-1 line-clamp-2 block font-semibold leading-5 text-stone-950">
                      {book.title}
                    </span>
                  </Link>
                ) : (
                  <Link
                    href={`/noi-dau/${painPoint.slug}`}
                    className="block rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm font-semibold text-stone-950 hover:border-amber-200 hover:bg-amber-50"
                  >
                    Xem thêm trong cụm {painPoint.name.toLowerCase()}
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function PainJourneyLanding({
  painPoint,
  articles,
  books,
}: {
  painPoint: TaxonomyRef;
  articles: JourneyArticleRef[];
  books: JourneyBookRef[];
}) {
  const journey = getPainJourney(painPoint);
  const firstArticle = articles[0] || null;
  const firstBook = books[0] || null;
  const secondArticle = articles.find((article) => article.id !== firstArticle?.id) || null;

  return (
    <section className="mt-10 rounded-3xl border border-emerald-100 bg-[#f8fbf6] p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
        Pain journey
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">
        Đi từ cảm giác mơ hồ đến một lựa chọn đọc rõ hơn
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
        {journey.stuckReason}
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        <LandingStep
          step="Bước 1"
          title="Gọi tên vấn đề"
          description={journey.states[0]?.readerLine || journey.intro}
          href={firstArticle ? `/bai-viet/${firstArticle.slug}` : `/noi-dau/${painPoint.slug}`}
          linkLabel={firstArticle?.title || `Đọc về ${painPoint.name.toLowerCase()}`}
        />
        <LandingStep
          step="Bước 2"
          title="Hiểu vì sao mắc kẹt"
          description={journey.stuckReason}
          href={secondArticle ? `/bai-viet/${secondArticle.slug}` : `/noi-dau/${painPoint.slug}`}
          linkLabel={secondArticle?.title || "Xem bài đọc liên quan"}
        />
        <LandingStep
          step="Bước 3"
          title="Chọn sách theo tình huống"
          description={journey.states[1]?.nudge || "Chọn cuốn gần nhất với trạng thái hiện tại."}
          href={firstBook ? `/sach/${firstBook.slug}` : `/noi-dau/${painPoint.slug}`}
          linkLabel={firstBook?.title || "Xem sách phù hợp"}
        />
        <LandingStep
          step="Bước 4"
          title="Đọc trước khi mua"
          description="Xem điểm hạn chế, ai không nên đọc và bài liên quan trước khi click mua."
          href={firstArticle ? `/bai-viet/${firstArticle.slug}` : `/bai-viet`}
          linkLabel="Đọc bài trước khi quyết định"
        />
      </div>
    </section>
  );
}

function LandingStep({
  step,
  title,
  description,
  href,
  linkLabel,
}: {
  step: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
        {step}
      </p>
      <h3 className="mt-2 text-base font-semibold text-stone-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
      <Link
        href={href}
        data-intent-event="journey_item_clicked"
        data-intent-target="taxonomy_step"
        className="mt-4 inline-flex text-sm font-semibold text-amber-900 hover:text-stone-950"
      >
        {linkLabel}
      </Link>
    </article>
  );
}
