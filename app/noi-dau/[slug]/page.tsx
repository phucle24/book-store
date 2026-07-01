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
  const painPoint = await prisma.painPoint.findUnique({ where: { slug } });

  return pageMetadata({
    title: painPoint ? `Sách cho ${painPoint.name.toLowerCase()}` : "Nỗi đau người đọc",
    description:
      painPoint?.description ||
      "Gợi ý bài viết và sách theo vấn đề, cảm xúc và giai đoạn người đọc đang trải qua.",
    path: `/noi-dau/${slug}`,
  });
}

export default async function PainPointPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const painPoint = await prisma.painPoint.findUnique({ where: { slug } });
  if (!painPoint) notFound();

  const [articles, books, pillar, clusters] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        painPoints: { some: { id: painPoint.id } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { categories: true, painPoints: true },
    }),
    prisma.book.findMany({
      where: { status: BookStatus.ACTIVE, painPoints: { some: { id: painPoint.id } } },
      include: { painPoints: true },
      take: 8,
    }),
    prisma.article.findFirst({
      where: {
        status: ArticleStatus.PUBLISHED,
        type: "GUIDE",
        painPoints: { some: { id: painPoint.id } },
      },
      include: { categories: true, painPoints: true },
    }),
    prisma.contentCluster.findMany({
      where: { painPointId: painPoint.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
        Nỗi đau người đọc
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-950">{painPoint.name}</h1>
      <TaxonomySeoIntro
        kind="pain"
        name={painPoint.name}
        description={painPoint.description}
      />

      <TaxonomyReadingGuide
        name={painPoint.name}
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
