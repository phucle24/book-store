import Link from "next/link";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { StatusBadge } from "@/components/StatusBadge";
import { deleteBookAction } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const books = await prisma.book.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      categories: true,
      painPoints: true,
      _count: { select: { articles: true, clickEvents: true } },
    },
  });

  const booksWithMissingLinks = books.filter(
    (b) => !b.shopeeAffiliateUrl || b.shopeeAffiliateUrl.includes("search?keyword="),
  ).length;
  const booksWithMissingCover = books.filter((b) => !b.coverImage).length;

  return (
    <AdminShell
      title="Sách"
      description="Quản lý link Shopee affiliate và ảnh bìa sách do AI tự tạo."
    >
      <AdminNotice error={params.error} success={params.success} />

      {/* Action Banner */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            Link Shopee cần cập nhật
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-950">
            {booksWithMissingLinks}{" "}
            <span className="text-sm font-normal text-stone-600">/ {books.length} sách</span>
          </p>
          <p className="mt-1 text-xs text-stone-500">
            AI tạo link search mặc định. Cập nhật link affiliate rút gọn (shope.ee) để tối ưu hoa hồng.
          </p>
        </div>
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-600">
            Ảnh bìa cần bổ sung
          </p>
          <p className="mt-1 text-2xl font-bold text-stone-950">
            {booksWithMissingCover}{" "}
            <span className="text-sm font-normal text-stone-600">/ {books.length} sách</span>
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Bổ sung link ảnh bìa sắc nét để bài review và trang sách hiển thị đẹp hơn.
          </p>
        </div>
      </div>

      {!books.length ? (
        <EmptyState
          title="Chưa có sách nào"
          description="Hệ thống AI Planner sẽ tự động phát hiện và thêm sách mới theo lịch hàng tuần."
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
                <tr>
                  <th className="px-4 py-3">Sách & Tác giả</th>
                  <th className="px-4 py-3">Ảnh bìa</th>
                  <th className="px-4 py-3">Link Shopee</th>
                  <th className="px-4 py-3">Bài / Click</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {books.map((book) => {
                  const isCustomShopee =
                    book.shopeeAffiliateUrl &&
                    !book.shopeeAffiliateUrl.includes("search?keyword=");

                  return (
                    <tr key={book.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/books/${book.id}/edit`}
                          className="font-semibold text-stone-950 hover:text-amber-900"
                        >
                          {book.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-stone-500">{book.author}</p>
                      </td>
                      <td className="px-4 py-4">
                        {book.coverImage ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            ✓ Đã có ảnh
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            ○ Thiếu ảnh
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {isCustomShopee ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            ✓ Link riêng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                            ! Cần link Shopee
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-stone-600">
                        {book._count.articles} bài / {book._count.clickEvents} clicks
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/books/${book.id}/edit`}
                            className="rounded-full bg-stone-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-900"
                          >
                            Cập nhật
                          </Link>
                          <form action={deleteBookAction}>
                            <input type="hidden" name="id" value={book.id} />
                            <button className="rounded-full border border-stone-200 px-2.5 py-1.5 text-xs text-stone-400 hover:border-rose-200 hover:text-rose-600">
                              Xóa
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
