import Link from "next/link";
import type { JourneyArticleRef, JourneyBookRef, TaxonomyRef } from "@/lib/pain-journey";

export function NextSmallStep({
  painPoint,
  nextArticle,
  book,
}: {
  painPoint?: TaxonomyRef | null;
  nextArticle?: JourneyArticleRef | null;
  book?: JourneyBookRef | null;
}) {
  if (!painPoint && !nextArticle && !book) return null;

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Một bước nhỏ
      </p>
      <h2 className="mt-2 text-xl font-semibold text-stone-950">
        Nếu bạn chỉ muốn chọn một bước nhỏ hôm nay...
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Link
          href="/bai-viet-da-luu"
          data-intent-event="small_step_clicked"
          data-intent-target="saved_articles"
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm transition hover:border-amber-200 hover:bg-amber-50"
        >
          <span className="font-semibold text-stone-950">Lưu lại để đọc chậm</span>
          <span className="mt-2 block leading-6 text-stone-600">
            Nếu bài này chạm đúng giai đoạn của bạn, đừng ép mình quyết định ngay.
          </span>
        </Link>

        <Link
          href={nextArticle ? `/bai-viet/${nextArticle.slug}` : painPoint ? `/noi-dau/${painPoint.slug}` : "/bai-viet"}
          data-intent-event="small_step_clicked"
          data-intent-target="next_article"
          className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm transition hover:border-emerald-200 hover:bg-white"
        >
          <span className="font-semibold text-stone-950">Đọc một góc nhìn khác</span>
          <span className="mt-2 line-clamp-3 block leading-6 text-stone-600">
            {nextArticle?.title || `Đi tiếp trong cụm ${painPoint?.name.toLowerCase() || "bài viết"}.`}
          </span>
        </Link>

        <Link
          href={book ? `/sach/${book.slug}` : painPoint ? `/noi-dau/${painPoint.slug}` : "/sach"}
          data-intent-event="small_step_clicked"
          data-intent-target="book"
          className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm transition hover:border-amber-200 hover:bg-white"
        >
          <span className="font-semibold text-stone-950">Xem sách phù hợp</span>
          <span className="mt-2 line-clamp-3 block leading-6 text-stone-600">
            {book?.title || "Chọn cuốn gần với vấn đề hiện tại trước khi mua."}
          </span>
        </Link>
      </div>
    </section>
  );
}
