import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ArticleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { articleAuthorData, resolveEditorialPersona } from "@/lib/editorial-personas";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;

  if (bearerToken !== secret && headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const scheduledArticles = await prisma.article.findMany({
    where: {
      status: ArticleStatus.SCHEDULED,
      scheduledAt: { lte: now },
    },
    include: {
      categories: { select: { name: true } },
      painPoints: { select: { name: true } },
      audiences: { select: { name: true } },
      books: { include: { book: { select: { title: true } } } },
    },
  });

  if (!scheduledArticles.length) {
    return NextResponse.json({ published: 0 });
  }

  // Tự động gán bút danh biên tập nếu bài viết chưa có trước khi publish
  for (const article of scheduledArticles) {
    if (!article.authorName || !article.authorSlug) {
      const persona = resolveEditorialPersona({
        articleType: article.type,
        categoryNames: article.categories.map((c) => c.name),
        painPointNames: article.painPoints.map((p) => p.name),
        audienceNames: article.audiences.map((a) => a.name),
        bookSignals: [
          article.books[0]?.book?.title || "",
          article.title,
          article.focusKeyword || "",
        ],
      });
      await prisma.article.update({
        where: { id: article.id },
        data: articleAuthorData(persona),
      });
    }
  }

  const ids = scheduledArticles.map((article) => article.id);
  const idsWithoutPublishedAt = scheduledArticles
    .filter((article) => !article.publishedAt)
    .map((article) => article.id);
  const idsWithPublishedAt = scheduledArticles
    .filter((article) => article.publishedAt)
    .map((article) => article.id);

  await prisma.$transaction([
    ...(idsWithoutPublishedAt.length
      ? [
          prisma.article.updateMany({
            where: { id: { in: idsWithoutPublishedAt } },
            data: {
              status: ArticleStatus.PUBLISHED,
              publishedAt: now,
              scheduledAt: null,
            },
          }),
        ]
      : []),
    ...(idsWithPublishedAt.length
      ? [
          prisma.article.updateMany({
            where: { id: { in: idsWithPublishedAt } },
            data: {
              status: ArticleStatus.PUBLISHED,
              scheduledAt: null,
            },
          }),
        ]
      : []),
  ]);

  revalidatePath("/");
  revalidatePath("/bai-viet");
  revalidatePath("/bai-viet/[slug]", "page");
  revalidatePath("/noi-dau/[slug]", "page");
  revalidatePath("/chu-de/[slug]", "page");
  revalidatePath("/doi-tuong/[slug]", "page");
  revalidatePath("/cum-noi-dung/[slug]", "page");
  revalidatePath("/sitemap.xml");

  return NextResponse.json({ published: ids.length, articleIds: ids });
}
