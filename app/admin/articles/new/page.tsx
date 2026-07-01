import Link from "next/link";
import { AdminArticleForm } from "@/components/AdminArticleForm";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { createArticleAction } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewArticlePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [categories, painPoints, audiences, books, clusters] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.book.findMany({ orderBy: { title: "asc" } }),
    prisma.contentCluster.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <AdminShell
      title="Tạo bài viết"
      description="MVP editor dùng textarea markdown, có SEO fields và FAQ."
      actions={
        <Link href="/admin/articles" className="rounded-full border border-stone-300 px-4 py-2 text-sm">
          Quay lại
        </Link>
      }
    >
      <AdminNotice error={params.error} success={params.success} />
      <AdminArticleForm
        action={createArticleAction}
        categories={categories}
        painPoints={painPoints}
        audiences={audiences}
        books={books}
        clusters={clusters}
        submitLabel="Tạo bài viết"
      />
    </AdminShell>
  );
}
