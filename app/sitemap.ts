import type { MetadataRoute } from "next";
import { ArticleStatus, BookStatus } from "@prisma/client";
import { editorialPersonas } from "@/lib/editorial-personas";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";
import { QUOTE_THEMES } from "@/lib/quote-themes";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "/",
    "/bai-viet",
    "/sach",
    "/bat-dau",
    "/cach-chung-toi-danh-gia",
    "/tiep-thi-lien-ket",
    "/ve-chung-toi",
    "/trich-dan",
  ].map((path) => ({
    url: siteUrl(path),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "/" ? 1 : path === "/trich-dan" ? 0.8 : 0.7,
  }));

  const quoteThemeRoutes = QUOTE_THEMES.map((theme) => ({
    url: siteUrl(`/trich-dan/${theme.slug}`),
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  try {
    const [articles, books, categories, painPoints, audiences, clusters] = await Promise.all([
      prisma.article.findMany({
        where: { status: ArticleStatus.PUBLISHED },
        select: { slug: true, updatedAt: true },
      }),
      prisma.book.findMany({
        where: { status: BookStatus.ACTIVE },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        where: {
          OR: [
            { articles: { some: { status: ArticleStatus.PUBLISHED } } },
            { books: { some: { status: BookStatus.ACTIVE } } },
          ],
        },
        select: { slug: true, updatedAt: true },
      }),
      prisma.painPoint.findMany({
        where: {
          OR: [
            { articles: { some: { status: ArticleStatus.PUBLISHED } } },
            { books: { some: { status: BookStatus.ACTIVE } } },
          ],
        },
        select: { slug: true, updatedAt: true },
      }),
      prisma.audience.findMany({
        where: {
          OR: [
            { articles: { some: { status: ArticleStatus.PUBLISHED } } },
            { books: { some: { status: BookStatus.ACTIVE } } },
          ],
        },
        select: { slug: true, updatedAt: true },
      }),
      prisma.contentCluster.findMany({
        where: { articles: { some: { status: ArticleStatus.PUBLISHED } } },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      ...staticRoutes,
      ...quoteThemeRoutes,
      ...articles.map((item) => ({
        url: siteUrl(`/bai-viet/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.8,
      })),
      ...books.map((item) => ({
        url: siteUrl(`/sach/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.75,
      })),
      ...categories.map((item) => ({
        url: siteUrl(`/chu-de/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })),
      ...painPoints.map((item) => ({
        url: siteUrl(`/noi-dau/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...audiences.map((item) => ({
        url: siteUrl(`/doi-tuong/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      })),
      ...clusters.map((item) => ({
        url: siteUrl(`/cum-noi-dung/${item.slug}`),
        lastModified: item.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
      ...editorialPersonas.map((persona) => ({
        url: siteUrl(`/tac-gia/${persona.slug}`),
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
