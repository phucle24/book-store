import Link from "next/link";
import { ArticleStatus } from "@prisma/client";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { deleteArticleAction } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { getArticleQualitySummary } from "@/lib/content-quality";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = articleStatus(params.status);
  const articles = await prisma.article.findMany({
    where: status ? { status } : undefined,
    orderBy:
      status === ArticleStatus.SCHEDULED
        ? [{ scheduledAt: "asc" }, { updatedAt: "desc" }]
        : [{ updatedAt: "desc" }],
    include: {
      categories: true,
      painPoints: true,
      audiences: true,
      faqs: true,
      books: { include: { book: true } },
      _count: { select: { clickEvents: true, pageViews: true } },
    },
  });

  return (
    <AdminShell
      title="Bài viết"
      description="Quản lý markdown article, trạng thái xuất bản và sách liên quan."
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
      <div className="mb-4 flex flex-wrap gap-2">
        <StatusFilter href="/admin/articles" label="Tất cả" active={!status} />
        {Object.values(ArticleStatus).map((item) => (
          <StatusFilter
            key={item}
            href={`/admin/articles?status=${item}`}
            label={item}
            active={status === item}
          />
        ))}
      </div>
      {!articles.length ? (
        <EmptyState
          title="Chưa có bài viết"
          description="Tạo bài review đầu tiên từ sách đã có trong database."
          action={
            <Link
              href="/admin/articles/new"
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Tạo bài viết
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1120px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
                <tr>
                  <th className="px-4 py-3">Bài viết</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Lịch đăng</th>
                  <th className="px-4 py-3">Sách chính</th>
                  <th className="px-4 py-3">Quality</th>
                  <th className="px-4 py-3">View / Click</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {articles.map((article) => (
                  <tr key={article.id}>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="font-semibold text-stone-950 hover:text-amber-900"
                      >
                        {article.title}
                      </Link>
                      <p className="mt-1 line-clamp-1 text-xs text-stone-500">
                        {article.slug}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-stone-600">{article.type}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={article.status} />
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {article.scheduledAt
                        ? article.scheduledAt.toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })
                        : article.publishedAt
                          ? article.publishedAt.toLocaleDateString("vi-VN")
                          : "Chưa đặt"}
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {article.books.find((item) => item.role === "MAIN")?.book.title ||
                        article.books[0]?.book.title ||
                        "Chưa gắn sách"}
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {getArticleQualitySummary(article).score}/100
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {article._count.pageViews} / {article._count.clickEvents}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/articles/${article.id}/edit`}
                          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                        >
                          Sửa
                        </Link>
                        <form action={deleteArticleAction}>
                          <input type="hidden" name="id" value={article.id} />
                          <button className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
                            Xóa
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

function articleStatus(value?: string) {
  return Object.values(ArticleStatus).includes(value as ArticleStatus)
    ? (value as ArticleStatus)
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
