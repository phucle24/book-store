"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AiGenerationType,
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
  extractBookFactsFromSources,
  generateAutopilotArticle,
  generateAutopilotBookData,
  improveDraft,
} from "@/lib/deepseek";
import { readingTimeFromMarkdown } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { ResearchConfigError, researchBookSources } from "@/lib/research";
import { slugify } from "@/lib/slugify";

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => !value || isValidUrl(value), "URL không hợp lệ.");

const autopilotSchema = z.object({
  intent: z.enum(["research", "book", "draft", "schedule", "publish"]),
  researchRunId: z.string().trim().optional(),
  bookTitle: z.string().trim().min(1, "Thiếu tên sách."),
  author: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  affiliateUrl: optionalUrl.optional(),
  productUrl: optionalUrl.optional(),
  manualBookData: z.string().trim().optional(),
  sourceNotes: z.string().trim().optional(),
  rawReviews: z.string().trim().optional(),
  focusKeyword: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  painPointId: z.string().trim().optional(),
  audienceId: z.string().trim().optional(),
  tone: z.string().trim().optional(),
  scheduledAt: z.string().trim().optional(),
});

const sourceFactSchema = z.object({
  url: z.string().optional().default(""),
  title: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  facts: z.array(z.string()).optional().default([]),
  confidence: z.number().optional().default(0.5),
  warnings: z.array(z.string()).optional().default([]),
});

const extractionSchema = z.object({
  overallSummary: z.string().optional().default(""),
  bookFacts: z.unknown().optional(),
  sourceFacts: z.array(sourceFactSchema).optional().default([]),
  insights: z.unknown().optional(),
  adminCheck: z.array(z.string()).optional().default([]),
  warnings: z.array(z.string()).optional().default([]),
  confidence: z.number().optional().default(0.45),
});

const bookDataSchema = z.object({
  title: z.string().trim().optional().default(""),
  author: z.string().trim().optional().default("Không rõ"),
  publisher: z.string().trim().optional().default(""),
  description: z.string().trim().optional().default(""),
  pros: z.array(z.string()).optional().default([]),
  cons: z.array(z.string()).optional().default([]),
  keyLessons: z.array(z.string()).optional().default([]),
  suitableFor: z.array(z.string()).optional().default([]),
  notSuitableFor: z.array(z.string()).optional().default([]),
  categoryNames: z.array(z.string()).optional().default([]),
  painPointNames: z.array(z.string()).optional().default([]),
  audienceNames: z.array(z.string()).optional().default([]),
  warnings: z.array(z.string()).optional().default([]),
  confidence: z.number().optional().default(0.45),
});

const articleOutputSchema = z.object({
  title: z.string().trim().min(1),
  slug: z.string().trim().optional().default(""),
  excerpt: z.string().trim().min(1),
  seoTitle: z.string().trim().min(1),
  seoDescription: z.string().trim().min(1),
  focusKeyword: z.string().trim().optional().default(""),
  contentMarkdown: z.string().trim().min(1),
  faqs: z
    .array(
      z.object({
        question: z.string().trim().min(1),
        answer: z.string().trim().min(1),
      }),
    )
    .optional()
    .default([]),
  warnings: z.array(z.string()).optional().default([]),
  confidence: z.number().optional().default(0.45),
});

const reviewInsightSchema = z.object({
  positivePoints: z.array(z.string()).optional().default([]),
  negativePoints: z.array(z.string()).optional().default([]),
  buyerPersonas: z.array(z.string()).optional().default([]),
  painPoints: z.array(z.string()).optional().default([]),
  emotionalHooks: z.array(z.string()).optional().default([]),
  objections: z.array(z.string()).optional().default([]),
  purchaseReasons: z.array(z.string()).optional().default([]),
  articleAngles: z.array(z.string()).optional().default([]),
  summary: z.string().optional().default(""),
});

type AutopilotForm = z.infer<typeof autopilotSchema>;
type Extraction = z.infer<typeof extractionSchema>;
type BookData = z.infer<typeof bookDataSchema>;
type ArticleOutput = z.infer<typeof articleOutputSchema>;

export async function runAiAutopilotAction(formData: FormData) {
  await requireAdmin();

  const parsed = autopilotSchema.safeParse({
    intent: textValue(formData, "intent"),
    researchRunId: textValue(formData, "researchRunId"),
    bookTitle: textValue(formData, "bookTitle"),
    author: textValue(formData, "author"),
    publisher: textValue(formData, "publisher"),
    affiliateUrl: textValue(formData, "affiliateUrl"),
    productUrl: textValue(formData, "productUrl"),
    manualBookData: textValue(formData, "manualBookData"),
    sourceNotes: textValue(formData, "sourceNotes"),
    rawReviews: textValue(formData, "rawReviews"),
    focusKeyword: textValue(formData, "focusKeyword"),
    categoryId: textValue(formData, "categoryId"),
    painPointId: textValue(formData, "painPointId"),
    audienceId: textValue(formData, "audienceId"),
    tone: textValue(formData, "tone"),
    scheduledAt: textValue(formData, "scheduledAt"),
  });

  if (!parsed.success) {
    redirect(`/admin/ai?error=${encodeURIComponent(firstError(parsed.error))}`);
  }

  const input = parsed.data;
  if (["draft", "schedule", "publish"].includes(input.intent) && !input.affiliateUrl) {
    redirect("/admin/ai?error=Thiếu affiliate URL để tạo CTA cuối bài.");
  }

  try {
    if (input.intent === "research") {
      const run = await performResearchRun(input);
      redirect(`/admin/ai?researchRunId=${run.id}&success=Đã research nguồn cho sách.`);
    }

    const run = await ensureResearchRun(input);
    const { extraction, bookData } = await ensureBookData(run.id, input);
    const book = await upsertBookFromAutopilot(input, bookData);

    await prisma.researchRun.update({
      where: { id: run.id },
      data: {
        status: "BOOK_GENERATED",
        createdBookId: book.id,
        sourceSummary: mergeSourceSummary(extraction, bookData),
        warnings: uniqueStrings([...run.warnings, ...bookData.warnings]),
        confidence: combinedConfidence(extraction.confidence, bookData.confidence),
      },
    });

    await ensureBookAffiliateLink(book.id, book.title, book.slug, input.affiliateUrl);

    if (input.intent === "book") {
      revalidateAdminAi();
      redirect(
        `/admin/ai?researchRunId=${run.id}&success=${encodeURIComponent(
          "Đã tạo/cập nhật dữ liệu sách từ research.",
        )}`,
      );
    }

    const reviewInsight = await maybeCreateReviewInsight(input);
    const articleOutput = await generateArticlePayload(input, extraction, bookData, reviewInsight);
    const taxonomy = await taxonomyConnectData(input, bookData);
    const quality = articleQualityGate({
      intent: input.intent,
      extraction,
      bookData,
      article: articleOutput,
      usedSourceCount: await usedSourceCount(run.id),
      hasManualData: Boolean(input.manualBookData || input.sourceNotes || input.rawReviews),
      hasAffiliateUrl: Boolean(input.affiliateUrl),
    });
    const status = statusForIntent(input.intent, quality.canPublish);
    const slug = await uniqueArticleSlug(articleOutput.slug || articleOutput.title);
    const scheduledAt =
      status === ArticleStatus.SCHEDULED
        ? parseVietnamDatetimeLocal(input.scheduledAt) || defaultVietnamScheduledDate()
        : null;

    const article = await prisma.article.create({
      data: {
        reviewInsightId: reviewInsight?.id,
        title: articleOutput.title,
        slug,
        excerpt: articleOutput.excerpt,
        content: articleOutput.contentMarkdown,
        type: ArticleType.REVIEW,
        status,
        seoTitle: articleOutput.seoTitle,
        seoDescription: articleOutput.seoDescription,
        focusKeyword: articleOutput.focusKeyword || input.focusKeyword || input.bookTitle,
        readingTime: readingTimeFromMarkdown(articleOutput.contentMarkdown),
        publishedAt: status === ArticleStatus.PUBLISHED ? new Date() : null,
        scheduledAt,
        categories: taxonomy.categories,
        painPoints: taxonomy.painPoints,
        audiences: taxonomy.audiences,
        books: {
          create: {
            bookId: book.id,
            role: ArticleBookRole.MAIN,
            order: 0,
          },
        },
        faqs: {
          create: articleOutput.faqs.slice(0, 6).map((faq, index) => ({
            question: faq.question,
            answer: faq.answer,
            order: index,
          })),
        },
        affiliateLinks: input.affiliateUrl
          ? {
              create: {
                bookId: book.id,
                label: `Xem giá ${book.title}`,
                destinationUrl: input.affiliateUrl,
                trackingSlug: await uniqueTrackingSlug(`ai-${slug}`),
                isActive: true,
              },
            }
          : undefined,
      },
    });

    await prisma.aiGeneration.create({
      data: {
        type: "DRAFT",
        inputJson: {
          source: "ai_autopilot",
          researchRunId: run.id,
          extraction,
          bookData,
          qualityWarnings: quality.warnings,
        } as Prisma.InputJsonValue,
        outputMarkdown: articleOutput.contentMarkdown,
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        articleId: article.id,
        bookId: book.id,
      },
    });

    await prisma.researchRun.update({
      where: { id: run.id },
      data: {
        status: "ARTICLE_CREATED",
        createdBookId: book.id,
        createdArticleId: article.id,
        sourceSummary: mergeSourceSummary(extraction, bookData, articleOutput, quality),
        warnings: uniqueStrings([
          ...run.warnings,
          ...extraction.warnings,
          ...bookData.warnings,
          ...articleOutput.warnings,
          ...quality.warnings,
        ]),
        confidence: combinedConfidence(
          extraction.confidence,
          bookData.confidence,
          articleOutput.confidence,
        ),
      },
    });

    revalidateAdminAi();
    const statusText =
      status === ArticleStatus.PUBLISHED
        ? "Đã publish bài viết."
        : status === ArticleStatus.SCHEDULED
          ? "Đã tạo và lên lịch bài viết."
          : quality.canPublish
            ? "Đã tạo article draft."
            : "Nguồn/chất lượng chưa đủ mạnh nên bài được đưa vào REVIEW.";
    redirect(
      `/admin/ai?researchRunId=${run.id}&success=${encodeURIComponent(
        `${statusText} Bấm “Review bài” để kiểm tra thủ công.`,
      )}`,
    );
  } catch (error) {
    if (error instanceof DeepSeekConfigError || error instanceof ResearchConfigError) {
      redirect(`/admin/ai?error=${encodeURIComponent(error.message)}`);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/admin/ai?error=Slug hoặc tracking slug đã tồn tại, hãy thử lại.");
    }
    console.error(error);
    redirect(
      `/admin/ai?error=${encodeURIComponent(
        "Không chạy được AI Autopilot lúc này. Kiểm tra API key, nguồn dữ liệu hoặc thử lại.",
      )}`,
    );
  }
}

export async function improveAutopilotArticleAction(formData: FormData) {
  await requireAdmin();

  const researchRunId = textValue(formData, "researchRunId");
  if (!researchRunId) redirect("/admin/ai?error=Thiếu research run.");

  const run = await prisma.researchRun.findUnique({
    where: { id: researchRunId },
    include: {
      sources: {
        where: { status: "USED" },
        orderBy: { createdAt: "asc" },
        take: 10,
      },
      createdArticle: {
        include: {
          painPoints: true,
          audiences: true,
          books: {
            orderBy: [{ order: "asc" }],
            include: { book: true },
          },
          reviewInsight: true,
        },
      },
      createdBook: true,
    },
  });

  if (!run?.createdArticle) {
    redirect(`/admin/ai?researchRunId=${researchRunId}&error=Chưa có bài viết để AI chỉnh sửa.`);
  }

  const article = run.createdArticle;
  const mainBook =
    article.books.find((item) => item.role === ArticleBookRole.MAIN)?.book ||
    article.books[0]?.book ||
    run.createdBook ||
    null;
  const sourceNotes = run.sources
    .map((source) => {
      const label = source.title || source.domain || source.url || "Nguồn không tên";
      return `- ${label}: ${source.summary || "Không có summary."}`;
    })
    .join("\n");
  const extraNotes = [
    "Đây là bài do AI Autopilot tạo. Hãy tự biên tập lại trực tiếp để bài đọc tự nhiên hơn, giàu góc nhìn hơn và ít template hơn.",
    "Không chèn CTA hoặc affiliate link trong markdown; layout website đã có CTA cuối bài.",
    "Giữ các section chính: Sách nói về gì, Review chi tiết, Ai nên đọc, Ai không nên đọc, Điểm hạn chế, Nên đọc cuốn này như thế nào.",
    "Không quote nguồn hoặc review người mua. Chỉ dùng nguồn làm nền insight.",
    run.warnings.length ? `Cảnh báo từ research run: ${run.warnings.join("; ")}` : "",
    sourceNotes ? `Nguồn/signal đã dùng:\n${sourceNotes}` : "",
    article.reviewInsight
      ? `ReviewInsight summary: ${article.reviewInsight.summary || "Không có summary."}`
      : "Không có ReviewInsight analyzed.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const improvedMarkdown = await improveDraft({
      contentType: "Review sách",
      book: mainBook
        ? {
            id: mainBook.id,
            title: mainBook.title,
            author: mainBook.author,
            publisher: mainBook.publisher,
            description: mainBook.description,
            pros: mainBook.pros,
            cons: mainBook.cons,
            keyLessons: mainBook.keyLessons,
            suitableFor: mainBook.suitableFor,
            notSuitableFor: mainBook.notSuitableFor,
          }
        : null,
      painPoint: article.painPoints[0] || null,
      audience: article.audiences[0] || null,
      focusKeyword: article.focusKeyword || article.title,
      tone: "ấm, từng trải, có góc nhìn người đọc, không quảng cáo",
      extraNotes,
      verifiedRead: false,
      draft: article.content,
    });

    await prisma.$transaction([
      prisma.aiGeneration.create({
        data: {
          type: AiGenerationType.IMPROVE,
          inputJson: {
            source: "ai_autopilot_auto_improve",
            researchRunId: run.id,
            articleId: article.id,
            previousContent: article.content,
            extraNotes,
          },
          outputMarkdown: improvedMarkdown,
          model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
          articleId: article.id,
          bookId: mainBook?.id,
        },
      }),
      prisma.article.update({
        where: { id: article.id },
        data: {
          content: improvedMarkdown,
          readingTime: readingTimeFromMarkdown(improvedMarkdown),
        },
      }),
    ]);

    revalidateAdminAi();
    revalidatePath(`/admin/articles/${article.id}/edit`);
    redirect(
      `/admin/ai?researchRunId=${run.id}&success=${encodeURIComponent(
        "AI đã tự chỉnh sửa bài. Bấm “Review bài” để kiểm tra thủ công trước khi publish.",
      )}`,
    );
  } catch (error) {
    if (error instanceof DeepSeekConfigError) {
      redirect(`/admin/ai?researchRunId=${run.id}&error=${encodeURIComponent(error.message)}`);
    }
    console.error(error);
    redirect(
      `/admin/ai?researchRunId=${run.id}&error=${encodeURIComponent(
        "Không tự chỉnh sửa được bài lúc này. Kiểm tra DeepSeek API hoặc thử lại.",
      )}`,
    );
  }
}

async function performResearchRun(input: AutopilotForm) {
  const research = await researchBookSources({
    bookTitle: input.bookTitle,
    author: input.author,
    productUrl: input.productUrl,
    manualBookData: input.manualBookData,
    sourceNotes: input.sourceNotes,
    rawReviews: input.rawReviews,
  });
  const extractionRaw = await extractBookFactsFromSources({
    bookTitle: input.bookTitle,
    author: input.author,
    productUrl: input.productUrl,
    manualBookData: input.manualBookData,
    sourceNotes: input.sourceNotes,
    rawReviews: input.rawReviews,
    sources: research.candidates
      .filter((candidate) => candidate.status === "USED")
      .map((candidate) => ({
        url: candidate.url,
        domain: candidate.domain,
        title: candidate.title,
        sourceType: candidate.sourceType,
        summary: candidate.summary,
        excerptForAi: candidate.excerptForAi,
      })),
  });
  const extraction = parseExtraction(extractionRaw);
  const run = await prisma.researchRun.create({
    data: {
      bookTitle: input.bookTitle,
      author: nullable(input.author),
      affiliateUrl: nullable(input.affiliateUrl),
      productUrl: nullable(input.productUrl),
      manualBookData: nullable(input.manualBookData),
      sourceNotes: nullable(input.sourceNotes),
      rawReviews: nullable(input.rawReviews),
      status: "RESEARCHED",
      warnings: uniqueStrings([...research.warnings, ...extraction.warnings]),
      sourceSummary: { extraction } as Prisma.InputJsonValue,
      confidence: extraction.confidence,
      sources: {
        create: research.candidates.map((candidate) => ({
          url: nullable(candidate.url || ""),
          domain: nullable(candidate.domain || ""),
          title: nullable(candidate.title || ""),
          sourceType: candidate.sourceType,
          status: candidate.status,
          summary: nullable(candidate.summary || ""),
          facts: sourceFactsFor(candidate, extraction) as Prisma.InputJsonValue,
          confidence: candidate.confidence ?? null,
          contentHash: nullable(candidate.contentHash || ""),
          skipReason: nullable(candidate.skipReason || ""),
        })),
      },
    },
  });

  return run;
}

async function ensureResearchRun(input: AutopilotForm) {
  if (input.researchRunId) {
    const existing = await prisma.researchRun.findUnique({
      where: { id: input.researchRunId },
      include: { sources: true },
    });
    if (existing) return existing;
  }

  return performResearchRun(input);
}

async function ensureBookData(runId: string, input: AutopilotForm) {
  const run = await prisma.researchRun.findUnique({
    where: { id: runId },
    include: { sources: true },
  });
  if (!run) throw new Error("ResearchRun không tồn tại.");

  const summary = (run.sourceSummary || {}) as {
    extraction?: unknown;
    bookData?: unknown;
  };
  const extraction = extractionSchema.parse(summary.extraction || {});
  const existingBookData = bookDataSchema.safeParse(summary.bookData);
  if (existingBookData.success && existingBookData.data.title) {
    return { extraction, bookData: existingBookData.data };
  }

  const raw = await generateAutopilotBookData({
    bookTitle: input.bookTitle,
    author: input.author,
    productUrl: input.productUrl,
    manualBookData: input.manualBookData,
    sourceNotes: input.sourceNotes,
    rawReviews: input.rawReviews,
    sources: run.sources
      .filter((source) => source.status === "USED")
      .map((source) => ({
        url: source.url,
        domain: source.domain,
        title: source.title,
        sourceType: source.sourceType,
        summary: source.summary,
        excerptForAi: source.summary || "",
      })),
    extractedFacts: extraction,
    focusKeyword: input.focusKeyword,
  });
  const bookData = parseBookData(raw, input);
  await prisma.aiGeneration.create({
    data: {
      type: "BRIEF",
      inputJson: { source: "ai_autopilot_book_data", researchRunId: run.id, extraction } as Prisma.InputJsonValue,
      outputMarkdown: raw,
      model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    },
  });

  return { extraction, bookData };
}

async function generateArticlePayload(
  input: AutopilotForm,
  extraction: Extraction,
  bookData: BookData,
  reviewInsight: Awaited<ReturnType<typeof maybeCreateReviewInsight>>,
) {
  const [category, painPoint, audience] = await Promise.all([
    input.categoryId
      ? prisma.category.findUnique({ where: { id: input.categoryId }, select: { name: true } })
      : null,
    input.painPointId
      ? prisma.painPoint.findUnique({ where: { id: input.painPointId }, select: { name: true } })
      : null,
    input.audienceId
      ? prisma.audience.findUnique({ where: { id: input.audienceId }, select: { name: true } })
      : null,
  ]);

  const raw = await generateAutopilotArticle({
    bookTitle: input.bookTitle,
    author: input.author,
    affiliateUrl: input.affiliateUrl || "",
    productUrl: input.productUrl,
    manualBookData: input.manualBookData,
    sourceNotes: input.sourceNotes,
    rawReviews: input.rawReviews,
    sources: [],
    extractedFacts: extraction,
    bookData,
    reviewInsight: reviewInsightForPrompt(reviewInsight),
    focusKeyword: input.focusKeyword || input.bookTitle,
    categoryName: category?.name,
    painPointName: painPoint?.name,
    audienceName: audience?.name,
    tone: input.tone,
  });

  const article = articleOutputSchema.parse(parseJsonOutput(raw));
  return article;
}

async function upsertBookFromAutopilot(input: AutopilotForm, bookData: BookData) {
  const title = bookData.title || input.bookTitle;
  const taxonomy = await taxonomyConnectData(input, bookData);
  const existing = await prisma.book.findFirst({
    where: { title: { equals: title, mode: "insensitive" } },
  });

  if (existing) {
    return prisma.book.update({
      where: { id: existing.id },
      data: {
        author:
          !existing.author || existing.author === "Không rõ"
            ? bookData.author || input.author || "Không rõ"
            : existing.author,
        publisher: existing.publisher || bookData.publisher || input.publisher || null,
        description: existing.description || fallbackDescription(title, bookData),
        shopeeAffiliateUrl: existing.shopeeAffiliateUrl || input.affiliateUrl || null,
        status: BookStatus.ACTIVE,
        pros: existing.pros.length ? existing.pros : cleanArray(bookData.pros).slice(0, 6),
        cons: existing.cons.length ? existing.cons : cleanArray(bookData.cons).slice(0, 6),
        keyLessons: existing.keyLessons.length
          ? existing.keyLessons
          : cleanArray(bookData.keyLessons).slice(0, 6),
        suitableFor: existing.suitableFor.length
          ? existing.suitableFor
          : cleanArray(bookData.suitableFor).slice(0, 6),
        notSuitableFor: existing.notSuitableFor.length
          ? existing.notSuitableFor
          : cleanArray(bookData.notSuitableFor).slice(0, 6),
        categories: taxonomy.categories,
        painPoints: taxonomy.painPoints,
        audiences: taxonomy.audiences,
      },
    });
  }

  return prisma.book.create({
    data: {
      title,
      slug: await uniqueBookSlug(title),
      author: bookData.author || input.author || "Không rõ",
      publisher: nullable(bookData.publisher || input.publisher),
      description: fallbackDescription(title, bookData),
      shopeeAffiliateUrl: nullable(input.affiliateUrl),
      status: BookStatus.ACTIVE,
      pros: cleanArray(bookData.pros).slice(0, 6),
      cons: cleanArray(bookData.cons).slice(0, 6),
      keyLessons: cleanArray(bookData.keyLessons).slice(0, 6),
      suitableFor: cleanArray(bookData.suitableFor).slice(0, 6),
      notSuitableFor: cleanArray(bookData.notSuitableFor).slice(0, 6),
      categories: taxonomy.categories,
      painPoints: taxonomy.painPoints,
      audiences: taxonomy.audiences,
    },
  });
}

async function maybeCreateReviewInsight(input: AutopilotForm) {
  if (!input.rawReviews?.trim() || !input.affiliateUrl) return null;

  const rawOutput = await analyzeShopeeReviews({
    bookTitle: input.bookTitle,
    author: input.author,
    rawReviews: input.rawReviews,
  });
  const insight = reviewInsightSchema.parse(parseJsonOutput(rawOutput));

  return prisma.reviewInsight.create({
    data: {
      bookTitle: input.bookTitle,
      author: nullable(input.author),
      shopeeProductUrl: input.productUrl || input.affiliateUrl,
      affiliateUrl: input.affiliateUrl,
      rawReviews: input.rawReviews,
      notes: nullable(input.sourceNotes),
      reviewCount: countReviews(input.rawReviews),
      status: "analyzed",
      positivePoints: insight.positivePoints,
      negativePoints: insight.negativePoints,
      buyerPersonas: insight.buyerPersonas,
      painPoints: insight.painPoints,
      emotionalHooks: insight.emotionalHooks,
      objections: insight.objections,
      purchaseReasons: insight.purchaseReasons,
      articleAngles: insight.articleAngles,
      summary: insight.summary,
    },
  });
}

function parseExtraction(raw: string) {
  const parsed = extractionSchema.safeParse(parseJsonOutput(raw));
  if (!parsed.success) {
    throw new Error("AI trả về extraction JSON chưa đúng cấu trúc.");
  }
  return parsed.data;
}

function parseBookData(raw: string, input: AutopilotForm) {
  const parsed = bookDataSchema.safeParse(parseJsonOutput(raw));
  if (!parsed.success) {
    throw new Error("AI trả về book data JSON chưa đúng cấu trúc.");
  }
  return {
    ...parsed.data,
    title: parsed.data.title || input.bookTitle,
    author: parsed.data.author || input.author || "Không rõ",
  };
}

function sourceFactsFor(candidate: { url?: string | null; title?: string | null }, extraction: Extraction) {
  const byUrl = extraction.sourceFacts.find(
    (item) => item.url && candidate.url && item.url === candidate.url,
  );
  const byTitle = extraction.sourceFacts.find(
    (item) => item.title && candidate.title && item.title === candidate.title,
  );
  return byUrl || byTitle || undefined;
}

function articleQualityGate({
  intent,
  extraction,
  bookData,
  article,
  usedSourceCount,
  hasManualData,
  hasAffiliateUrl,
}: {
  intent: string;
  extraction: Extraction;
  bookData: BookData;
  article: ArticleOutput;
  usedSourceCount: number;
  hasManualData: boolean;
  hasAffiliateUrl: boolean;
}) {
  const warnings: string[] = [];
  const wordCount = wordCountFromMarkdown(article.contentMarkdown);
  const confidence = combinedConfidence(
    extraction.confidence,
    bookData.confidence,
    article.confidence,
  );

  if (wordCount < 900) warnings.push("Content dưới 900 từ.");
  if (!article.seoTitle || !article.seoDescription) warnings.push("Thiếu SEO title/description.");
  if (!article.faqs.length) warnings.push("Thiếu FAQ.");
  if (!hasAffiliateUrl) warnings.push("Thiếu affiliate URL.");
  if (usedSourceCount < 2 && !hasManualData) warnings.push("Nguồn research còn mỏng.");
  if (confidence < 0.55) warnings.push("Confidence dưới 0.55.");

  return {
    canPublish: intent === "draft" ? false : warnings.length === 0,
    warnings,
    wordCount,
    confidence,
  };
}

function statusForIntent(intent: string, canPublish: boolean) {
  if (intent === "schedule" && canPublish) return ArticleStatus.SCHEDULED;
  if (intent === "publish" && canPublish) return ArticleStatus.PUBLISHED;
  if (intent === "draft") return ArticleStatus.DRAFT;
  return canPublish ? ArticleStatus.DRAFT : ArticleStatus.REVIEW;
}

function mergeSourceSummary(
  extraction: Extraction,
  bookData?: BookData,
  article?: ArticleOutput,
  quality?: ReturnType<typeof articleQualityGate>,
) {
  const summary: Record<string, unknown> = { extraction };
  if (bookData) summary.bookData = bookData;
  if (article) {
    summary.article = {
      title: article.title,
      seoTitle: article.seoTitle,
      seoDescription: article.seoDescription,
      warnings: article.warnings,
      confidence: article.confidence,
    };
  }
  if (quality) summary.quality = quality;
  return summary as Prisma.InputJsonValue;
}

function reviewInsightForPrompt(
  insight: Awaited<ReturnType<typeof maybeCreateReviewInsight>>,
) {
  if (!insight) return null;
  return {
    positivePoints: insight.positivePoints,
    negativePoints: insight.negativePoints,
    buyerPersonas: insight.buyerPersonas,
    painPoints: insight.painPoints,
    emotionalHooks: insight.emotionalHooks,
    objections: insight.objections,
    purchaseReasons: insight.purchaseReasons,
    articleAngles: insight.articleAngles,
    summary: insight.summary,
  };
}

async function usedSourceCount(researchRunId: string) {
  return prisma.researchSource.count({
    where: { researchRunId, status: "USED" },
  });
}

async function ensureBookAffiliateLink(
  bookId: string,
  title: string,
  slug: string,
  destinationUrl?: string,
) {
  if (!destinationUrl) return;
  const existing = await prisma.affiliateLink.findFirst({
    where: { bookId, articleId: null },
  });

  if (existing) {
    await prisma.affiliateLink.update({
      where: { id: existing.id },
      data: {
        label: `Xem giá ${title}`,
        destinationUrl,
        isActive: true,
      },
    });
    return;
  }

  await prisma.affiliateLink.create({
    data: {
      bookId,
      label: `Xem giá ${title}`,
      destinationUrl,
      trackingSlug: await uniqueTrackingSlug(`book-${slug}`),
      isActive: true,
    },
  });
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
  const base = slugify(input) || `ai-review-${Date.now()}`;
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
  const base = slugify(input) || `ai-${Date.now()}`;
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

async function taxonomyConnectData(input: AutopilotForm, bookData: BookData) {
  const [categories, painPoints, audiences] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.painPoint.findMany({ select: { id: true, name: true, slug: true } }),
    prisma.audience.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  return {
    categories: connectMany([
      input.categoryId,
      ...matchTaxonomyIds(bookData.categoryNames, categories),
    ]),
    painPoints: connectMany([
      input.painPointId,
      ...matchTaxonomyIds(bookData.painPointNames, painPoints),
    ]),
    audiences: connectMany([
      input.audienceId,
      ...matchTaxonomyIds(bookData.audienceNames, audiences),
    ]),
  };
}

function connectMany(ids: Array<string | null | undefined>) {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  return uniqueIds.length ? { connect: uniqueIds.map((id) => ({ id })) } : undefined;
}

function matchTaxonomyIds(
  names: string[],
  items: Array<{ id: string; name: string; slug: string }>,
) {
  const wanted = new Set(names.map((name) => slugify(name)).filter(Boolean));
  return items.filter((item) => wanted.has(item.slug) || wanted.has(slugify(item.name))).map((item) => item.id);
}

function fallbackDescription(title: string, bookData: BookData) {
  return (
    bookData.description ||
    `Dữ liệu sách ${title} được tổng hợp từ AI Autopilot và cần admin rà soát trước khi xuất bản.`
  );
}

function cleanArray(items: string[]) {
  return items.map((item) => item.trim()).filter(Boolean);
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function nullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message || "Dữ liệu không hợp lệ.";
}

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function countReviews(rawReviews: string) {
  const paragraphs = rawReviews
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs.length;

  return Math.max(
    1,
    rawReviews
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean).length,
  );
}

function wordCountFromMarkdown(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`[\]()~-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function combinedConfidence(...values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === "number");
  if (!valid.length) return 0.45;
  return Number((valid.reduce((sum, value) => sum + value, 0) / valid.length).toFixed(2));
}

function uniqueStrings(items: Array<string | null | undefined>) {
  return [...new Set(items.map((item) => item?.trim()).filter(Boolean) as string[])];
}

function revalidateAdminAi() {
  revalidatePath("/admin");
  revalidatePath("/admin/ai");
  revalidatePath("/admin/books");
  revalidatePath("/admin/articles");
}
