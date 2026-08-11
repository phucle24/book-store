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

export const revalidate = 900;

export async function generateStaticParams() {
  const audiences = await prisma.audience.findMany({
    where: {
      OR: [
        { articles: { some: { status: ArticleStatus.PUBLISHED } } },
        { books: { some: { status: BookStatus.ACTIVE } } },
      ],
    },
    select: { slug: true },
  });

  return audiences.map((audience) => ({ slug: audience.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const audience = await prisma.audience.findUnique({ where: { slug } });

  return pageMetadata({
    title: audience ? `Sách cho ${audience.name.toLowerCase()}` : "Đối tượng đọc",
    description:
      audience?.description ||
      "Gợi ý sách và bài review theo từng nhóm người đọc.",
    path: `/doi-tuong/${slug}`,
  });
}

export default async function AudiencePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const audience = await prisma.audience.findUnique({ where: { slug } });
  if (!audience) notFound();

  const [articles, books, pillar, clusters] = await Promise.all([
    prisma.article.findMany({
      where: {
        status: ArticleStatus.PUBLISHED,
        audiences: { some: { id: audience.id } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      include: { categories: true, painPoints: true },
    }),
    prisma.book.findMany({
      where: { status: BookStatus.ACTIVE, audiences: { some: { id: audience.id } } },
      include: { painPoints: true },
      take: 8,
    }),
    prisma.article.findFirst({
      where: {
        status: ArticleStatus.PUBLISHED,
        type: "GUIDE",
        audiences: { some: { id: audience.id } },
      },
      include: { categories: true, painPoints: true },
    }),
    prisma.contentCluster.findMany({
      where: { audienceId: audience.id },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
        Đối tượng đọc
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-950">{audience.name}</h1>
      <TaxonomySeoIntro
        kind="audience"
        name={audience.name}
        description={audience.description}
      />

      <TaxonomyReadingGuide
        name={audience.name}
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
