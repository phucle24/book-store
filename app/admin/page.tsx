import Link from "next/link";
import { ArticleStatus } from "@prisma/client";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { getArticleQualitySummary } from "@/lib/content-quality";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [
    totalArticles,
    totalBooks,
    totalQuotes,
    totalClicks,
    totalViews,
    clicks7d,
    clicks30d,
    views30d,
    scheduledArticles,
    publishedArticles,
    booksNeedingAttention,
    scheduledQueue,
    recentArticles,
    topBooks,
    pendingCommentsCount,
  ] = await Promise.all([
    prisma.article.count(),
    prisma.book.count(),
    prisma.quote.count(),
    prisma.clickEvent.count(),
    prisma.pageView.count(),
    prisma.clickEvent.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.clickEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.pageView.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.article.count({ where: { status: ArticleStatus.SCHEDULED } }),
    prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
    prisma.book.findMany({
      where: {
        OR: [
          { coverImage: null },
          { coverImage: "" },
          { shopeeAffiliateUrl: null },
          { shopeeAffiliateUrl: "" },
          { shopeeAffiliateUrl: { contains: "search?keyword=" } },
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.article.findMany({
      where: { status: ArticleStatus.SCHEDULED },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { books: { include: { book: true } } },
    }),
    prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        faqs: true,
        sources: true,
        books: true,
        painPoints: true,
        audiences: true,
      },
    }),
    prisma.book.findMany({
      include: { _count: { select: { clickEvents: true, articles: true } } },
      orderBy: { clickEvents: { _count: "desc" } },
      take: 5,
    }),
    prisma.comment.count({ where: { isApproved: false } }),
  ]);

  const affiliateCtr30d = views30d ? `${((clicks30d / views30d) * 100).toFixed(1)}%` : "0%";

  // Điểm chất lượng trung bình của bài viết gần đây
  const qualityScores = recentArticles.map((art) => getArticleQualitySummary(art).score);
  const avgQualityScore = qualityScores.length
    ? Math.round(qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length)
    : 100;

  return (
    <AdminShell
      title="Tổng quan vận hành 100% AI"
      description="Hệ thống tự động lên lịch, tạo sách, viết bài & tối ưu SEO. Admin chỉ quản lý link Shopee & ảnh bìa."
      actions={
        <div className="flex gap-2">
          <Link
            href="/admin/ai-planner"
            className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-900 transition"
          >
            🤖 AI Content Planner
          </Link>
        </div>
      }
    >
      <AdminNotice error={params.error} success={params.success} />

      {/* 🌟 1. ACTION CENTER — NHIỆM VỤ CỦA ADMIN */}
      <section className="rounded-3xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-50/70 via-white to-amber-50/20 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-800 px-3 py-1 text-xs font-semibold text-white">
              ⚡ Action Center
            </span>
            <h2 className="mt-2 text-lg font-bold text-stone-950">
              Sách cần cập nhật Link Shopee & Ảnh bìa
            </h2>
            <p className="mt-0.5 text-xs text-stone-600">
              AI đã tạo sách và bài viết xong. Hãy bổ sung link Shopee (shope.ee) và ảnh bìa để tối ưu hoa hồng.
            </p>
          </div>
          <Link
            href="/admin/books"
            className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50"
          >
            Xem toàn bộ sách ({totalBooks})
          </Link>
        </div>

        {!booksNeedingAttention.length ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <span className="text-lg">🎉</span>
            <p className="font-medium">
              Tuyệt vời! Tất cả sách hiện tại đều đã có đầy đủ link Shopee rút gọn và ảnh bìa.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {booksNeedingAttention.map((book) => {
              const needsLink =
                !book.shopeeAffiliateUrl ||
                book.shopeeAffiliateUrl.includes("search?keyword=");
              const needsCover = !book.coverImage;

              return (
                <div
                  key={book.id}
                  className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-semibold text-stone-950 line-clamp-1">{book.title}</p>
                    <p className="text-xs text-stone-500">{book.author}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {needsLink ? (
                        <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          Thiếu link Shopee
                        </span>
                      ) : null}
                      {needsCover ? (
                        <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          Thiếu ảnh bìa
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="mt-3 block text-center rounded-xl bg-stone-950 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 transition"
                  >
                    Cập nhật ngay
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 🤖 2. AI AUTOMATION HUB — TRẠNG THÁI TỰ ĐỘNG HÓA */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Lịch phát bài tự động */}
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-950">
                🤖 Hàng đợi phát bài AI ({scheduledArticles} bài đã lên lịch)
              </h2>
              <p className="text-xs text-stone-500">
                Cron tự động kích hoạt và phát hành đúng giờ (Thứ 2, 4, 6)
              </p>
            </div>
            <Link
              href="/admin/ai-planner"
              className="text-xs font-semibold text-amber-800 hover:text-stone-950"
            >
              + Tạo thêm lịch
            </Link>
          </div>

          {!scheduledQueue.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-stone-200 p-6 text-center text-sm text-stone-500">
              Chưa có bài nào trong hàng đợi.{" "}
              <Link href="/admin/ai-planner" className="font-semibold text-amber-800 underline">
                Bấm vào AI Planner
              </Link>{" "}
              để lên kế hoạch tự động cho tuần tới!
            </div>
          ) : (
            <div className="mt-4 divide-y divide-stone-100">
              {scheduledQueue.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-950 truncate">{item.title}</p>
                    <p className="text-xs text-stone-500">
                      Sách: {item.books[0]?.book.title || "Chưa gắn"} · Tác giả: {item.books[0]?.book.author}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                      {item.scheduledAt
                        ? new Date(item.scheduledAt).toLocaleDateString("vi-VN", {
                            weekday: "short",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Sắp đăng"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AI Health & Quality Checklist */}
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-stone-950">Chất lượng bài viết AI</h2>
          <p className="text-xs text-stone-500">Đánh giá theo 28 tiêu chí SEO & E-E-A-T</p>

          <div className="mt-4 rounded-2xl bg-stone-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-stone-600">Điểm chất lượng TB</span>
              <span className="text-lg font-bold text-amber-800">{avgQualityScore}/100</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full bg-amber-800 transition-all duration-500"
                style={{ width: `${avgQualityScore}%` }}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs text-stone-600">
            <div className="flex items-center justify-between">
              <span>✓ Tự động chèn FAQs</span>
              <span className="font-semibold text-emerald-700">100% bài mới</span>
            </div>
            <div className="flex items-center justify-between">
              <span>✓ Tự động ghi chú nguồn</span>
              <span className="font-semibold text-emerald-700">100% bài mới</span>
            </div>
            <div className="flex items-center justify-between">
              <span>✓ Tự tạo 10 Quotes/sách</span>
              <span className="font-semibold text-emerald-700">Tự động</span>
            </div>
            <div className="flex items-center justify-between">
              <span>✓ Tự cải thiện bài cũ</span>
              <span className="font-semibold text-stone-800">Chủ nhật hàng tuần</span>
            </div>
          </div>

          <div className="mt-5 border-t border-stone-100 pt-3">
            <Link
              href="/admin/content-audit"
              className="block text-center rounded-xl border border-stone-200 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              Mở Content Quality Audit
            </Link>
          </div>
        </section>
      </div>

      {/* 📊 3. METRICS OVERVIEW */}
      <div className="mt-6">
        <h2 className="text-base font-bold text-stone-950 mb-3">Hiệu suất Website & Affiliate</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Tổng bài viết"
            value={`${publishedArticles} / ${totalArticles}`}
            hint={`${scheduledArticles} bài đã lên lịch`}
          />
          <MetricCard
            label="Tổng số sách"
            value={totalBooks}
            hint={`${totalQuotes} câu trích dẫn`}
          />
          <MetricCard
            label="Clicks Shopee (30 ngày)"
            value={clicks30d}
            hint={`Tổng click: ${totalClicks}`}
          />
          <MetricCard
            label="CTR Affiliate (30 ngày)"
            value={affiliateCtr30d}
            hint={`${views30d} lượt xem`}
          />
        </div>
      </div>

      {/* Top Sách Clicks */}
      <div className="mt-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-stone-950 mb-3">Top sách được quan tâm nhất (Clicks)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                <tr>
                  <th className="px-4 py-2.5">Tên sách</th>
                  <th className="px-4 py-2.5">Số bài review</th>
                  <th className="px-4 py-2.5">Clicks Shopee</th>
                  <th className="px-4 py-2.5 text-right">Link Affiliate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {topBooks.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 font-semibold text-stone-950">{b.title}</td>
                    <td className="px-4 py-3 text-stone-600">{b._count.articles} bài</td>
                    <td className="px-4 py-3 font-bold text-amber-900">{b._count.clickEvents} clicks</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/books/${b.id}/edit`}
                        className="text-xs font-semibold text-stone-700 hover:text-amber-800 underline"
                      >
                        Sửa Shopee/Ảnh
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-stone-950">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-stone-400">{hint}</p> : null}
    </div>
  );
}
