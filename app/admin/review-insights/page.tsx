import Link from "next/link";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import {
  analyzeReviewInsightAction,
  deleteReviewInsightAction,
  generateArticleFromReviewInsightAction,
} from "@/lib/review-insight-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReviewInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = reviewInsightStatus(params.status);
  const insights = await prisma.reviewInsight.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { articles: true } } },
  });

  return (
    <AdminShell
      title="Review Insight Collector"
      description="Paste review thủ công, phân tích insight và tạo article draft bằng AI. Không scrape Shopee tự động."
      actions={
        <Link
          href="/admin/review-insights/new"
          className="rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-950"
        >
          New insight
        </Link>
      }
    >
      <AdminNotice error={params.error} success={params.success} />
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusFilter href="/admin/review-insights" label="Tất cả" active={!status} />
        {["draft", "analyzed", "article_generated"].map((item) => (
          <StatusFilter
            key={item}
            href={`/admin/review-insights?status=${item}`}
            label={item}
            active={status === item}
          />
        ))}
      </div>
      {!insights.length ? (
        <EmptyState
          title="Chưa có review insight"
          description="Tạo record đầu tiên bằng cách paste review công khai đã collect thủ công."
          action={
            <Link
              href="/admin/review-insights/new"
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
            >
              New insight
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
                <tr>
                  <th className="px-4 py-3">Book title</th>
                  <th className="px-4 py-3">Product URL</th>
                  <th className="px-4 py-3">Reviews</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {insights.map((insight) => (
                  <tr key={insight.id}>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/review-insights/${insight.id}`}
                        className="font-semibold text-stone-950 hover:text-amber-900"
                      >
                        {insight.bookTitle}
                      </Link>
                      <p className="mt-1 text-xs text-stone-500">
                        {insight.author || "Không rõ tác giả"} · {insight._count.articles} draft
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <a
                        href={insight.shopeeProductUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="line-clamp-1 max-w-[260px] text-amber-900 hover:underline"
                      >
                        {insight.shopeeProductUrl}
                      </a>
                    </td>
                    <td className="px-4 py-4 text-stone-700">{insight.reviewCount}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={insight.status} />
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {insight.createdAt.toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/review-insights/${insight.id}`}
                          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                        >
                          View
                        </Link>
                        <form action={analyzeReviewInsightAction}>
                          <input type="hidden" name="id" value={insight.id} />
                          <button className="rounded-full border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">
                            Analyze
                          </button>
                        </form>
                        <form action={generateArticleFromReviewInsightAction}>
                          <input type="hidden" name="id" value={insight.id} />
                          <input type="hidden" name="publishMode" value="draft" />
                          <button className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50">
                            Generate draft
                          </button>
                        </form>
                        <form action={deleteReviewInsightAction}>
                          <input type="hidden" name="id" value={insight.id} />
                          <button className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

function reviewInsightStatus(value?: string) {
  return ["draft", "analyzed", "article_generated"].includes(value || "")
    ? value
    : null;
}

function StatusFilter({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? "bg-stone-950 text-white"
          : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
      }`}
    >
      {label}
    </Link>
  );
}
