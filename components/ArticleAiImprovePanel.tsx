import type { AiGeneration } from "@prisma/client";
import { improveArticleContentAction } from "@/lib/editorial-actions";

export function ArticleAiImprovePanel({
  articleId,
  generations,
}: {
  articleId: string;
  generations: AiGeneration[];
}) {
  return (
    <section className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            AI editorial
          </p>
          <h2 className="mt-2 text-lg font-semibold text-stone-950">
            Improve content mà không ghi đè bài hiện tại
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">
            AI sẽ đọc bài, sách liên quan, pain point và audience để gợi ý bản
            cải thiện. Kết quả được lưu lại để bạn copy thủ công vào markdown.
          </p>
        </div>
        <form action={improveArticleContentAction}>
          <input type="hidden" name="id" value={articleId} />
          <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900">
            AI Improve Content
          </button>
        </form>
      </div>

      <div className="mt-5 space-y-3">
        {generations.map((generation) => (
          <details
            key={generation.id}
            className="rounded-2xl border border-emerald-100 bg-white p-4"
          >
            <summary className="cursor-pointer text-sm font-semibold text-stone-950">
              {generation.type} · {generation.model} ·{" "}
              {generation.createdAt.toLocaleString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
              })}
            </summary>
            <textarea
              readOnly
              value={generation.outputMarkdown}
              rows={16}
              className="mt-4 w-full rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 font-mono text-sm leading-7 text-stone-700"
            />
          </details>
        ))}
        {!generations.length ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-stone-600">
            Chưa có bản improve nào cho bài này.
          </p>
        ) : null}
      </div>
    </section>
  );
}
