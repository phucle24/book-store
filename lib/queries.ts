import { cache } from "react";
import { ArticleStatus, BookStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const getPublishedArticleBySlug = cache(async (slug: string) =>
  prisma.article.findFirst({
    where: { slug, status: ArticleStatus.PUBLISHED },
    include: {
      categories: true,
      painPoints: true,
      audiences: true,
      faqs: { orderBy: { order: "asc" } },
      sources: { orderBy: { order: "asc" } },
      reviewInsight: {
        select: { reviewCount: true, productRating: true, soldCount: true },
      },
      affiliateLinks: { where: { isActive: true }, take: 1 },
      books: {
        orderBy: [{ order: "asc" }],
        include: {
          book: {
            include: {
              painPoints: true,
              audiences: true,
              affiliateLinks: { where: { isActive: true }, take: 1 },
            },
          },
        },
      },
    },
  }),
);

export const getActiveBookBySlug = cache(async (slug: string) =>
  prisma.book.findFirst({
    where: { slug, status: BookStatus.ACTIVE },
    include: {
      categories: true,
      painPoints: true,
      audiences: true,
      affiliateLinks: { where: { isActive: true }, take: 1 },
      articles: {
        include: {
          article: {
            include: { categories: true, painPoints: true },
          },
        },
      },
    },
  }),
);
