import { AdminShell } from "@/components/AdminShell";
import { AdminPlannerSubmitButton } from "@/components/AdminPlannerSubmitButton";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ArticleStatus, BookStatus } from "@prisma/client";
import {
  generateArticlePlanAction,
  executePlanAction,
  runFullPipelineAction,
  getPendingPlan,
} from "@/lib/ai-planner-actions";

export const dynamic = "force-dynamic";

export default async function AdminAiPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [books, scheduledCount, publishedCount, pendingPlan] = await Promise.all([
    prisma.book.findMany({
      where: { status: BookStatus.ACTIVE },
      select: { id: true, title: true, author: true, _count: { select: { articles: true, quotes: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.article.count({ where: { status: ArticleStatus.SCHEDULED } }),
    prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
    getPendingPlan(),
  ]);

  // Compute next Monday
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  const nextMon = new Date(today);
  nextMon.setDate(today.getDate() + daysUntilMonday);
  const nextMonStr = nextMon.toISOString().slice(0, 10);

  return (
    <AdminShell
      title="AI Content Planner"
      description="Tự động khám phá Sách Mới, tạo Quotes và viết bài lên lịch theo tuần — 100% tự động."
    >
      {/* Notice */}
      {params.success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ {params.success}
        </div>
      )}
      {params.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ❌ {params.error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Tổng số sách trong kho", value: books.length },
          { label: "Bài đang lên lịch", value: scheduledCount },
          { label: "Bài đã xuất bản", value: publishedCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-stone-200 bg-white px-6 py-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-amber-900">{stat.value}</p>
            <p className="mt-1 text-sm text-stone-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Mode 1 & 2: Main Setup & Execution */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">✨</span>
          <div>
            <h2 className="text-lg font-semibold text-stone-950">Khám phá Sách Mới & Lên lịch bài viết</h2>
            <p className="text-sm text-stone-600">
              AI sẽ tự tìm các đầu sách bestseller chưa có trên web, tự tạo thông tin sách + 10 quotes + bài viết review chuyên sâu.
            </p>
          </div>
        </div>

        <form action={runFullPipelineAction} className="mt-6 space-y-5">
          {/* Mode selector */}
          <div>
            <label className="block text-sm font-semibold text-stone-900">Chế độ tạo nội dung</label>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 transition hover:border-amber-400">
                <input
                  type="radio"
                  name="mode"
                  value="discover_new_books"
                  defaultChecked
                  className="mt-1 text-amber-800 focus:ring-amber-800"
                />
                <div>
                  <p className="text-sm font-semibold text-stone-950">🌟 Tìm Sách Mới hoàn toàn</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    AI tự đề xuất các sách hot/bestseller chưa có trên website.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-stone-400">
                <input
                  type="radio"
                  name="mode"
                  value="custom_books"
                  className="mt-1 text-amber-800 focus:ring-amber-800"
                />
                <div>
                  <p className="text-sm font-semibold text-stone-950">✍️ Nhập tên sách chỉ định</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Bạn tự nhập danh sách tên sách muốn đưa lên web.
                  </p>
                </div>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-stone-400">
                <input
                  type="radio"
                  name="mode"
                  value="existing_books"
                  className="mt-1 text-amber-800 focus:ring-amber-800"
                />
                <div>
                  <p className="text-sm font-semibold text-stone-950">📚 Viết cho sách hiện có</p>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Viết thêm bài mới cho các sách sẵn có trong database.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Custom books input (optional) */}
          <div>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">
                Nếu chọn &ldquo;Nhập tên sách chỉ định&rdquo;, nhập tên các cuốn sách tại đây (phân cách bằng dấu phẩy hoặc xuống dòng):
              </span>
              <textarea
                name="customBookTitles"
                rows={2}
                placeholder="Ví dụ: Tâm Lý Học Về Tiền, Sức Mạnh Của Hiện Tại, Muôn Kiếp Nhân Sinh"
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              />
            </label>
          </div>

          {/* Parameters */}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Số lượng sách mới</span>
              <input
                type="number"
                name="bookCount"
                defaultValue={3}
                min={1}
                max={5}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Bắt đầu lên lịch từ</span>
              <input
                type="date"
                name="startDate"
                defaultValue={nextMonStr}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Tần suất xuất bản</span>
              <select
                name="intervalDays"
                defaultValue={2}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              >
                <option value={1}>Mỗi ngày 1 bài</option>
                <option value={2}>Mỗi 2 ngày (Thứ 2 / 4 / 6)</option>
                <option value={3}>Mỗi 3 ngày 1 bài</option>
                <option value={7}>Mỗi tuần 1 bài</option>
              </select>
            </label>
          </div>

          <div className="pt-2">
            <AdminPlannerSubmitButton
              label="🚀 Chạy toàn bộ (Tìm sách + Tạo sách + Viết bài + Lên lịch)"
              loadingLabel="AI đang tìm sách mới, tạo dữ liệu & viết bài..."
              className="rounded-2xl bg-amber-800 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-stone-950 shadow-sm"
            />
          </div>
        </form>
      </section>

      {/* Step-by-step section */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">📋 Hoặc chạy từng bước (Xem trước kế hoạch)</h2>
        <p className="mt-1 text-sm text-stone-600">
          Tạo kế hoạch trước để xem danh sách các cuốn sách AI đề xuất, sau đó bấm thực thi.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Step 1 */}
          <div className="rounded-2xl bg-stone-50 p-5">
            <p className="text-sm font-semibold text-stone-900">Bước 1: AI đề xuất sách & lên kế hoạch (~5 giây)</p>
            <form action={generateArticlePlanAction} className="mt-3 space-y-3">
              <input type="hidden" name="mode" value="discover_new_books" />
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-stone-600">Số sách mới</span>
                  <input
                    type="number"
                    name="bookCount"
                    defaultValue={3}
                    min={1}
                    max={5}
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-700"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-stone-600">Ngày bắt đầu</span>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={nextMonStr}
                    className="mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-700"
                  />
                </label>
              </div>
              <AdminPlannerSubmitButton
                label="📋 Tạo kế hoạch sách mới"
                loadingLabel="Đang đề xuất sách..."
                className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-amber-800"
              />
            </form>
          </div>

          {/* Step 2 */}
          <div className="rounded-2xl bg-stone-50 p-5">
            <p className="text-sm font-semibold text-stone-900">Bước 2: Thực thi kế hoạch</p>
            {pendingPlan && pendingPlan.length > 0 ? (
              <div className="mt-3 space-y-3">
                <p className="text-xs font-semibold text-emerald-700">
                  ✅ Có {pendingPlan.length} bài viết cho {pendingPlan.filter((p) => p.isNewBook).length} cuốn sách mới đang chờ!
                </p>
                <form action={executePlanAction}>
                  <AdminPlannerSubmitButton
                    label={`✍️ Tạo sách & viết ${pendingPlan.length} bài`}
                    loadingLabel={`Đang tạo sách & viết ${pendingPlan.length} bài...`}
                    className="w-full rounded-xl bg-amber-800 py-2.5 text-sm font-semibold text-white hover:bg-stone-950"
                  />
                </form>
              </div>
            ) : (
              <p className="mt-3 text-xs text-stone-400">
                Chưa có kế hoạch nào. Hãy chạy Bước 1 trước để AI đề xuất sách.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Pending plan preview */}
      {pendingPlan && pendingPlan.length > 0 && (
        <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-950">📅 Kế hoạch sách & bài viết AI đề xuất</h2>
            <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
              {pendingPlan.length} bài viết
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {pendingPlan.map((item, i) => (
              <div key={i} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 shrink-0">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-stone-950 text-sm">{item.bookTitle}</p>
                      <span className="text-xs text-stone-500">— {item.author}</span>
                      {item.isNewBook && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          ✨ Sách mới
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-amber-900">
                      Từ khóa SEO: <span className="underline">{item.focusKeyword}</span>
                    </p>
                    <p className="mt-1 text-xs text-stone-600 leading-5">{item.angle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block rounded-xl bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                      📅 {new Date(item.scheduledAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Books summary */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-stone-950">📚 Sách hiện có trong hệ thống ({books.length} cuốn)</h2>
        <p className="text-xs text-stone-500 mt-1">
          AI sẽ tự động tránh các cuốn sách này khi bạn chọn chế độ &ldquo;Tìm Sách Mới hoàn toàn&rdquo;.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <div key={book.id} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm font-semibold text-stone-900">{book.title}</p>
              <p className="text-xs text-stone-500 mt-0.5">{book.author}</p>
              <div className="mt-2 flex gap-3 text-[11px] text-stone-500">
                <span>📝 {book._count.articles} bài</span>
                <span>💬 {book._count.quotes} quotes</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
