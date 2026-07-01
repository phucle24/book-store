import Link from "next/link";
import { ArticleStatus } from "@prisma/client";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/auth";
import { getArticleQualitySummary } from "@/lib/content-quality";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContentAuditPage() {
  await requireAdmin();

  const articles = await prisma.article.findMany({
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    include: {
      painPoints: true,
      audiences: true,
      books: { include: { book: true } },
      faqs: true,
      _count: { select: { pageViews: true, clickEvents: true } },
    },
  });
  const now = new Date();

  const rows = articles.map((article) => {
    const summary = getArticleQualitySummary(article);
    const ageDays = Math.floor(
      (now.getTime() - article.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const refreshReasons = [
      ageDays >= 120 ? `Cũ ${ageDays} ngày` : null,
      article._count.pageViews >= 5 && article._count.clickEvents === 0
        ? "Có view nhưng chưa có click"
        : null,
    ].filter((item): item is string => Boolean(item));

    return {
      article,
      summary,
      issues: [...summary.failedRequired, ...summary.failedWarnings],
      refreshReasons,
    };
  });
  const needsSeo = rows.filter((row) =>
    row.issues.some((issue) => issue.label.includes("SEO")),
  ).length;
  const missingFaq = rows.filter((row) =>
    row.issues.some((issue) => issue.label.includes("FAQ")),
  ).length;
  const shortContent = rows.filter((row) =>
    row.issues.some((issue) => issue.label.includes("tối thiểu")),
  ).length;
  const scheduledSoon = rows.filter(
    (row) => row.article.status === ArticleStatus.SCHEDULED && row.article.scheduledAt,
  ).length;
  const refreshCount = rows.filter((row) => row.refreshReasons.length).length;

  return (
    <AdminShell
      title="Content Audit"
      description="Kiểm tra bài thiếu SEO, thiếu FAQ, content ngắn, thiếu sách hoặc có rủi ro trước khi publish."
    >
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Bài cần SEO" value={needsSeo} />
        <MetricCard label="Thiếu FAQ" value={missingFaq} />
        <MetricCard label="Content ngắn" value={shortContent} />
        <MetricCard label="Scheduled cần review" value={scheduledSoon} />
        <MetricCard label="Nên refresh" value={refreshCount} />
      </div>

      <div className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
              <tr>
                <th className="px-4 py-3">Bài viết</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Word</th>
                <th className="px-4 py-3">View / Click</th>
                <th className="px-4 py-3">Vấn đề cần xử lý</th>
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map(({ article, summary, issues, refreshReasons }) => (
                <tr key={article.id}>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="font-semibold text-stone-950 hover:text-amber-900"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                      {article.type} · {article.slug}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={article.status} />
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        summary.score >= 80
                          ? "bg-emerald-50 text-emerald-800"
                          : summary.score >= 60
                            ? "bg-amber-50 text-amber-800"
                            : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {summary.score}/100
                    </span>
                  </td>
                  <td className="px-4 py-4 text-stone-600">{summary.wordCount}</td>
                  <td className="px-4 py-4 text-stone-600">
                    {article._count.pageViews} / {article._count.clickEvents}
                  </td>
                  <td className="px-4 py-4">
                    {issues.length || refreshReasons.length ? (
                      <div className="flex max-w-xl flex-wrap gap-2">
                        {refreshReasons.map((reason) => (
                          <span
                            key={reason}
                            className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-800"
                          >
                            {reason}
                          </span>
                        ))}
                        {issues.slice(0, 4).map((issue) => (
                          <span
                            key={issue.label}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              issue.severity === "required"
                                ? "bg-rose-50 text-rose-700"
                                : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {issue.label}
                          </span>
                        ))}
                        {issues.length > 4 ? (
                          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                            +{issues.length - 4}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-emerald-700">Ổn để publish</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                    >
                      Sửa
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}
