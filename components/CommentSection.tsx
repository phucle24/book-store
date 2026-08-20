"use client";

import { useActionState, useState, useTransition } from "react";
import { submitCommentAction, upvoteCommentAction } from "@/lib/comment-actions";

export interface CommentItem {
  id: string;
  name: string;
  content: string;
  rating: number | null;
  badge: string | null;
  helpfulCount: number;
  createdAt: Date | string;
}

const BADGES = [
  "Đã đọc xong",
  "Đã mua sách",
  "Đang cân nhắc",
  "Người yêu sách",
];

export function CommentSection({
  articleId,
  bookId,
  initialComments = [],
  averageRating = 5,
  totalReviews = 0,
}: {
  articleId?: string;
  bookId?: string;
  initialComments?: CommentItem[];
  averageRating?: number;
  totalReviews?: number;
}) {
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [selectedRating, setSelectedRating] = useState<number>(5);
  const [selectedBadge, setSelectedBadge] = useState<string>("Đã đọc xong");
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [upvotedIds, setUpvotedIds] = useState<Record<string, boolean>>({});
  const [, startTransition] = useTransition();

  const [state, formAction, isPending] = useActionState(async (prev: any, formData: FormData) => {
    const res = await submitCommentAction(prev, formData);
    if (res.success) {
      // Optimistic append if approved
      const newComment: CommentItem = {
        id: `temp-${Date.now()}`,
        name: formData.get("name")?.toString() || "Bạn đọc",
        content: formData.get("content")?.toString() || "",
        rating: Number(formData.get("rating")) || 5,
        badge: formData.get("badge")?.toString() || null,
        helpfulCount: 0,
        createdAt: new Date(),
      };
      setComments((prev) => [newComment, ...prev]);
    }
    return res;
  }, null);

  const handleUpvote = (commentId: string) => {
    if (upvotedIds[commentId]) return;

    setUpvotedIds((prev) => ({ ...prev, [commentId]: true }));
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, helpfulCount: c.helpfulCount + 1 } : c))
    );

    startTransition(async () => {
      await upvoteCommentAction(commentId);
    });
  };

  const displayRating = hoverRating || selectedRating;

  return (
    <section className="mt-12 rounded-3xl border border-amber-100 bg-white p-6 shadow-sm sm:p-8">
      {/* Header & Rating Summary */}
      <div className="flex flex-col gap-4 border-b border-stone-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-900">
            Góc chia sẻ độc giả
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-stone-950">
            Cảm nhận & Đánh giá ({comments.length || totalReviews})
          </h2>
        </div>

        {comments.length > 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-amber-50/80 px-4 py-2.5">
            <div className="flex text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className="text-lg leading-none">
                  {star <= Math.round(averageRating) ? "★" : "☆"}
                </span>
              ))}
            </div>
            <span className="text-sm font-bold text-amber-950">
              {averageRating.toFixed(1)} / 5
            </span>
          </div>
        ) : null}
      </div>

      {/* Form viết bình luận */}
      <form action={formAction} className="mt-6">
        <input type="hidden" name="articleId" value={articleId || ""} />
        <input type="hidden" name="bookId" value={bookId || ""} />
        <input type="hidden" name="rating" value={selectedRating} />
        <input type="hidden" name="badge" value={selectedBadge} />

        <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 sm:p-5">
          <p className="text-sm font-semibold text-stone-900">
            Gửi đánh giá & cảm nhận của bạn
          </p>

          {/* Rating stars picker */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs text-stone-600">Đánh giá của bạn:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setSelectedRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="p-1 text-2xl leading-none text-amber-500 transition hover:scale-110"
                >
                  {star <= displayRating ? "★" : "☆"}
                </button>
              ))}
            </div>
            <span className="text-xs font-medium text-stone-500">
              {selectedRating === 5
                ? "Rất đáng đọc"
                : selectedRating === 4
                ? "Khá hay"
                : selectedRating === 3
                ? "Bình thường"
                : selectedRating === 2
                ? "Cần cải thiện"
                : "Không phù hợp"}
            </span>
          </div>

          {/* Badge selection */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-stone-600">Trạng thái:</span>
            {BADGES.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBadge(b)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  selectedBadge === b
                    ? "bg-amber-900 text-white"
                    : "bg-white text-stone-700 border border-stone-200 hover:border-amber-400"
                }`}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Text input fields */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-stone-700">
                Tên hoặc biệt danh của bạn <span className="text-red-500">*</span>
              </label>
              <input
                required
                name="name"
                placeholder="VD: Minh Tuấn, Lan Chi..."
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-700">
                Email (không bắt buộc, được bảo mật)
              </label>
              <input
                type="email"
                name="email"
                placeholder="email@example.com"
                className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-stone-700">
              Cảm nhận hoặc bài học bạn tâm đắc <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              name="content"
              rows={3}
              placeholder="Chia sẻ góc nhìn, điểm bạn thích hoặc cuốn sách/bài viết này đã giúp bạn thay đổi điều gì..."
              className="mt-1 w-full rounded-xl border border-stone-300 bg-white p-3.5 text-sm text-stone-900 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
            />
          </div>

          {/* Form Message */}
          {state?.error ? (
            <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">
              {state.error}
            </p>
          ) : null}

          {state?.message && !state?.error ? (
            <p className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">
              {state.message}
            </p>
          ) : null}

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-amber-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-950 disabled:opacity-50"
            >
              {isPending ? "Đang gửi..." : "Gửi cảm nhận"}
            </button>
          </div>
        </div>
      </form>

      {/* Danh sách bình luận */}
      <div className="mt-8 space-y-4">
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-stone-200 p-8 text-center">
            <span className="text-3xl">💬</span>
            <p className="mt-2 text-sm font-medium text-stone-700">
              Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ cảm nhận!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-stone-100 bg-stone-50/60 p-4 transition sm:p-5 hover:border-amber-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-900">
                    {comment.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-stone-950 text-sm">
                        {comment.name}
                      </span>
                      {comment.badge ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200/60">
                          {comment.badge}
                        </span>
                      ) : null}
                    </div>
                    {comment.rating ? (
                      <div className="mt-0.5 flex text-amber-500 text-xs">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <span key={s}>{s <= comment.rating! ? "★" : "☆"}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <span className="text-xs text-stone-400">
                  {new Date(comment.createdAt).toLocaleDateString("vi-VN")}
                </span>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-stone-700 whitespace-pre-line">
                {comment.content}
              </p>

              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => handleUpvote(comment.id)}
                  disabled={upvotedIds[comment.id]}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    upvotedIds[comment.id]
                      ? "bg-amber-100 text-amber-900"
                      : "text-stone-500 hover:bg-white hover:text-stone-800"
                  }`}
                >
                  <span>👍</span>
                  <span>Hữu ích {comment.helpfulCount > 0 ? `(${comment.helpfulCount})` : ""}</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
