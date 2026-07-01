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

  return (
    <AdminShell
      title="Sách"
      description="Quản lý sách, phân loại và link Shopee affiliate."
      actions={
        <Link
          href="/admin/books/new"
          className="rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-950"
        >
          Thêm sách
        </Link>
      }
    >
      <AdminNotice error={params.error} success={params.success} />
      {!books.length ? (
        <EmptyState
          title="Chưa có sách"
          description="Thêm sách đầu tiên để gắn vào bài review và tạo CTA affiliate."
          action={
            <Link
              href="/admin/books/new"
              className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white"
            >
              Thêm sách
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
                <tr>
                  <th className="px-4 py-3">Sách</th>
                  <th className="px-4 py-3">Phân loại</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Bài / Click</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {books.map((book) => (
                  <tr key={book.id}>
                    <td className="px-4 py-4">
                      <Link
                        href={`/admin/books/${book.id}/edit`}
                        className="font-semibold text-stone-950 hover:text-amber-900"
                      >
                        {book.title}
                      </Link>
                      <p className="mt-1 text-xs text-stone-500">{book.author}</p>
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {book.categories[0]?.name || "Chưa gắn chủ đề"}
                      {book.painPoints[0] ? (
                        <span className="block text-xs text-stone-500">
                          {book.painPoints[0].name}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={book.status} />
                    </td>
                    <td className="px-4 py-4 text-stone-600">
                      {book._count.articles} / {book._count.clickEvents}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/books/${book.id}/edit`}
                          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-stone-100"
                        >
                          Sửa
                        </Link>
                        <form action={deleteBookAction}>
                          <input type="hidden" name="id" value={book.id} />
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
