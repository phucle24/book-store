import type { Prisma } from "@prisma/client";
import { ArticleStatus } from "@prisma/client";
import { ArticleCard } from "@/components/ArticleCard";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Bài viết review sách",
  description: "Danh sách bài viết review sách theo chủ đề, nỗi đau và đối tượng đọc.",
  path: "/bai-viet",
});

const pageSize = 9;

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    painPoint?: string;
    audience?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const where: Prisma.ArticleWhereInput = {
    status: ArticleStatus.PUBLISHED,
    ...(params.category
      ? { categories: { some: { slug: params.category } } }
      : {}),
    ...(params.painPoint
      ? { painPoints: { some: { slug: params.painPoint } } }
      : {}),
    ...(params.audience
      ? { audiences: { some: { slug: params.audience } } }
      : {}),
  };

  const [articles, total, categories, painPoints, audiences] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { categories: true, painPoints: true },
    }),
    prisma.article.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
          Thư viện bài viết
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-stone-950">Bài viết review sách</h1>
        <p className="mt-4 leading-7 text-stone-700">
          Lọc bài viết theo chủ đề, nỗi đau hoặc nhóm người đọc để tìm cuốn sách
          hợp với bối cảnh hiện tại.
        </p>
      </div>
      <div className="mt-8">
        <FilterBar categories={categories} painPoints={painPoints} audiences={audiences} />
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
      {!articles.length ? (
        <p className="mt-10 rounded-3xl border border-stone-200 bg-white p-8 text-stone-600">
          Chưa có bài viết phù hợp với bộ lọc này.
        </p>
      ) : null}
      <Pagination
        page={page}
        totalPages={Math.ceil(total / pageSize)}
        basePath="/bai-viet"
        searchParams={params}
      />
    </div>
  );
}
