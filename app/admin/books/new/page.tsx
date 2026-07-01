import Link from "next/link";
import { AdminBookForm } from "@/components/AdminBookForm";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { createBookAction } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewBookPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [categories, painPoints, audiences] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminShell
      title="Thêm sách"
      description="Tạo sách mới để gắn vào bài review và CTA affiliate."
      actions={
        <Link href="/admin/books" className="rounded-full border border-stone-300 px-4 py-2 text-sm">
          Quay lại
        </Link>
      }
    >
      <AdminNotice error={params.error} success={params.success} />
      <AdminBookForm
        action={createBookAction}
        categories={categories}
        painPoints={painPoints}
        audiences={audiences}
        submitLabel="Tạo sách"
      />
    </AdminShell>
  );
}
