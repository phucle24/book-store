import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminArticleForm } from "@/components/AdminArticleForm";
import { ArticleAiImprovePanel } from "@/components/ArticleAiImprovePanel";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { updateArticleAction } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const [article, categories, painPoints, audiences, books, clusters, aiGenerations] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: {
        categories: true,
        painPoints: true,
        audiences: true,
        faqs: true,
        sources: { orderBy: { order: "asc" } },
        books: { orderBy: [{ order: "asc" }], include: { book: true } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.book.findMany({ orderBy: { title: "asc" } }),
    prisma.contentCluster.findMany({ orderBy: { name: "asc" } }),
    prisma.aiGeneration.findMany({
      where: { articleId: id, type: "IMPROVE" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  if (!article) notFound();

  return (
    <AdminShell
      title={`Sửa bài viết: ${article.title}`}
      description="Cập nhật markdown, trạng thái, SEO và sách liên quan."
      actions={
        <Link href="/admin/articles" className="rounded-full border border-stone-300 px-4 py-2 text-sm">
          Quay lại
        </Link>
      }
    >
      <AdminNotice error={messages.error} success={messages.success} />
      <ArticleAiImprovePanel articleId={article.id} generations={aiGenerations} />
      <AdminArticleForm
        action={updateArticleAction}
        article={article}
        categories={categories}
        painPoints={painPoints}
        audiences={audiences}
        books={books}
        clusters={clusters}
        submitLabel="Lưu thay đổi"
      />
    </AdminShell>
  );
}
