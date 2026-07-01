import { notFound } from "next/navigation";
import { ArticleStatus, BookStatus } from "@prisma/client";
import { ArticleCard } from "@/components/ArticleCard";
import { ClusterLinks } from "@/components/ClusterLinks";
import { TaxonomySeoIntro } from "@/components/TaxonomySeoIntro";
import {
  TaxonomyContentSections,
  TaxonomyReadingGuide,
} from "@/components/TaxonomyReadingGuide";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });

  return pageMetadata({
    title: category?.seoTitle || category?.name || "Chủ đề sách",
    description:
      category?.seoDescription ||
      category?.description ||
      "Bài viết và sách được phân loại theo chủ đề.",
    path: `/chu-de/${slug}`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();

  const [articles, books, pillar, clusters] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        categories: { some: { id: category.id } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { categories: true, painPoints: true },
    }),
    prisma.book.findMany({
      where: { status: BookStatus.ACTIVE, categories: { some: { id: category.id } } },
      include: { painPoints: true },
      take: 8,
    }),
    prisma.article.findFirst({
      where: {
        status: ArticleStatus.PUBLISHED,
        type: "GUIDE",
        categories: { some: { id: category.id } },
      },
      include: { categories: true, painPoints: true },
    }),
    prisma.contentCluster.findMany({
      where: { categoryId: category.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
        Chủ đề
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-950">{category.name}</h1>
      <TaxonomySeoIntro
        kind="category"
        name={category.name}
        description={category.description}
      />

      <TaxonomyReadingGuide
        name={category.name}
        articles={articles}
        books={books}
        pillar={pillar}
      />

      <ClusterLinks clusters={clusters} />

      {pillar ? (
        <section className="mt-10">
          <h2 className="text-2xl font-semibold text-stone-950">Bài pillar</h2>
          <div className="mt-5 max-w-xl">
            <ArticleCard article={pillar} />
          </div>
        </section>
      ) : null}

      <TaxonomyContentSections articles={articles} books={books} />
    </div>
  );
}
