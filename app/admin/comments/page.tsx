import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { approveCommentAction, deleteCommentAction } from "@/lib/comment-actions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCommentsPage() {
  await requireAdmin();

  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      article: { select: { id: true, title: true, slug: true } },
      book: { select: { id: true, title: true, slug: true } },
    },
  });

  return (
    <AdminShell
      title="Bình luận độc giả"
      description="Theo dõi cảm nhận, phản hồi và đánh giá sao từ người đọc thực tế."
    >
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-950">
              Bình luận của độc giả ({comments.length})
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Theo dõi cảm nhận, phản hồi và đánh giá sao từ người đọc thực tế.
            </p>
          </div>
        </div>

        {comments.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-stone-200 bg-white p-12 text-center text-stone-500">
            <span className="text-4xl">💬</span>
            <p className="mt-3 text-base font-medium text-stone-800">
              Chưa có bình luận nào từ độc giả.
            </p>
            <p className="mt-1 text-sm text-stone-500">
              Khi độc giả gửi nhận xét trên trang bài viết hoặc sách, bình luận sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`rounded-3xl border p-5 transition ${
                  comment.isApproved
                    ? "border-stone-200 bg-white"
                    : "border-amber-300 bg-amber-50/50"
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-900">
                      {comment.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-stone-950">
                          {comment.name}
                        </span>
                        {comment.email ? (
                          <span className="text-xs text-stone-500">({comment.email})</span>
                        ) : null}
                        {comment.badge ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200">
                            {comment.badge}
                          </span>
                        ) : null}
                        {!comment.isApproved ? (
                          <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                            Chờ duyệt
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-stone-500">
                        <div className="flex text-amber-500">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <span key={s}>{s <= (comment.rating || 5) ? "★" : "☆"}</span>
                          ))}
                        </div>
                        <span>•</span>
                        <span>{new Date(comment.createdAt).toLocaleString("vi-VN")}</span>
                        <span>•</span>
                        <span>👍 {comment.helpfulCount} lượt hữu ích</span>
                      </div>
                    </div>
                  </div>

                  {/* Đối tượng bình luận */}
                  <div className="text-xs text-stone-600 sm:text-right">
                    {comment.article ? (
                      <p>
                        Bài viết:{" "}
                        <Link
                          href={`/bai-viet/${comment.article.slug}`}
                          target="_blank"
                          className="font-medium text-amber-900 underline underline-offset-2"
                        >
                          {comment.article.title}
                        </Link>
                      </p>
                    ) : null}
                    {comment.book ? (
                      <p>
                        Sách:{" "}
                        <Link
                          href={`/sach/${comment.book.slug}`}
                          target="_blank"
                          className="font-medium text-amber-900 underline underline-offset-2"
                        >
                          {comment.book.title}
                        </Link>
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Nội dung bình luận */}
                <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm leading-relaxed text-stone-800 whitespace-pre-line">
                  {comment.content}
                </div>

                {/* Action buttons */}
                <div className="mt-4 flex items-center justify-end gap-2">
                  {!comment.isApproved ? (
                    <form
                      action={async () => {
                        "use server";
                        await approveCommentAction(comment.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
                      >
                        Duyệt hiển thị
                      </button>
                    </form>
                  ) : null}

                  <form
                    action={async () => {
                      "use server";
                      await deleteCommentAction(comment.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-xl border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 hover:border-red-300"
                    >
                      Xóa bình luận
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
