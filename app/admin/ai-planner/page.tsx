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
      where: { status: BookStatus.ACTIVE, shopeeAffiliateUrl: { not: null } },
      select: { id: true, title: true, _count: { select: { articles: true } } },
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
      description="AI tự plan bài viết mới, viết và lên lịch theo tuần — không cần nhập tay."
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
          { label: "Sách có affiliate", value: books.length },
          { label: "Bài đang lên lịch", value: scheduledCount },
          { label: "Bài đã publish", value: publishedCount },
        ].map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-stone-200 bg-white px-6 py-5 shadow-sm text-center">
            <p className="text-3xl font-bold text-amber-900">{stat.value}</p>
            <p className="mt-1 text-sm text-stone-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Config + Full Pipeline */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">🚀 Chạy toàn bộ pipeline</h2>
        <p className="mt-1 text-sm text-stone-600">
          AI sẽ tự lên kế hoạch → viết nội dung chi tiết 2000 từ/bài → lên lịch tự động theo tuần.
        </p>
        <form action={runFullPipelineAction} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Số bài / sách</span>
              <input
                type="number"
                name="articlesPerBook"
                defaultValue={2}
                min={1}
                max={5}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Ngày bắt đầu</span>
              <input
                type="date"
                name="startDate"
                defaultValue={nextMonStr}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-stone-700">Tần suất (ngày/bài)</span>
              <select
                name="intervalDays"
                defaultValue={2}
                className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
              >
                <option value={1}>Mỗi ngày</option>
                <option value={2}>Mỗi 2 ngày (T2/T4/T6)</option>
                <option value={3}>Mỗi 3 ngày</option>
                <option value={7}>Mỗi tuần</option>
              </select>
            </label>
          </div>
          <div className="pt-2">
            <AdminPlannerSubmitButton
              label="🚀 Chạy toàn bộ (Plan + Viết + Lên lịch)"
              loadingLabel="AI đang lên kế hoạch & viết bài hàng loạt..."
              className="rounded-2xl bg-amber-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-950"
            />
          </div>
        </form>
      </section>

      {/* Step-by-step section */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">📋 Hoặc chạy từng bước (Khuyên dùng)</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Step 1: Generate plan */}
          <div className="rounded-2xl bg-stone-50 p-5">
            <p className="text-sm font-semibold text-stone-900">Bước 1: AI tạo kế hoạch (~5 giây)</p>
            <p className="mt-1 text-xs text-stone-500">
              AI phân tích sách và đề xuất danh sách bài viết chưa có trên website.
            </p>
            <form action={generateArticlePlanAction} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input type="number" name="articlesPerBook" defaultValue={2} min={1} max={5}
                  placeholder="Bài/sách"
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-700" />
                <input type="date" name="startDate" defaultValue={nextMonStr}
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-700" />
              </div>
              <AdminPlannerSubmitButton
                label="📋 Tạo kế hoạch"
                loadingLabel="Đang tạo kế hoạch..."
                className="w-full rounded-xl bg-stone-900 py-2.5 text-sm font-semibold text-white hover:bg-amber-800"
              />
            </form>
          </div>

          {/* Step 2: Execute */}
          <div className="rounded-2xl bg-stone-50 p-5">
            <p className="text-sm font-semibold text-stone-900">Bước 2: Thực thi kế hoạch</p>
            <p className="mt-1 text-xs text-stone-500">
              AI viết từng bài trong kế hoạch và lên lịch tự động.
            </p>
            {pendingPlan ? (
              <div className="mt-4">
                <p className="text-xs text-emerald-700 font-medium">
                  ✅ Có {pendingPlan.length} bài trong kế hoạch chờ thực thi
                </p>
                <form action={executePlanAction} className="mt-3">
                  <AdminPlannerSubmitButton
                    label={`✍️ Viết & lên lịch ${pendingPlan.length} bài`}
                    loadingLabel={`Đang viết ${pendingPlan.length} bài...`}
                    className="w-full rounded-xl bg-amber-800 py-2.5 text-sm font-semibold text-white hover:bg-stone-950"
                  />
                </form>
              </div>
            ) : (
              <p className="mt-4 text-xs text-stone-400">
                Chưa có kế hoạch. Chạy Bước 1 trước.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Pending plan preview */}
      {pendingPlan && pendingPlan.length > 0 && (
        <section className="rounded-3xl border border-amber-100 bg-amber-50 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-stone-950">📅 Kế hoạch AI đề xuất</h2>
          <div className="mt-4 space-y-3">
            {pendingPlan.map((item, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-white p-4">
                <span className="shrink-0 mt-0.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-stone-900">{item.focusKeyword}</p>
                  <p className="mt-0.5 text-xs text-stone-500">{item.bookTitle}</p>
                  <p className="mt-1 text-xs text-stone-600">{item.angle}</p>
                </div>
                <p className="shrink-0 text-xs text-stone-400">
                  {new Date(item.scheduledAt).toLocaleDateString("vi-VN")}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Books summary */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-stone-950">📚 Sách đang hoạt động</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((book) => (
            <div key={book.id} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
              <p className="text-sm font-medium text-stone-900">{book.title}</p>
              <span className="text-xs text-stone-500">{book._count.articles} bài</span>
            </div>
          ))}
        </div>
      </section>
    </AdminShell>
  );
}
