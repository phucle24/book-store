import Link from "next/link";
import type { ArticleSource, ReviewInsight } from "@prisma/client";

type ArticleSourceNoteProps = {
  sources: ArticleSource[];
  reviewInsight?: Pick<ReviewInsight, "reviewCount" | "productRating" | "soldCount"> | null;
};

export function ArticleSourceNote({ sources, reviewInsight }: ArticleSourceNoteProps) {
  const visibleSources = sources
    .filter((source) => source.title || source.domain || source.url)
    .sort((a, b) => a.order - b.order);
  const sourceCount = visibleSources.filter((source) => source.kind !== "BUYER_REVIEWS").length;
  const reviewCount = reviewInsight?.reviewCount || 0;
  const productRating = reviewInsight?.productRating;

  if (!visibleSources.length && !reviewCount) return null;

  return (
    <section className="mt-12 rounded-[2rem] border border-stone-200 bg-stone-50 p-5 text-sm leading-6 text-stone-700">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
        Bài này dựa trên đâu
      </p>
      <p className="mt-3">
        Bài viết được biên tập lại bằng giọng của Trạm Đọc
        {sourceCount ? `, dựa trên ${sourceCount} nguồn tham khảo` : ""}
        {reviewCount
          ? ` và ${reviewCount} đánh giá người mua${productRating ? ` (điểm trung bình ${productRating}/5 trên Shopee)` : ""}`
          : ""}
        . Chúng tôi không copy nguyên văn review người mua và không dùng điểm Shopee làm điểm
        đánh giá biên tập.
      </p>

      {visibleSources.length ? (
        <ol className="mt-4 space-y-2">
          {visibleSources.map((source) => (
            <li key={source.id} className="rounded-2xl bg-white p-3">
              <span className="font-medium text-stone-900">
                {source.domain || source.title}
              </span>
              {source.url ? (
                <>
                  {" · "}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="nofollow noopener"
                    className="text-amber-800 underline decoration-amber-300 underline-offset-4 hover:text-amber-950"
                  >
                    {source.title || source.url}
                  </a>
                </>
              ) : (
                <span> · {source.title}</span>
              )}
              {source.note ? <p className="mt-1 text-xs text-stone-500">{source.note}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}

      <p className="mt-4 text-xs text-stone-500">
        Xem thêm{" "}
        <Link href="/cach-chung-toi-danh-gia" className="font-semibold text-amber-800 hover:text-amber-950">
          cách chúng tôi đánh giá sách
        </Link>
        .
      </p>
    </section>
  );
}
