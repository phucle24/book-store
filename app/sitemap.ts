import type { MetadataRoute } from "next";
import { ArticleStatus, BookStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "/",
    "/bai-viet",
    "/bat-dau",
    "/tim-kiem",
    "/tiep-thi-lien-ket",
    "/ve-chung-toi",
  ].map((path) => ({
    url: siteUrl(path),
    lastModified: new Date(),
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
      prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.painPoint.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.audience.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.contentCluster.findMany({ select: { slug: true, updatedAt: true } }),
    ]);

    return [
      ...staticRoutes,
      ...articles.map((item) => ({
        url: siteUrl(`/bai-viet/${item.slug}`),
        lastModified: item.updatedAt,
      })),
      ...books.map((item) => ({
        url: siteUrl(`/sach/${item.slug}`),
        lastModified: item.updatedAt,
      })),
      ...categories.map((item) => ({
        url: siteUrl(`/chu-de/${item.slug}`),
        lastModified: item.updatedAt,
      })),
      ...painPoints.map((item) => ({
        url: siteUrl(`/noi-dau/${item.slug}`),
        lastModified: item.updatedAt,
      })),
      ...audiences.map((item) => ({
        url: siteUrl(`/doi-tuong/${item.slug}`),
        lastModified: item.updatedAt,
      })),
      ...clusters.map((item) => ({
        url: siteUrl(`/cum-noi-dung/${item.slug}`),
        lastModified: item.updatedAt,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
