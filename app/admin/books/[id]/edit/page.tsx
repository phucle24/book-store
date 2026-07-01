import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBookForm } from "@/components/AdminBookForm";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { updateBookAction } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const [book, categories, painPoints, audiences] = await Promise.all([
    prisma.book.findUnique({
      where: { id },
      include: { categories: true, painPoints: true, audiences: true },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!book) notFound();

  return (
    <AdminShell
      title={`Sửa sách: ${book.title}`}
      description="Cập nhật nội dung sách, phân loại và affiliate link."
      actions={
        <Link href="/admin/books" className="rounded-full border border-stone-300 px-4 py-2 text-sm">
          Quay lại
        </Link>
      }
    >
      <AdminNotice error={messages.error} success={messages.success} />
      <AdminBookForm
        action={updateBookAction}
        book={book}
        categories={categories}
        painPoints={painPoints}
        audiences={audiences}
        submitLabel="Lưu thay đổi"
      />
    </AdminShell>
  );
}
