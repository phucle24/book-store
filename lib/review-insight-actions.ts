"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ArticleBookRole,
  ArticleStatus,
  ArticleType,
  BookStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  analyzeShopeeReviews,
  DeepSeekConfigError,
  generateArticleFromReviewInsight,
} from "@/lib/deepseek";
import { articleAuthorData, resolveEditorialPersona } from "@/lib/editorial-personas";
import { readingTimeFromMarkdown } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.coerce.number().optional(),
);

const reviewInsightSchema = z.object({
  bookTitle: z.string().trim().min(1, "Thiếu tên sách."),
  author: z.string().trim().optional(),
  shopeeProductUrl: z.string().trim().url("Link sản phẩm Shopee không hợp lệ."),
  affiliateUrl: z.string().trim().url("Link affiliate không hợp lệ."),
  productPrice: optionalNumber,
  productRating: optionalNumber,
  soldCount: optionalNumber,
  rawReviews: z.string().trim().min(1, "Thiếu review đã paste."),
  notes: z.string().trim().optional(),
});

const articleOutputSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().optional(),
  excerpt: z.string().trim().min(1),
  seoTitle: z.string().trim().min(1),
  seoDescription: z.string().trim().min(1),
  contentMarkdown: z.string().trim().min(1),
});

const insightOutputSchema = z.object({
  positivePoints: z.array(z.string()).default([]),
  negativePoints: z.array(z.string()).default([]),
  buyerPersonas: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
  emotionalHooks: z.array(z.string()).default([]),
  objections: z.array(z.string()).default([]),
  purchaseReasons: z.array(z.string()).default([]),
  articleAngles: z.array(z.string()).default([]),
  summary: z.string().default(""),
});

export async function createReviewInsightAction(formData: FormData) {
  await requireAdmin();

  const parsed = reviewInsightSchema.safeParse({
    bookTitle: textValue(formData, "bookTitle"),
    author: textValue(formData, "author"),
    shopeeProductUrl: textValue(formData, "shopeeProductUrl"),
    affiliateUrl: textValue(formData, "affiliateUrl"),
    productPrice: textValue(formData, "productPrice"),
    productRating: textValue(formData, "productRating"),
    soldCount: textValue(formData, "soldCount"),
    rawReviews: textValue(formData, "rawReviews"),
    notes: textValue(formData, "notes"),
  });

  if (!parsed.success) {
    redirect(
      `/admin/review-insights/new?error=${encodeURIComponent(
        parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ.",
      )}`,
    );
  }

  const data = parsed.data;
  const insight = await prisma.reviewInsight.create({
    data: {
      bookTitle: data.bookTitle,
      author: nullable(data.author),
      shopeeProductUrl: data.shopeeProductUrl,
      affiliateUrl: data.affiliateUrl,
      productPrice: data.productPrice ? Math.round(data.productPrice) : null,
      productRating: data.productRating ?? null,
      soldCount: data.soldCount ? Math.round(data.soldCount) : null,
      rawReviews: data.rawReviews,
      notes: nullable(data.notes),
      reviewCount: countReviews(data.rawReviews),
      status: "draft",
    },
  });

  revalidateReviewInsightPaths();
  redirect(`/admin/review-insights/${insight.id}?success=Đã lưu review insight.`);
}

export async function analyzeReviewInsightAction(formData: FormData) {
  await requireAdmin();

  const id = requiredId(formData);
  const insight = await prisma.reviewInsight.findUnique({ where: { id } });
  if (!insight) redirect("/admin/review-insights?error=Không tìm thấy review insight.");

  try {
    const rawOutput = await analyzeShopeeReviews({
      bookTitle: insight.bookTitle,
      author: insight.author,
      rawReviews: insight.rawReviews,
    });
    const parsed = insightOutputSchema.safeParse(parseJsonOutput(rawOutput));

    if (!parsed.success) {
      redirect(
        `/admin/review-insights/${id}?error=${encodeURIComponent(
          "AI trả về JSON chưa đúng cấu trúc. Hãy thử Analyze lại.",
        )}`,
      );
    }

    const data = parsed.data;
    await prisma.reviewInsight.update({
      where: { id },
      data: {
        status: "analyzed",
        positivePoints: data.positivePoints,
        negativePoints: data.negativePoints,
        buyerPersonas: data.buyerPersonas,
        painPoints: data.painPoints,
        emotionalHooks: data.emotionalHooks,
        objections: data.objections,
        purchaseReasons: data.purchaseReasons,
        articleAngles: data.articleAngles,
        summary: data.summary,
      },
    });

    revalidateReviewInsightPaths();
    redirect(`/admin/review-insights/${id}?success=Đã phân tích review.`);
  } catch (error) {
    if (error instanceof DeepSeekConfigError) {
      redirect(`/admin/review-insights/${id}?error=${encodeURIComponent(error.message)}`);
    }
    console.error(error);
    redirect(
      `/admin/review-insights/${id}?error=${encodeURIComponent(
        "Không phân tích được review lúc này. Kiểm tra DeepSeek API hoặc thử lại.",
      )}`,
    );
  }
}

export async function generateArticleFromReviewInsightAction(formData: FormData) {
  await requireAdmin();

  const id = requiredId(formData);
  const insight = await prisma.reviewInsight.findUnique({ where: { id } });
  if (!insight) redirect("/admin/review-insights?error=Không tìm thấy review insight.");

  if (!insight.positivePoints || !insight.painPoints || !insight.articleAngles) {
    redirect(`/admin/review-insights/${id}?error=Cần Analyze Reviews trước khi tạo bài viết.`);
  }

  try {
    const rawOutput = await generateArticleFromReviewInsight({
      bookTitle: insight.bookTitle,
      author: insight.author,
      affiliateUrl: insight.affiliateUrl,
      positivePoints: insight.positivePoints,
      negativePoints: insight.negativePoints,
      buyerPersonas: insight.buyerPersonas,
      painPoints: insight.painPoints,
      emotionalHooks: insight.emotionalHooks,
      objections: insight.objections,
      purchaseReasons: insight.purchaseReasons,
      articleAngles: insight.articleAngles,
      summary: insight.summary,
    });
    const parsed = articleOutputSchema.safeParse(parseJsonOutput(rawOutput));

    if (!parsed.success) {
      redirect(
        `/admin/review-insights/${id}?error=${encodeURIComponent(
          "AI trả về bài viết chưa đúng cấu trúc. Hãy thử Generate lại.",
        )}`,
      );
    }

    const output = parsed.data;
    const slug = await uniqueArticleSlug(output.slug || output.title);
    const book = await findOrCreateBookFromInsight({
      bookTitle: insight.bookTitle,
      author: insight.author,
      affiliateUrl: insight.affiliateUrl,
      excerpt: output.excerpt,
      summary: insight.summary,
      positivePoints: insight.positivePoints,
      negativePoints: insight.negativePoints,
      painPoints: insight.painPoints,
    });
    const publishMode = textValue(formData, "publishMode");
    const isScheduled = publishMode === "scheduled";
    const articleAuthor = articleAuthorData(
      resolveEditorialPersona({
        articleType: ArticleType.REVIEW,
        painPointNames: jsonStringArray(insight.painPoints),
        audienceNames: jsonStringArray(insight.buyerPersonas),
        bookSignals: [insight.bookTitle, insight.summary || ""],
      }),
    );
    const scheduledAt = isScheduled
      ? parseVietnamDatetimeLocal(textValue(formData, "scheduledAt")) ||
        defaultVietnamScheduledDate()
      : null;
    const article = await prisma.article.create({
      data: {
        reviewInsightId: insight.id,
        title: output.title,
        slug,
        excerpt: output.excerpt,
        content: output.contentMarkdown,
        type: ArticleType.REVIEW,
        status: isScheduled ? ArticleStatus.SCHEDULED : ArticleStatus.DRAFT,
        seoTitle: output.seoTitle,
        seoDescription: output.seoDescription,
        focusKeyword: insight.bookTitle,
        ...articleAuthor,
        readingTime: readingTimeFromMarkdown(output.contentMarkdown),
        scheduledAt,
        books: {
          create: {
            bookId: book.id,
            role: ArticleBookRole.MAIN,
            order: 0,
          },
        },
        affiliateLinks: {
          create: {
            bookId: book.id,
            label: `Xem giá ${insight.bookTitle}`,
            destinationUrl: insight.affiliateUrl,
            trackingSlug: await uniqueTrackingSlug(`review-${slug}`),
            isActive: true,
          },
        },
      },
    });

    await prisma.reviewInsight.update({
      where: { id: insight.id },
      data: { status: "article_generated" },
    });
    await ensureBookAffiliateLink(book.id, book.title, book.slug, insight.affiliateUrl);

    revalidateReviewInsightPaths();
    redirect(
      `/admin/articles/${article.id}/edit?success=${encodeURIComponent(
        isScheduled
          ? "Đã tạo và lên lịch article từ review insight."
          : "Đã tạo article draft từ review insight.",
      )}`,
    );
  } catch (error) {
    if (error instanceof DeepSeekConfigError) {
      redirect(`/admin/review-insights/${id}?error=${encodeURIComponent(error.message)}`);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect(`/admin/review-insights/${id}?error=Slug hoặc tracking slug đã tồn tại.`);
    }
    console.error(error);
    redirect(
      `/admin/review-insights/${id}?error=${encodeURIComponent(
        "Không tạo được bài viết lúc này. Kiểm tra DeepSeek API hoặc thử lại.",
      )}`,
    );
  }
}

export async function deleteReviewInsightAction(formData: FormData) {
  await requireAdmin();
  await prisma.reviewInsight.delete({ where: { id: requiredId(formData) } });
  revalidateReviewInsightPaths();
  redirect("/admin/review-insights?success=Đã xóa review insight.");
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function requiredId(formData: FormData) {
  const id = textValue(formData, "id");
  if (!id) redirect("/admin/review-insights?error=Thiếu ID bản ghi.");
  return id;
}

function nullable(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function countReviews(rawReviews: string) {
  const paragraphs = rawReviews
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs.length;

  const lines = rawReviews
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  return Math.max(1, lines.length);
}

function parseVietnamDatetimeLocal(value?: string) {
  if (!value) return null;
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) return null;

  const [, year, month, day, hour, minute, second = "0"] = match;
  const date = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour) - 7,
      Number(minute),
      Number(second),
    ),
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function defaultVietnamScheduledDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(
    Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day) + 1, 1, 0, 0),
  );
}

function parseJsonOutput(output: string) {
  const cleaned = output
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

async function uniqueArticleSlug(input: string) {
  const base = slugify(input) || `review-insight-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (await prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function uniqueBookSlug(input: string) {
  const base = slugify(input) || `book-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (await prisma.book.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function uniqueTrackingSlug(input: string) {
  const base = slugify(input) || `review-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (
    await prisma.affiliateLink.findUnique({
      where: { trackingSlug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function findOrCreateBookFromInsight({
  bookTitle,
  author,
  affiliateUrl,
  excerpt,
  summary,
  positivePoints,
  negativePoints,
  painPoints,
}: {
  bookTitle: string;
  author?: string | null;
  affiliateUrl: string;
  excerpt: string;
  summary?: string | null;
  positivePoints: unknown;
  negativePoints: unknown;
  painPoints: unknown;
}) {
  const existing = await prisma.book.findFirst({
    where: {
      title: { equals: bookTitle, mode: "insensitive" },
    },
  });

  if (existing) {
    return prisma.book.update({
      where: { id: existing.id },
      data: {
        author: existing.author || author || "Không rõ",
        shopeeAffiliateUrl: existing.shopeeAffiliateUrl || affiliateUrl,
        status: BookStatus.ACTIVE,
      },
    });
  }

  return prisma.book.create({
    data: {
      title: bookTitle,
      slug: await uniqueBookSlug(bookTitle),
      author: author || "Không rõ",
      description:
        summary?.trim() ||
        excerpt ||
        `Ghi chú nội bộ cho ${bookTitle}, tạo từ Review Insight Collector.`,
      shopeeAffiliateUrl: affiliateUrl,
      status: BookStatus.ACTIVE,
      pros: jsonStringArray(positivePoints).slice(0, 5),
      cons: jsonStringArray(negativePoints).slice(0, 5),
      keyLessons: jsonStringArray(painPoints).slice(0, 4),
      suitableFor: jsonStringArray(painPoints).slice(0, 4),
      notSuitableFor: ["Bạn muốn một cam kết chắc chắn rằng sách sẽ giải quyết mọi vấn đề."],
    },
  });
}

async function ensureBookAffiliateLink(
  bookId: string,
  title: string,
  slug: string,
  destinationUrl: string,
) {
  const existing = await prisma.affiliateLink.findFirst({
    where: { bookId, articleId: null },
  });
  const data = {
    bookId,
    articleId: null,
    label: `Xem giá ${title}`,
    destinationUrl,
    trackingSlug: await uniqueTrackingSlug(`book-${slug}`),
    isActive: true,
  };

  if (existing) {
    await prisma.affiliateLink.update({
      where: { id: existing.id },
      data: {
        label: data.label,
        destinationUrl: data.destinationUrl,
        isActive: true,
      },
    });
    return;
  }

  await prisma.affiliateLink.create({ data });
}

function jsonStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
    : [];
}

function revalidateReviewInsightPaths() {
  revalidatePath("/admin");
  revalidatePath("/admin/review-insights");
  revalidatePath("/admin/articles");
}
