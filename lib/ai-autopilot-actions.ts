"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import {
  AiGenerationType,
  ArticleBookRole,
  ArticleSourceKind,
  ArticleStatus,
  ArticleType,
  BookStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  analyzeShopeeReviews,
  type ContentMemoryExample,
  DeepSeekConfigError,
  extractBookFactsFromSources,
  generateAutopilotArticle,
  generateAutopilotBookData,
  improveDraft,
} from "@/lib/deepseek";
import { articleAuthorData, resolveEditorialPersona } from "@/lib/editorial-personas";
import { readingTimeFromMarkdown } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { ResearchConfigError, researchBookSources } from "@/lib/research";
import { slugify } from "@/lib/slugify";
import { resolveVoiceTone } from "@/lib/voice-tones";
import { getArticleQualitySummary } from "@/lib/content-quality";

const optionalUrl = z
  .string()
  .trim()
  .refine((value) => !value || isValidUrl(value), "URL không hợp lệ.");

const autopilotSchema = z.object({
  intent: z.enum(["research", "book", "draft", "schedule", "publish", "auto_publish"]),
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
  verdictScore: z.coerce.number().min(1).max(5).optional(),
  verdictSummary: z.string().trim().optional().default(""),
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
    redirectAdminAi({ error: firstError(parsed.error) });
  }

  const input = parsed.data;
  if (["draft", "schedule", "publish", "auto_publish"].includes(input.intent) && !input.affiliateUrl) {
    redirectAdminAi({ error: "Thiếu affiliate URL để tạo CTA cuối bài." });
  }

  try {
    if (input.intent === "research") {
      const run = await performResearchRun(input);
      redirectAdminAi({ researchRunId: run.id, success: "Đã research nguồn cho sách." });
    }

    const run = await ensureResearchRun(input);
    const { extraction, bookData } = await ensureBookData(run.id, input);
    const initialPainBrief = buildPainBrief(input, extraction, bookData);
    const book = await upsertBookFromAutopilot(input, bookData);

    await prisma.researchRun.update({
      where: { id: run.id },
      data: {
        status: "BOOK_GENERATED",
        createdBookId: book.id,
        sourceSummary: mergeSourceSummary(extraction, bookData, undefined, undefined, initialPainBrief),
        warnings: uniqueStrings([...run.warnings, ...bookData.warnings]),
        confidence: combinedConfidence(extraction.confidence, bookData.confidence),
      },
    });

    await ensureBookAffiliateLink(book.id, book.title, book.slug, input.affiliateUrl);

    if (input.intent === "book") {
      revalidateAdminAi();
      redirectAdminAi({
        researchRunId: run.id,
        success: "Đã tạo/cập nhật dữ liệu sách từ research.",
      });
    }

    const reviewInsight = await maybeCreateReviewInsight(input);
    const painBrief = buildPainBrief(input, extraction, bookData, reviewInsight);
    const { article: articleOutput, contentMemory } = await generateArticlePayload(
      input,
      extraction,
      bookData,
      reviewInsight,
    );
    const articleAuthor = articleAuthorData(
      resolveEditorialPersona({
        tone: input.tone,
        articleType: ArticleType.REVIEW,
        categoryNames: bookData.categoryNames,
        painPointNames: bookData.painPointNames,
        audienceNames: bookData.audienceNames,
        bookSignals: [
          input.bookTitle,
          input.focusKeyword || "",
          ...bookData.keyLessons,
          ...bookData.suitableFor,
        ],
      }),
    );
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
    const status = input.intent === "draft" ? ArticleStatus.DRAFT : ArticleStatus.REVIEW;
    const slug = await uniqueArticleSlug(articleOutput.slug || articleOutput.title);
    const scheduledAt = null;

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
        ...articleAuthor,
        verdictScore: articleOutput.verdictScore ?? null,
        verdictSummary: nullable(articleOutput.verdictSummary),
        readingTime: readingTimeFromMarkdown(articleOutput.contentMarkdown),
        publishedAt: null,
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
          painBrief,
          contentMemory,
          qualityWarnings: quality.warnings,
        } as Prisma.InputJsonValue,
        outputMarkdown: articleOutput.contentMarkdown,
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        articleId: article.id,
        bookId: book.id,
      },
    });

    await createArticleSourcesFromResearch(article.id, run.id, reviewInsight?.id);

    const publication = await evaluateAutoPublishReadiness({
      articleId: article.id,
      intent: input.intent,
      researchConfidence: combinedConfidence(
        extraction.confidence,
        bookData.confidence,
        articleOutput.confidence,
      ),
      articleWarnings: articleOutput.warnings,
      usedSourceCount: await usedSourceCount(run.id),
      hasManualReview: Boolean(input.rawReviews?.trim()),
    });

    if (publication.approved) {
      await prisma.article.update({
        where: { id: article.id },
        data: {
          status: ArticleStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });
      revalidatePublishedArticle(article.slug);
    }

    await prisma.researchRun.update({
      where: { id: run.id },
      data: {
        status: "ARTICLE_CREATED",
        createdBookId: book.id,
        createdArticleId: article.id,
        sourceSummary: mergeSourceSummary(extraction, bookData, articleOutput, {
          ...quality,
          warnings: uniqueStrings([...quality.warnings, ...publication.reasons]),
          canPublish: publication.approved,
        }, painBrief),
        warnings: uniqueStrings([
          ...run.warnings,
          ...extraction.warnings,
          ...bookData.warnings,
          ...articleOutput.warnings,
          ...quality.warnings,
          ...publication.reasons,
        ]),
        confidence: combinedConfidence(
          extraction.confidence,
          bookData.confidence,
          articleOutput.confidence,
        ),
      },
    });

    revalidateAdminAi();
    const statusText = publication.approved
      ? "Bài đã đạt quality gate và được public tự động."
      : input.intent === "auto_publish"
        ? "Bài chưa đạt quality gate nên được đưa vào REVIEW, chưa public."
        : "Đã tạo bài để bạn review trước khi publish.";
    redirectAdminAi({
      researchRunId: run.id,
      success: publication.approved ? statusText : `${statusText} Bấm “Review bài” để kiểm tra thủ công.`,
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof DeepSeekConfigError || error instanceof ResearchConfigError) {
      redirectAdminAi({ error: error.message });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirectAdminAi({ error: "Slug hoặc tracking slug đã tồn tại, hãy thử lại." });
    }
    console.error(error);
    const detail = formatAdminActionError(error);
    redirectAdminAi({
      error: `Không chạy được AI Autopilot lúc này. Kiểm tra API key, nguồn dữ liệu hoặc thử lại.${detail}`,
    });
  }
}

export async function improveAutopilotArticleAction(formData: FormData) {
  await requireAdmin();

  const researchRunId = textValue(formData, "researchRunId");
  if (!researchRunId) redirectAdminAi({ error: "Thiếu research run." });

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
    redirectAdminAi({
      researchRunId,
      error: "Chưa có bài viết để AI chỉnh sửa.",
    });
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
  const resolvedImproveTone = resolveVoiceTone({
    tone: null,
    categoryNames: [],
    painPointNames: article.painPoints.map((item) => item.name),
    audienceNames: article.audiences.map((item) => item.name),
    bookSignals: [
      article.title,
      article.focusKeyword || "",
      mainBook?.title || "",
      ...(mainBook?.keyLessons || []),
      ...(mainBook?.suitableFor || []),
    ],
  });
  const extraNotes = [
    "Đây là bài do AI Autopilot tạo. Hãy tự biên tập lại trực tiếp để bài đọc tự nhiên hơn, giàu góc nhìn hơn và ít template hơn.",
    "Loại bỏ ngôi 'tôi' hoặc trải nghiệm cá nhân nếu không có verifiedRead=true. Dùng giọng biên tập/gợi mở thay thế.",
    "Nếu content đang có section FAQ trong markdown, hãy bỏ section đó khỏi markdown vì website đã render FAQ riêng.",
    "Không quote trực tiếp từ sách, tác giả, review hoặc nguồn research; chỉ diễn giải bằng lời riêng.",
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
      tone: resolvedImproveTone,
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
    redirectAdminAi({
      researchRunId: run.id,
      success: "AI đã tự chỉnh sửa bài. Bấm “Review bài” để kiểm tra thủ công trước khi publish.",
    });
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof DeepSeekConfigError) {
      redirectAdminAi({ researchRunId: run.id, error: error.message });
    }
    console.error(error);
    const detail = formatAdminActionError(error);
    redirectAdminAi({
      researchRunId: run.id,
      error: `Không tự chỉnh sửa được bài lúc này. Kiểm tra DeepSeek API hoặc thử lại.${detail}`,
    });
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
  const resolvedTone = resolveVoiceTone({
    tone: input.tone,
    categoryNames: [
      category?.name,
      ...bookData.categoryNames,
    ].filter((item): item is string => Boolean(item)),
    painPointNames: [
      painPoint?.name,
      ...bookData.painPointNames,
    ].filter((item): item is string => Boolean(item)),
    audienceNames: [
      audience?.name,
      ...bookData.audienceNames,
    ].filter((item): item is string => Boolean(item)),
    bookSignals: [
      input.bookTitle,
      input.focusKeyword || "",
      ...bookData.keyLessons,
      ...bookData.suitableFor,
      ...bookData.cons,
    ],
  });
  const contentMemory = await buildContentMemory(input, bookData);

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
    tone: resolvedTone,
    contentMemory,
  });

  const article = parseArticleOutput(raw, input.bookTitle);
  if (!article.faqs.length) {
    article.faqs = fallbackFaqs(input.bookTitle, input.focusKeyword || input.bookTitle);
  }
  return { article, contentMemory };
}

async function buildContentMemory(
  input: AutopilotForm,
  bookData: BookData,
): Promise<ContentMemoryExample[]> {
  const categoryNames = uniqueStrings(bookData.categoryNames);
  const painPointNames = uniqueStrings(bookData.painPointNames);
  const audienceNames = uniqueStrings(bookData.audienceNames);
  const matchers: Prisma.ArticleWhereInput[] = [];

  if (input.categoryId || categoryNames.length) {
    const categoryOr: Prisma.CategoryWhereInput[] = [
      ...(input.categoryId ? [{ id: input.categoryId }] : []),
      ...categoryNames.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
    ];
    matchers.push({
      categories: {
        some: { OR: categoryOr },
      },
    });
  }

  if (input.painPointId || painPointNames.length) {
    const painPointOr: Prisma.PainPointWhereInput[] = [
      ...(input.painPointId ? [{ id: input.painPointId }] : []),
      ...painPointNames.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
    ];
    matchers.push({
      painPoints: {
        some: { OR: painPointOr },
      },
    });
  }

  if (input.audienceId || audienceNames.length) {
    const audienceOr: Prisma.AudienceWhereInput[] = [
      ...(input.audienceId ? [{ id: input.audienceId }] : []),
      ...audienceNames.map((name) => ({ name: { equals: name, mode: "insensitive" as const } })),
    ];
    matchers.push({
      audiences: {
        some: { OR: audienceOr },
      },
    });
  }

  const baseWhere: Prisma.ArticleWhereInput = {
    status: ArticleStatus.PUBLISHED,
    publishedAt: {
      lte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    },
    ...(matchers.length ? { OR: matchers } : {}),
  };

  const related = await prisma.article.findMany({
    where: baseWhere,
    take: 10,
    orderBy: [{ verdictScore: "desc" }, { updatedAt: "desc" }],
    include: {
      _count: {
        select: {
          clickEvents: true,
          pageViews: true,
          sources: true,
        },
      },
    },
  });

  const fallback =
    related.length >= 3
      ? []
      : await prisma.article.findMany({
          where: { status: ArticleStatus.PUBLISHED },
          take: 8,
          orderBy: [{ verdictScore: "desc" }, { updatedAt: "desc" }],
          include: {
            _count: {
              select: {
                clickEvents: true,
                pageViews: true,
                sources: true,
              },
            },
          },
        });

  const deduped = [...related, ...fallback].filter(
    (article, index, all) => all.findIndex((item) => item.id === article.id) === index,
  );
  const candidateIds = deduped.map((article) => article.id);
  const engagementRows = candidateIds.length
    ? await prisma.intentEvent.groupBy({
        by: ["articleId", "type"],
        where: {
          articleId: { in: candidateIds },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          type: {
            in: [
              "article_scroll_90",
              "saved_article",
              "read_next_featured_clicked",
              "read_next_secondary_clicked",
              "journey_item_clicked",
            ],
          },
        },
        _count: { _all: true },
      })
    : [];
  const engagementByArticle = new Map<string, EngagementMetrics>();

  for (const row of engagementRows) {
    if (!row.articleId) continue;
    const current = engagementByArticle.get(row.articleId) || emptyEngagementMetrics();
    if (row.type === "article_scroll_90") current.completedReads += row._count._all;
    if (row.type === "saved_article") current.saves += row._count._all;
    if (
      row.type === "read_next_featured_clicked" ||
      row.type === "read_next_secondary_clicked" ||
      row.type === "journey_item_clicked"
    ) {
      current.readNextClicks += row._count._all;
    }
    engagementByArticle.set(row.articleId, current);
  }

  return deduped
    .sort(
      (a, b) =>
        contentMemoryScore(b, engagementByArticle.get(b.id)) -
        contentMemoryScore(a, engagementByArticle.get(a.id)),
    )
    .slice(0, 5)
    .map((article) => toContentMemoryExample(article, engagementByArticle.get(article.id)));
}

type EngagementMetrics = {
  completedReads: number;
  saves: number;
  readNextClicks: number;
};

function emptyEngagementMetrics(): EngagementMetrics {
  return { completedReads: 0, saves: 0, readNextClicks: 0 };
}

function contentMemoryScore(article: {
  verdictScore: number | null;
  updatedAt: Date;
  _count: { clickEvents: number; pageViews: number; sources: number };
}, engagement = emptyEngagementMetrics()) {
  const freshness = Math.max(
    0,
    12 - Math.floor((Date.now() - article.updatedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)),
  );
  return (
    (article.verdictScore || 0) * 20 +
    article._count.clickEvents * 4 +
    article._count.pageViews * 0.2 +
    article._count.sources * 3 +
    engagement.completedReads * 3 +
    engagement.saves * 4 +
    engagement.readNextClicks * 2 +
    freshness
  );
}

function toContentMemoryExample(article: {
  title: string;
  type: ArticleType;
  voiceTone: string | null;
  authorName: string | null;
  excerpt: string;
  content: string;
  verdictScore: number | null;
  _count: { clickEvents: number; pageViews: number; sources: number };
}, engagement = emptyEngagementMetrics()): ContentMemoryExample {
  const opening = extractOpening(article.content);
  const headings = extractHeadings(article.content);
  const whyItWorks = [
    article.verdictScore && article.verdictScore >= 4 ? "Có verdict biên tập rõ, dễ scan." : "",
    article._count.sources > 0 ? "Có nguồn tham khảo, tăng cảm giác đáng tin." : "",
    article._count.clickEvents > 0 ? "Đã có tín hiệu click affiliate." : "",
    article._count.pageViews > 0 ? "Đã có tín hiệu người đọc xem bài." : "",
    engagement.completedReads > 0
      ? "Có tín hiệu người đọc cuộn đến gần cuối bài."
      : "",
    engagement.saves > 0 ? "Có tín hiệu người đọc lưu bài để quay lại." : "",
    engagement.readNextClicks > 0 ? "Có tín hiệu người đọc đi tiếp sang bài liên quan." : "",
    /\bAi không nên đọc\b/i.test(article.content)
      ? "Có phần ai không nên đọc, giúp bài cân bằng hơn quảng cáo."
      : "",
    headings.length >= 5 ? "Heading chia nhịp đọc tốt cho bài dài." : "",
  ].filter(Boolean);

  return {
    title: article.title,
    articleType: article.type,
    voiceTone: article.voiceTone,
    authorName: article.authorName,
    excerpt: truncatePlain(article.excerpt, 360),
    opening: truncatePlain(opening, 900),
    headings: headings.slice(0, 8),
    whyItWorks: whyItWorks.length ? whyItWorks : ["Có thể dùng làm mốc tham khảo về cấu trúc bài."],
    verdictScore: article.verdictScore,
    clickCount: article._count.clickEvents,
    viewCount: article._count.pageViews,
  };
}

function extractOpening(markdown: string) {
  const beforeFirstHeading = markdown.split(/\n#{2,3}\s+/)[0] || markdown;
  return stripMarkdown(beforeFirstHeading);
}

function extractHeadings(markdown: string) {
  return [...markdown.matchAll(/^#{2,3}\s+(.+)$/gm)]
    .map((match) => stripMarkdown(match[1] || ""))
    .filter(Boolean);
}

function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncatePlain(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
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

async function createArticleSourcesFromResearch(
  articleId: string,
  researchRunId: string,
  reviewInsightId?: string,
) {
  const sources = await prisma.researchSource.findMany({
    where: {
      researchRunId,
      status: "USED",
      url: { not: null },
    },
    orderBy: [{ confidence: "desc" }, { createdAt: "asc" }],
    take: 12,
  });

  const rows: Prisma.ArticleSourceCreateManyInput[] = sources.map((source, index) => ({
    articleId,
    title: source.title || source.domain || source.url || "Nguồn tham khảo",
    url: source.url,
    domain: source.domain,
    kind:
      source.sourceType === "PRODUCT_PAGE"
        ? ArticleSourceKind.PUBLISHER
        : ArticleSourceKind.REFERENCE,
    note: source.summary ? source.summary.slice(0, 240) : null,
    order: index + 1,
  }));

  if (reviewInsightId) {
    rows.push({
      articleId,
      title: "Review người mua được admin paste thủ công",
      url: null,
      domain: "Shopee",
      kind: ArticleSourceKind.BUYER_REVIEWS,
      note: "Chỉ dùng để rút insight, không copy hoặc trích nguyên văn.",
      order: rows.length + 1,
    });
  }

  if (rows.length) {
    await prisma.articleSource.createMany({ data: rows });
  }
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

async function evaluateAutoPublishReadiness({
  articleId,
  intent,
  researchConfidence,
  articleWarnings,
  usedSourceCount,
  hasManualReview,
}: {
  articleId: string;
  intent: string;
  researchConfidence: number;
  articleWarnings: string[];
  usedSourceCount: number;
  hasManualReview: boolean;
}) {
  if (intent !== "auto_publish") {
    return { approved: false, reasons: [] as string[] };
  }

  const article = await prisma.article.findUniqueOrThrow({
    where: { id: articleId },
    include: {
      faqs: { select: { question: true } },
      sources: { select: { title: true } },
      books: { select: { role: true } },
      painPoints: { select: { id: true, name: true, slug: true } },
      audiences: { select: { id: true, name: true, slug: true } },
    },
  });
  const summary = getArticleQualitySummary({
    ...article,
    faqs: article.faqs.map((faq) => ({ name: faq.question })),
    sources: article.sources.map((source) => ({ name: source.title })),
  });
  const strictChecks = new Set([
    "Có SEO title",
    "Có SEO description",
    "Có focus keyword",
    "Có verdict biên tập",
    "Có ít nhất 1 pain point",
    "Có ít nhất 1 audience",
    "Có sách liên quan",
    "Content tối thiểu 900 từ",
    "Có FAQ cho bài review/top-list",
    "Có nguồn hoặc ghi chú biên tập",
    "Review/story có sách chính",
    "Có section sách nói về gì",
    "Có review chi tiết/góc nhìn sau khi đọc",
    "Có phần ai nên đọc",
    "Có phần ai không nên đọc",
    "Có phần điểm hạn chế",
    "Gọi đúng nỗi đau trong 200 chữ đầu",
    "Có cấu trúc heading đủ để scan",
    "Có decision section trước CTA",
    "Không nhắc review Shopee khi chưa có ReviewInsight",
    "CTA không nằm trong markdown",
    "Không dùng cụm sáo rỗng kiểu AI",
    "Nhịp câu có biến thiên tự nhiên",
    "Có chi tiết cụ thể kiểm chứng được",
  ]);
  const failedChecks = summary.checks
    .filter((check) => !check.ok && strictChecks.has(check.label))
    .map((check) => check.label);
  const reasons = [...failedChecks];

  if (researchConfidence < 0.78) {
    reasons.push("Confidence research/AI dưới ngưỡng tự public 0.78");
  }
  if (usedSourceCount < 2 && !(hasManualReview && article.sources.length >= 1)) {
    reasons.push("Cần ít nhất 2 nguồn research, hoặc 1 nguồn kèm review admin paste thủ công");
  }
  if (articleWarnings.length) {
    reasons.push("AI còn cảnh báo cần biên tập");
  }

  return { approved: reasons.length === 0, reasons: uniqueStrings(reasons) };
}

function revalidatePublishedArticle(slug: string) {
  revalidatePath("/");
  revalidatePath("/bai-viet");
  revalidatePath(`/bai-viet/${slug}`);
  revalidatePath("/sach");
  revalidatePath("/sitemap.xml");
}

function mergeSourceSummary(
  extraction: Extraction,
  bookData?: BookData,
  article?: ArticleOutput,
  quality?: ReturnType<typeof articleQualityGate>,
  painBrief?: ReturnType<typeof buildPainBrief>,
) {
  const summary: Record<string, unknown> = { extraction };
  if (bookData) summary.bookData = bookData;
  if (painBrief) summary.painBrief = painBrief;
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

function buildPainBrief(
  input: AutopilotForm,
  extraction: Extraction,
  bookData: BookData,
  reviewInsight: Awaited<ReturnType<typeof maybeCreateReviewInsight>> = null,
) {
  const insights = plainObject(extraction.insights);
  const review = reviewInsightForPrompt(reviewInsight);
  const reviewPainPoints = jsonStringArray(review?.painPoints);
  const reviewObjections = jsonStringArray(review?.objections);
  const reviewPersonas = jsonStringArray(review?.buyerPersonas);
  const reviewHooks = jsonStringArray(review?.emotionalHooks);

  const readerInnerVoice = firstNonEmpty([
    stringField(insights, "readerInnerVoice"),
    stringField(insights, "innerVoice"),
    reviewHooks[0],
    input.focusKeyword
      ? `Mình đang tìm một cuốn sách thật sự giúp được chuyện ${input.focusKeyword.toLowerCase()}.`
      : `Mình nghe nhiều về ${input.bookTitle}, nhưng không chắc nó có hợp với giai đoạn của mình không.`,
  ]);
  const symptoms = uniqueStrings([
    ...bookData.painPointNames,
    ...jsonStringArray(insights.symptoms),
    ...jsonStringArray(insights.painPoints),
    ...reviewPainPoints,
    ...(input.focusKeyword ? [input.focusKeyword] : []),
  ]).slice(0, 6);
  const hiddenFear = firstNonEmpty([
    stringField(insights, "hiddenFear"),
    stringField(insights, "fear"),
    reviewObjections[0] ? `Sợ mua xong nhưng không đọc được, hoặc sách không đúng điều mình đang cần.` : "",
    "Sợ lại mua thêm một cuốn sách vì cảm hứng nhất thời, rồi vẫn không thay đổi được nhịp sống hiện tại.",
  ]);
  const purchaseObjections = uniqueStrings([
    ...bookData.cons,
    ...bookData.notSuitableFor,
    ...jsonStringArray(insights.objections),
    ...reviewObjections,
  ]).slice(0, 6);
  const whyThisBookFits = uniqueStrings([
    ...bookData.pros,
    ...bookData.suitableFor,
    ...bookData.keyLessons,
    ...jsonStringArray(insights.purchaseReasons),
    ...jsonStringArray(review?.purchaseReasons),
  ]).slice(0, 6);
  const whyThisBookMayNotFit = uniqueStrings([
    ...bookData.cons,
    ...bookData.notSuitableFor,
    ...jsonStringArray(insights.negativePoints),
    ...jsonStringArray(review?.negativePoints),
  ]).slice(0, 5);
  const hooks = uniqueStrings([
    `Có những cuốn sách người ta không tìm đến vì tò mò, mà vì đang cần gọi tên một điều trong lòng.`,
    `${input.bookTitle} đáng được đọc chậm, nhất là khi bạn không muốn thêm một lời khuyên ồn ào.`,
    readerInnerVoice
      ? `Nếu trong đầu bạn có câu: “${readerInnerVoice.replace(/[“”"]/g, "")}”, bài này nên bắt đầu từ chính cảm giác đó.`
      : "",
    ...reviewHooks,
    ...jsonStringArray(insights.articleAngles),
  ]).slice(0, 4);

  return {
    readerInnerVoice,
    symptoms,
    hiddenFear,
    purchaseObjections,
    whyThisBookFits,
    whyThisBookMayNotFit,
    hooks,
    personas: uniqueStrings([...bookData.audienceNames, ...reviewPersonas]).slice(0, 5),
    adminCheck: extraction.adminCheck,
  };
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

function parseArticleOutput(output: string, bookTitle: string) {
  try {
    return articleOutputSchema.parse(parseJsonOutput(output));
  } catch {
    const cleaned = stripMarkdownFence(output);
    const content = extractLooseContentMarkdown(cleaned);
    const fallback = {
      title:
        extractLooseStringField(cleaned, "title") ||
        `Review ${bookTitle}: nên đọc thế nào để không biến nó thành áp lực`,
      slug: extractLooseStringField(cleaned, "slug") || "",
      excerpt:
        extractLooseStringField(cleaned, "excerpt") ||
        summarizeMarkdown(content || `Review ${bookTitle} theo góc nhìn người đọc.`),
      seoTitle:
        extractLooseStringField(cleaned, "seoTitle") ||
        `Review ${bookTitle}: có phù hợp với bạn không?`,
      seoDescription:
        extractLooseStringField(cleaned, "seoDescription") ||
        summarizeMarkdown(content || `Review ${bookTitle} theo góc nhìn người đọc.`),
      focusKeyword: extractLooseStringField(cleaned, "focusKeyword") || bookTitle,
      contentMarkdown:
        content ||
        `## Sách nói về gì\n\n${bookTitle} cần được admin kiểm tra lại vì AI trả output chưa đúng JSON.\n\n## Nên đọc cuốn này như thế nào\n\nHãy đọc chậm và đối chiếu với nhu cầu thật của bạn.`,
      faqs: extractLooseFaqs(cleaned),
      warnings: [
        "AI trả về JSON chưa hợp lệ; hệ thống đã fallback parse để giữ bài viết.",
      ],
      confidence: 0.45,
    };

    return articleOutputSchema.parse(fallback);
  }
}

function stripMarkdownFence(output: string) {
  return output
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractLooseStringField(jsonLike: string, field: string) {
  const match = jsonLike.match(new RegExp(`"${field}"\\s*:\\s*"([^"\\n\\r]*)"`));
  return match?.[1]?.trim() || "";
}

function extractLooseContentMarkdown(jsonLike: string) {
  const startMatch = /"contentMarkdown"\s*:\s*"/.exec(jsonLike);
  if (!startMatch) return "";

  const valueStart = startMatch.index + startMatch[0].length;
  const rest = jsonLike.slice(valueStart);
  const delimiterMatch =
    /"\s*,\s*"faqs"\s*:/.exec(rest) ||
    /"\s*,\s*"warnings"\s*:/.exec(rest) ||
    /"\s*,\s*"confidence"\s*:/.exec(rest);
  const valueEnd = delimiterMatch ? valueStart + delimiterMatch.index : jsonLike.lastIndexOf('"');
  if (valueEnd <= valueStart) return "";

  return jsonLike
    .slice(valueStart, valueEnd)
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, '"')
    .trim();
}

function extractLooseFaqs(jsonLike: string) {
  const faqQuestionMatches = [...jsonLike.matchAll(/"question"\s*:\s*"([^"\n\r]+)"/g)];
  const faqAnswerMatches = [...jsonLike.matchAll(/"answer"\s*:\s*"([^"\n\r]+)"/g)];

  return faqQuestionMatches
    .map((questionMatch, index) => ({
      question: questionMatch[1].trim(),
      answer: faqAnswerMatches[index]?.[1]?.trim() || "Câu trả lời cần admin rà soát thêm.",
    }))
    .filter((item) => item.question && item.answer)
    .slice(0, 6);
}

function fallbackFaqs(bookTitle: string, focusKeyword: string) {
  return [
    {
      question: `${bookTitle} phù hợp với ai?`,
      answer: `Cuốn sách phù hợp với người đang quan tâm đến ${focusKeyword.toLowerCase()} và muốn có một cách đọc thực tế hơn, không chỉ đọc để lấy cảm hứng nhất thời.`,
    },
    {
      question: `Có nên mua ${bookTitle} ngay không?`,
      answer:
        "Bạn nên mua nếu thật sự muốn dành thời gian đọc và thử áp dụng một vài ý nhỏ. Nếu chỉ muốn một lời hứa thay đổi nhanh, nên cân nhắc thêm.",
    },
    {
      question: `Nên đọc ${bookTitle} như thế nào?`,
      answer:
        "Nên đọc chậm, ghi lại một vài ý chạm đúng vấn đề hiện tại và thử áp dụng bằng một hành động nhỏ trước khi đọc tiếp.",
    },
  ];
}

function summarizeMarkdown(markdown: string) {
  return markdown
    .replace(/^#+\s+/gm, "")
    .replace(/[*_>`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
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

function plainObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringField(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value.trim() : "";
}

function jsonStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function firstNonEmpty(items: Array<string | null | undefined>) {
  return items.map((item) => item?.trim() || "").find(Boolean) || "";
}

function formatAdminActionError(error: unknown) {
  if (!(error instanceof Error)) return "";
  const stackLine =
    process.env.NODE_ENV !== "production"
      ? error.stack?.split("\n").slice(1, 3).join(" ")
      : "";
  return ` Chi tiết: ${error.message}${stackLine ? ` (${stackLine.trim()})` : ""}`;
}

function redirectAdminAi(params: {
  researchRunId?: string | null;
  success?: string | null;
  error?: string | null;
}): never {
  const search = new URLSearchParams();
  if (params.researchRunId) search.set("researchRunId", params.researchRunId);
  if (params.success) search.set("success", params.success);
  if (params.error) search.set("error", params.error);
  const query = search.toString();
  redirect(query ? `/admin/ai?${query}` : "/admin/ai");
}

function revalidateAdminAi() {
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/bai-viet");
  revalidatePath("/bai-viet/[slug]", "page");
  revalidatePath("/sach");
  revalidatePath("/sach/[slug]", "page");
  revalidatePath("/noi-dau/[slug]", "page");
  revalidatePath("/chu-de/[slug]", "page");
  revalidatePath("/doi-tuong/[slug]", "page");
  revalidatePath("/admin");
  revalidatePath("/admin/ai");
  revalidatePath("/admin/books");
  revalidatePath("/admin/articles");
}
