import Link from "next/link";
import { ArticleStatus, KeywordIdeaStatus } from "@prisma/client";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
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
    totalClicks,
    totalViews,
    clicks7d,
    clicks30d,
    views30d,
    intentEvents30d,
    ctaVisible30d,
    savedEvents30d,
    journeyEvents30d,
    publishedArticles,
    draftArticles,
    reviewArticles,
    scheduledArticles,
    pendingIdeas,
    briefedIdeas,
    publishedArticleStats,
    articleIntentGroups,
    topArticles,
    topBooks,
    reviewQueueCandidates,
  ] = await Promise.all([
    prisma.article.count(),
    prisma.book.count(),
    prisma.clickEvent.count(),
    prisma.pageView.count(),
    prisma.clickEvent.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.clickEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.pageView.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.intentEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.intentEvent.count({
      where: { type: "cta_visible", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.intentEvent.count({
      where: { type: "saved_article", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.intentEvent.count({
      where: {
        type: { in: ["journey_item_clicked", "small_step_clicked"] },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.article.count({ where: { status: ArticleStatus.PUBLISHED } }),
    prisma.article.count({ where: { status: ArticleStatus.DRAFT } }),
    prisma.article.count({ where: { status: ArticleStatus.REVIEW } }),
    prisma.article.count({ where: { status: ArticleStatus.SCHEDULED } }),
    prisma.keywordIdea.count({ where: { status: KeywordIdeaStatus.IDEA } }),
    prisma.keywordIdea.count({ where: { status: KeywordIdeaStatus.BRIEFED } }),
    prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      include: {
        painPoints: true,
        _count: { select: { clickEvents: true, pageViews: true } },
      },
    }),
    prisma.intentEvent.groupBy({
      by: ["articleId", "type"],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        articleId: { not: null },
        type: {
          in: ["cta_visible", "article_scroll_50", "article_scroll_90", "saved_article"],
        },
      },
      _count: { _all: true },
    }),
    prisma.article.findMany({
      include: { _count: { select: { clickEvents: true, pageViews: true } } },
      orderBy: { clickEvents: { _count: "desc" } },
      take: 5,
    }),
    prisma.book.findMany({
      include: { _count: { select: { clickEvents: true, pageViews: true } } },
      orderBy: { clickEvents: { _count: "desc" } },
      take: 5,
    }),
    prisma.article.findMany({
      where: { status: { not: ArticleStatus.ARCHIVED } },
      orderBy: [{ scheduledAt: "asc" }, { updatedAt: "desc" }],
      take: 40,
      include: {
        painPoints: true,
        audiences: true,
        books: true,
        faqs: true,
        sources: true,
      },
    }),
  ]);
  const affiliateCtr30d = views30d ? `${((clicks30d / views30d) * 100).toFixed(1)}%` : "0%";
  const intentByArticle = articleIntentGroups.reduce(
    (acc, item) => {
      if (!item.articleId) return acc;
      const current = acc[item.articleId] || {};
      current[item.type] = item._count._all;
      acc[item.articleId] = current;
      return acc;
    },
    {} as Record<string, Record<string, number>>,
  );
  const lowCtrArticles = publishedArticleStats
    .filter((article) => article._count.pageViews >= 5)
    .map((article) => ({
      ...article,
      ctr: article._count.clickEvents / Math.max(1, article._count.pageViews),
    }))
    .filter((article) => article.ctr < 0.02)
    .sort((a, b) => b._count.pageViews - a._count.pageViews)
    .slice(0, 5);
  const rewriteCandidates = publishedArticleStats
    .map((article) => ({
      ...article,
      intent: intentByArticle[article.id] || {},
    }))
    .filter((article) => {
      const ctaVisible = article.intent.cta_visible || 0;
      const scroll50 = article.intent.article_scroll_50 || 0;
      return (ctaVisible >= 3 && article._count.clickEvents === 0) || scroll50 >= 8;
    })
    .sort(
      (a, b) =>
        (b.intent.cta_visible || 0) +
        (b.intent.article_scroll_50 || 0) -
        ((a.intent.cta_visible || 0) + (a.intent.article_scroll_50 || 0)),
    )
    .slice(0, 5);
  const ctrByType = Object.entries(
    publishedArticleStats.reduce(
      (acc, article) => {
        const current = acc[article.type] || { views: 0, clicks: 0 };
        current.views += article._count.pageViews;
        current.clicks += article._count.clickEvents;
        acc[article.type] = current;
        return acc;
      },
      {} as Record<string, { views: number; clicks: number }>,
    ),
  );
  const ctrByPainPoint = Object.entries(
    publishedArticleStats.reduce(
      (acc, article) => {
        for (const painPoint of article.painPoints) {
          const current = acc[painPoint.name] || { views: 0, clicks: 0 };
          current.views += article._count.pageViews;
          current.clicks += article._count.clickEvents;
          acc[painPoint.name] = current;
        }
        return acc;
      },
      {} as Record<string, { views: number; clicks: number }>,
    ),
  )
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, 6);
  const reviewQueue = reviewQueueCandidates
    .map((article) => {
      const quality = getArticleQualitySummary(article);
      const ageDays = Math.floor((now.getTime() - article.updatedAt.getTime()) / 86_400_000);
      const scheduledSoon =
        article.status === ArticleStatus.SCHEDULED &&
        article.scheduledAt &&
        article.scheduledAt.getTime() <= now.getTime() + 48 * 60 * 60 * 1000;
      const needsReview =
        article.status === ArticleStatus.DRAFT ||
        article.status === ArticleStatus.REVIEW ||
        Boolean(scheduledSoon) ||
        (article.status === ArticleStatus.PUBLISHED &&
          (quality.failedRequired.length > 0 || ageDays >= 120));

      return {
        article,
        quality,
        ageDays,
        scheduledSoon,
        needsReview,
      };
    })
    .filter((item) => item.needsReview)
    .sort((a, b) => queuePriority(b, now) - queuePriority(a, now))
    .slice(0, 8);

  return (
    <AdminShell
      title="Dashboard"
      description="Tổng quan nội dung, sách và click affiliate."
      actions={
        <Link
          href="/admin/articles/new"
          className="rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-950"
        >
          Tạo bài viết
        </Link>
      }
    >
      <AdminNotice error={params.error} success={params.success} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tổng số bài" value={totalArticles} />
        <MetricCard label="Tổng số sách" value={totalBooks} />
        <MetricCard label="Tổng click Shopee" value={totalClicks} />
        <MetricCard label="Tổng page view" value={totalViews} />
        <MetricCard label="Click 7 ngày" value={clicks7d} />
        <MetricCard label="Click 30 ngày" value={clicks30d} />
        <MetricCard label="View 30 ngày" value={views30d} />
        <MetricCard label="CTR affiliate 30 ngày" value={affiliateCtr30d} />
        <MetricCard label="Intent events 30 ngày" value={intentEvents30d} />
        <MetricCard label="CTA visible 30 ngày" value={ctaVisible30d} />
        <MetricCard label="Bài được lưu 30 ngày" value={savedEvents30d} />
        <MetricCard label="Journey click 30 ngày" value={journeyEvents30d} />
        <MetricCard label="Ideas chờ viết" value={pendingIdeas} />
        <MetricCard label="Ideas đã brief" value={briefedIdeas} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm xl:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-950">Cần duyệt hôm nay</h2>
              <p className="mt-1 text-sm text-stone-600">
                Draft mới, lịch đăng trong 48 giờ, bài đang REVIEW và bài published cần refresh.
              </p>
            </div>
            <Link href="/admin/content-audit" className="text-sm font-semibold text-amber-900 hover:text-stone-950">
              Mở content audit
            </Link>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {reviewQueue.map(({ article, quality, ageDays, scheduledSoon }) => (
              <Link
                key={article.id}
                href={`/admin/articles/${article.id}/edit`}
                className="rounded-2xl border border-stone-200 bg-stone-50 p-4 transition hover:border-amber-200 hover:bg-amber-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-semibold leading-6 text-stone-950">{article.title}</span>
                  <StatusBadge status={article.status} />
                </div>
                <p className="mt-2 text-xs leading-5 text-stone-600">
                  {scheduledSoon
                    ? `Sắp đăng ${article.scheduledAt?.toLocaleString("vi-VN")}`
                    : article.status === ArticleStatus.PUBLISHED && ageDays >= 120
                      ? `Cần refresh: đã ${ageDays} ngày chưa cập nhật`
                      : quality.failedRequired.length
                        ? `Thiếu: ${quality.failedRequired.slice(0, 2).map((item) => item.label).join(", ")}`
                        : "Chờ biên tập viên duyệt nội dung"}
                </p>
              </Link>
            ))}
            {!reviewQueue.length ? (
              <p className="rounded-2xl bg-emerald-50 px-4 py-5 text-sm text-emerald-800">
                Hàng duyệt đang trống. Có thể tập trung vào content planner hoặc refresh bài có CTR thấp.
              </p>
            ) : null}
          </div>
        </section>
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Trạng thái bài viết</h2>
          <div className="mt-4 space-y-3 text-sm">
            <StatusRow label="Published" status="PUBLISHED" value={publishedArticles} />
            <StatusRow label="Scheduled" status="SCHEDULED" value={scheduledArticles} />
            <StatusRow label="Draft" status="DRAFT" value={draftArticles} />
            <StatusRow label="Review" status="REVIEW" value={reviewArticles} />
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            Bài nhiều view nhưng ít click
          </h2>
          <div className="mt-4 divide-y divide-stone-100">
            {lowCtrArticles.map((article) => (
              <div key={article.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link
                    href={`/admin/articles/${article.id}/edit`}
                    className="font-medium text-stone-950 hover:text-amber-900"
                  >
                    {article.title}
                  </Link>
                  <p className="mt-1 text-xs text-stone-500">
                    {article._count.pageViews} view · {article._count.clickEvents} click
                  </p>
                </div>
                <span className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700">
                  {(article.ctr * 100).toFixed(1)}%
                </span>
              </div>
            ))}
            {!lowCtrArticles.length ? (
              <p className="py-6 text-sm text-stone-500">
                Chưa có bài đủ view để cảnh báo CTR thấp.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            Nên rewrite hook/decision card
          </h2>
          <div className="mt-4 divide-y divide-stone-100">
            {rewriteCandidates.map((article) => (
              <div key={article.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link
                    href={`/admin/articles/${article.id}/edit`}
                    className="font-medium text-stone-950 hover:text-amber-900"
                  >
                    {article.title}
                  </Link>
                  <p className="mt-1 text-xs text-stone-500">
                    {article.intent.article_scroll_50 || 0} scroll 50 ·{" "}
                    {article.intent.cta_visible || 0} CTA visible ·{" "}
                    {article._count.clickEvents} click
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                  Sửa
                </span>
              </div>
            ))}
            {!rewriteCandidates.length ? (
              <p className="py-6 text-sm text-stone-500">
                Chưa có đủ intent event để gợi ý rewrite.
              </p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">
            Top bài có nhiều click affiliate
          </h2>
          <div className="mt-4 divide-y divide-stone-100">
            {topArticles.map((article) => (
              <div key={article.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link
                    href={`/admin/articles/${article.id}/edit`}
                    className="font-medium text-stone-950 hover:text-amber-900"
                  >
                    {article.title}
                  </Link>
                  <p className="mt-1 text-xs text-stone-500">
                    {article._count.pageViews} view
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">
                  {article._count.clickEvents}
                </span>
              </div>
            ))}
            {!topArticles.length ? (
              <p className="py-6 text-sm text-stone-500">Chưa có click affiliate.</p>
            ) : null}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Top sách có nhiều click</h2>
          <div className="mt-4 divide-y divide-stone-100">
            {topBooks.map((book) => (
              <div key={book.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <Link
                    href={`/admin/books/${book.id}/edit`}
                    className="font-medium text-stone-950 hover:text-amber-900"
                  >
                    {book.title}
                  </Link>
                  <p className="mt-1 text-xs text-stone-500">
                    {book._count.pageViews} view
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">
                  {book._count.clickEvents}
                </span>
              </div>
            ))}
            {!topBooks.length ? (
              <p className="py-6 text-sm text-stone-500">Chưa có click affiliate.</p>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <CtrTable title="CTR theo loại bài" rows={ctrByType} />
        <CtrTable title="CTR theo nỗi đau" rows={ctrByPainPoint} />
      </div>
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function queuePriority(
  item: {
    article: { status: ArticleStatus; scheduledAt: Date | null };
    quality: { failedRequired: unknown[] };
    ageDays: number;
    scheduledSoon: boolean | null;
  },
  now: Date,
) {
  if (item.scheduledSoon) return 500;
  if (item.article.status === ArticleStatus.REVIEW) return 400;
  if (item.quality.failedRequired.length) return 300;
  if (item.article.status === ArticleStatus.DRAFT) return 200;
  if (item.ageDays >= 120) return 100;
  return item.article.scheduledAt && item.article.scheduledAt < now ? 50 : 0;
}

function CtrTable({
  title,
  rows,
}: {
  title: string;
  rows: [string, { views: number; clicks: number }][];
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <div className="mt-4 divide-y divide-stone-100 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[1fr_auto_auto_auto] gap-3 py-3">
            <span className="font-medium text-stone-950">{label}</span>
            <span className="text-stone-500">{value.views} view</span>
            <span className="text-stone-500">{value.clicks} click</span>
            <span className="font-semibold text-amber-800">
              {value.views ? ((value.clicks / value.views) * 100).toFixed(1) : "0.0"}%
            </span>
          </div>
        ))}
        {!rows.length ? (
          <p className="py-6 text-sm text-stone-500">Chưa có dữ liệu.</p>
        ) : null}
      </div>
    </section>
  );
}

function StatusRow({
  label,
  status,
  value,
}: {
  label: string;
  status: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        <span>{label}</span>
      </div>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
