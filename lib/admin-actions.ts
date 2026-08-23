"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ArticleBookRole,
  ArticleSourceKind,
  ArticleStatus,
  ArticleType,
  BookStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { ADMIN_COOKIE_NAME, createAdminSessionToken } from "@/lib/auth-token";
import { requireAdmin } from "@/lib/auth";
import {
  articleAuthorData,
  getEditorialPersonaBySlug,
  resolveEditorialPersona,
} from "@/lib/editorial-personas";
import { readingTimeFromMarkdown } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { hashIp } from "@/lib/hash";
import { slugify } from "@/lib/slugify";
import { getArticleQualitySummary } from "@/lib/content-quality";
import { notifySearchEngines } from "@/lib/indexing";

const optionalUrlSchema = z
  .string()
  .trim()
  .refine((value) => !value || isValidUrl(value), "URL không hợp lệ.");

const loginSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ."),
  password: z.string().min(1, "Thiếu mật khẩu."),
  next: z.string().optional(),
});

const bookSchema = z.object({
  title: z.string().trim().min(1, "Thiếu tên sách."),
  slug: z.string().trim().optional(),
  author: z.string().trim().min(1, "Thiếu tác giả."),
  publisher: z.string().trim().optional(),
  description: z.string().trim().min(1, "Thiếu mô tả sách."),
  coverImage: optionalUrlSchema.optional(),
  shopeeAffiliateUrl: optionalUrlSchema.optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  pros: z.string().optional(),
  cons: z.string().optional(),
  keyLessons: z.string().optional(),
  suitableFor: z.string().optional(),
  notSuitableFor: z.string().optional(),
  editorialScore: z.string().optional(),
  practicalScore: z.string().optional(),
  depthScore: z.string().optional(),
  readabilityScore: z.string().optional(),
  valueScore: z.string().optional(),
});

const articleSchema = z
  .object({
    title: z.string().trim().min(1, "Thiếu tiêu đề."),
    slug: z.string().trim().optional(),
    type: z.enum(["REVIEW", "TOP_LIST", "STORY", "COMPARISON", "GUIDE"]),
    status: z.enum(["DRAFT", "REVIEW", "SCHEDULED", "PUBLISHED", "ARCHIVED"]),
    excerpt: z.string().trim().min(1, "Thiếu excerpt."),
    content: z.string().trim().min(1, "Thiếu nội dung markdown."),
    coverImage: optionalUrlSchema.optional(),
    seoTitle: z.string().trim().optional(),
    seoDescription: z.string().trim().optional(),
    focusKeyword: z.string().trim().optional(),
    authorSlug: z.string().trim().optional(),
    verdictScore: z.string().trim().optional(),
    verdictSummary: z.string().trim().optional(),
    clusterId: z.string().trim().optional(),
    publishedAt: z.string().trim().optional(),
    scheduledAt: z.string().trim().optional(),
    faqs: z.string().optional(),
    sources: z.string().optional(),
  })
  .superRefine((data, context) => {
    if (data.status !== "PUBLISHED" && data.status !== "SCHEDULED") return;

    if (!data.slug?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["slug"],
        message: "Không thể publish nếu thiếu slug.",
      });
    }
    if (!data.seoTitle?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["seoTitle"],
        message: "Không thể publish nếu thiếu SEO title.",
      });
    }
    if (!data.seoDescription?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["seoDescription"],
        message: "Không thể publish nếu thiếu SEO description.",
      });
    }
    if (data.status === "SCHEDULED") {
      const scheduledAt = parseVietnamDatetimeLocal(data.scheduledAt);
      if (!scheduledAt) {
        context.addIssue({
          code: "custom",
          path: ["scheduledAt"],
          message: "Không thể lên lịch nếu thiếu thời gian scheduledAt hợp lệ.",
        });
      }
    }
  });

const categorySchema = z.object({
  name: z.string().trim().min(1, "Thiếu tên chủ đề."),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  seoTitle: z.string().trim().optional(),
  seoDescription: z.string().trim().optional(),
});

const simpleTaxonomySchema = z.object({
  name: z.string().trim().min(1, "Thiếu tên."),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(formValues(formData, ["email", "password", "next"]));
  if (!parsed.success) {
    redirect(`/admin/login?error=${encodeURIComponent(firstError(parsed.error))}`);
  }

  const loginRate = await checkAdminLoginRateLimit(parsed.data.email);
  if (!loginRate.ok) {
    redirect(
      `/admin/login?error=${encodeURIComponent(
        `Thử lại sau khoảng ${loginRate.retryAfterSeconds} giây.`,
      )}`,
    );
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "change_me";
  if (parsed.data.email !== adminEmail || parsed.data.password !== adminPassword) {
    redirect(`/admin/login?error=${encodeURIComponent("Email hoặc mật khẩu không đúng.")}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, await createAdminSessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  const next = parsed.data.next?.startsWith("/admin") ? parsed.data.next : "/admin";
  redirect(next === "/admin/login" ? "/admin" : next);
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  redirect("/admin/login");
}

export async function createBookAction(formData: FormData) {
  await requireAdmin();
  const path = "/admin/books/new";
  const data = parseBookForm(formData, path);

  try {
    const book = await prisma.book.create({
      data: {
        title: data.title,
        slug: data.slug,
        author: data.author,
        publisher: nullable(data.publisher),
        description: data.description,
        coverImage: nullable(data.coverImage),
        shopeeAffiliateUrl: nullable(data.shopeeAffiliateUrl),
        status: data.status,
        pros: data.pros,
        cons: data.cons,
        keyLessons: data.keyLessons,
        suitableFor: data.suitableFor,
        notSuitableFor: data.notSuitableFor,
        editorialScore: data.editorialScore,
        scoreBreakdown: data.scoreBreakdown,
        categories: { connect: selectedIds(formData, "categoryIds").map((id) => ({ id })) },
        painPoints: { connect: selectedIds(formData, "painPointIds").map((id) => ({ id })) },
        audiences: { connect: selectedIds(formData, "audienceIds").map((id) => ({ id })) },
      },
    });
    await syncBookAffiliateLink(book.id, data.title, data.slug, data.shopeeAffiliateUrl);
    if (data.status === BookStatus.ACTIVE) {
      notifySearchEngines([`/sach/${data.slug}`]);
    }
  } catch (error) {
    handlePrismaError(error, path);
  }

  revalidateAdmin();
  redirectWithSuccess("/admin/books", "Tạo sách thành công.");
}

export async function updateBookAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const path = `/admin/books/${id}/edit`;
  const data = parseBookForm(formData, path);

  try {
    await prisma.book.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        author: data.author,
        publisher: nullable(data.publisher),
        description: data.description,
        coverImage: nullable(data.coverImage),
        shopeeAffiliateUrl: nullable(data.shopeeAffiliateUrl),
        status: data.status,
        pros: data.pros,
        cons: data.cons,
        keyLessons: data.keyLessons,
        suitableFor: data.suitableFor,
        notSuitableFor: data.notSuitableFor,
        editorialScore: data.editorialScore,
        scoreBreakdown: data.scoreBreakdown,
        categories: { set: selectedIds(formData, "categoryIds").map((item) => ({ id: item })) },
        painPoints: { set: selectedIds(formData, "painPointIds").map((item) => ({ id: item })) },
        audiences: { set: selectedIds(formData, "audienceIds").map((item) => ({ id: item })) },
      },
    });
    await syncBookAffiliateLink(id, data.title, data.slug, data.shopeeAffiliateUrl);
    if (data.status === BookStatus.ACTIVE) {
      notifySearchEngines([`/sach/${data.slug}`]);
    }
  } catch (error) {
    handlePrismaError(error, path);
  }

  revalidateAdmin();
  redirectWithSuccess("/admin/books", "Cập nhật sách thành công.");
}

export async function quickUpdateBookAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const coverImage = formData.get("coverImage")?.toString().trim() || null;
  const shopeeAffiliateUrl = formData.get("shopeeAffiliateUrl")?.toString().trim() || null;

  try {
    const book = await prisma.book.update({
      where: { id },
      data: {
        coverImage,
        shopeeAffiliateUrl,
      },
    });
    await syncBookAffiliateLink(id, book.title, book.slug, shopeeAffiliateUrl || undefined);
  } catch (error) {
    handlePrismaError(error, `/admin/books/${id}/edit`);
  }

  revalidateAdmin();
  redirectWithSuccess("/admin/books", "Cập nhật link Shopee & ảnh bìa thành công.");
}

export async function deleteBookAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  await prisma.book.delete({ where: { id } });
  revalidateAdmin();
  redirectWithSuccess("/admin/books", "Đã xóa sách.");
}

export async function createArticleAction(formData: FormData) {
  await requireAdmin();
  const path = "/admin/articles/new";
  const data = parseArticleForm(formData, path);
  const author = articleAuthorForForm(data, formData);
  const mainBookId = textValue(formData, "mainBookId");
  const relatedBookIds = orderedRelatedBookIds(formData);
  validateArticleRelations(data, mainBookId, relatedBookIds, formData, path);

  try {
    const article = await prisma.article.create({
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: nullable(data.coverImage),
        type: data.type,
        status: data.status,
        seoTitle: nullable(data.seoTitle),
        seoDescription: nullable(data.seoDescription),
        focusKeyword: nullable(data.focusKeyword),
        verdictScore: data.verdictScore,
        verdictSummary: nullable(data.verdictSummary),
        ...author,
        clusterId: nullable(data.clusterId),
        readingTime: readingTimeFromMarkdown(data.content),
        publishedAt: publishedAtFor(data.status, data.publishedAt),
        scheduledAt: scheduledAtFor(data.status, data.scheduledAt),
        categories: { connect: selectedIds(formData, "categoryIds").map((id) => ({ id })) },
        painPoints: { connect: selectedIds(formData, "painPointIds").map((id) => ({ id })) },
        audiences: { connect: selectedIds(formData, "audienceIds").map((id) => ({ id })) },
      },
    });
    await syncArticleBooks(article.id, data.type, mainBookId, relatedBookIds);
    await syncArticleFaqs(article.id, data.faqs);
    await syncArticleSources(article.id, data.sources);
    await syncArticleAffiliateLink(article.id, data.title, data.slug, mainBookId);
    if (data.status === ArticleStatus.PUBLISHED) {
      notifySearchEngines([`/bai-viet/${data.slug}`]);
    }
  } catch (error) {
    handlePrismaError(error, path);
  }

  revalidateAdmin();
  redirectWithSuccess("/admin/articles", "Tạo bài viết thành công.");
}

export async function updateArticleAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const path = `/admin/articles/${id}/edit`;
  const data = parseArticleForm(formData, path);
  const author = articleAuthorForForm(data, formData);
  const mainBookId = textValue(formData, "mainBookId");
  const relatedBookIds = orderedRelatedBookIds(formData);
  validateArticleRelations(data, mainBookId, relatedBookIds, formData, path);

  try {
    await prisma.article.update({
      where: { id },
      data: {
        title: data.title,
        slug: data.slug,
        excerpt: data.excerpt,
        content: data.content,
        coverImage: nullable(data.coverImage),
        type: data.type,
        status: data.status,
        seoTitle: nullable(data.seoTitle),
        seoDescription: nullable(data.seoDescription),
        focusKeyword: nullable(data.focusKeyword),
        verdictScore: data.verdictScore,
        verdictSummary: nullable(data.verdictSummary),
        ...author,
        clusterId: nullable(data.clusterId),
        readingTime: readingTimeFromMarkdown(data.content),
        publishedAt: publishedAtFor(data.status, data.publishedAt),
        scheduledAt: scheduledAtFor(data.status, data.scheduledAt),
        categories: { set: selectedIds(formData, "categoryIds").map((item) => ({ id: item })) },
        painPoints: { set: selectedIds(formData, "painPointIds").map((item) => ({ id: item })) },
        audiences: { set: selectedIds(formData, "audienceIds").map((item) => ({ id: item })) },
      },
    });
    await syncArticleBooks(id, data.type, mainBookId, relatedBookIds);
    await syncArticleFaqs(id, data.faqs);
    await syncArticleSources(id, data.sources);
    await syncArticleAffiliateLink(id, data.title, data.slug, mainBookId);
    if (data.status === ArticleStatus.PUBLISHED) {
      notifySearchEngines([`/bai-viet/${data.slug}`]);
    }
  } catch (error) {
    handlePrismaError(error, path);
  }

  revalidateAdmin();
  redirectWithSuccess("/admin/articles", "Cập nhật bài viết thành công.");
}

export async function deleteArticleAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  await prisma.article.delete({ where: { id } });
  revalidateAdmin();
  redirectWithSuccess("/admin/articles", "Đã xóa bài viết.");
}

export async function createCategoryAction(formData: FormData) {
  await requireAdmin();
  const data = parseCategoryForm(formData, "/admin/categories");
  try {
    await prisma.category.create({ data });
  } catch (error) {
    handlePrismaError(error, "/admin/categories");
  }
  revalidateAdmin();
  redirectWithSuccess("/admin/categories", "Tạo chủ đề thành công.");
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const data = parseCategoryForm(formData, "/admin/categories");
  try {
    await prisma.category.update({ where: { id }, data });
  } catch (error) {
    handlePrismaError(error, "/admin/categories");
  }
  revalidateAdmin();
  redirectWithSuccess("/admin/categories", "Cập nhật chủ đề thành công.");
}

export async function deleteCategoryAction(formData: FormData) {
  await requireAdmin();
  await prisma.category.delete({ where: { id: requiredId(formData) } });
  revalidateAdmin();
  redirectWithSuccess("/admin/categories", "Đã xóa chủ đề.");
}

export async function createPainPointAction(formData: FormData) {
  await requireAdmin();
  const data = parseSimpleTaxonomyForm(formData, "/admin/pain-points");
  try {
    await prisma.painPoint.create({ data });
  } catch (error) {
    handlePrismaError(error, "/admin/pain-points");
  }
  revalidateAdmin();
  redirectWithSuccess("/admin/pain-points", "Tạo nỗi đau thành công.");
}

export async function updatePainPointAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const data = parseSimpleTaxonomyForm(formData, "/admin/pain-points");
  try {
    await prisma.painPoint.update({ where: { id }, data });
  } catch (error) {
    handlePrismaError(error, "/admin/pain-points");
  }
  revalidateAdmin();
  redirectWithSuccess("/admin/pain-points", "Cập nhật nỗi đau thành công.");
}

export async function deletePainPointAction(formData: FormData) {
  await requireAdmin();
  await prisma.painPoint.delete({ where: { id: requiredId(formData) } });
  revalidateAdmin();
  redirectWithSuccess("/admin/pain-points", "Đã xóa nỗi đau.");
}

export async function createAudienceAction(formData: FormData) {
  await requireAdmin();
  const data = parseSimpleTaxonomyForm(formData, "/admin/audiences");
  try {
    await prisma.audience.create({ data });
  } catch (error) {
    handlePrismaError(error, "/admin/audiences");
  }
  revalidateAdmin();
  redirectWithSuccess("/admin/audiences", "Tạo đối tượng thành công.");
}

export async function updateAudienceAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const data = parseSimpleTaxonomyForm(formData, "/admin/audiences");
  try {
    await prisma.audience.update({ where: { id }, data });
  } catch (error) {
    handlePrismaError(error, "/admin/audiences");
  }
  revalidateAdmin();
  redirectWithSuccess("/admin/audiences", "Cập nhật đối tượng thành công.");
}

export async function deleteAudienceAction(formData: FormData) {
  await requireAdmin();
  await prisma.audience.delete({ where: { id: requiredId(formData) } });
  revalidateAdmin();
  redirectWithSuccess("/admin/audiences", "Đã xóa đối tượng.");
}

function formValues(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, textValue(formData, key)]));
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function selectedIds(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && Boolean(value));
}

function orderedRelatedBookIds(formData: FormData) {
  return selectedIds(formData, "relatedBookIds")
    .map((bookId, index) => ({
      bookId,
      index,
      order: Number(textValue(formData, `relatedBookOrder:${bookId}`)) || index + 1,
    }))
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((item) => item.bookId);
}

function requiredId(formData: FormData) {
  const id = textValue(formData, "id");
  if (!id) redirectWithError("/admin", "Thiếu ID bản ghi.");
  return id;
}

function parseBookForm(formData: FormData, path: string) {
  const parsed = bookSchema.safeParse(
    formValues(formData, [
      "title",
      "slug",
      "author",
      "publisher",
      "description",
      "coverImage",
      "shopeeAffiliateUrl",
      "status",
      "pros",
      "cons",
      "keyLessons",
      "suitableFor",
      "notSuitableFor",
      "editorialScore",
      "practicalScore",
      "depthScore",
      "readabilityScore",
      "valueScore",
    ]),
  );

  if (!parsed.success) {
    redirectWithError(path, firstError(parsed.error));
  }

  const slug = slugify(parsed.data.slug || parsed.data.title);
  if (!slug) redirectWithError(path, "Slug không hợp lệ.");

  return {
    ...parsed.data,
    slug,
    status: parsed.data.status as BookStatus,
    pros: textList(parsed.data.pros),
    cons: textList(parsed.data.cons),
    keyLessons: textList(parsed.data.keyLessons),
    suitableFor: textList(parsed.data.suitableFor),
    notSuitableFor: textList(parsed.data.notSuitableFor),
    editorialScore: scoreValue(parsed.data.editorialScore),
    scoreBreakdown: scoreBreakdown({
      practical: parsed.data.practicalScore,
      depth: parsed.data.depthScore,
      readability: parsed.data.readabilityScore,
      value: parsed.data.valueScore,
    }),
  };
}

function parseArticleForm(formData: FormData, path: string) {
  const parsed = articleSchema.safeParse(
    formValues(formData, [
      "title",
      "slug",
      "type",
      "status",
      "excerpt",
      "content",
      "coverImage",
      "seoTitle",
      "seoDescription",
      "focusKeyword",
      "authorSlug",
      "verdictScore",
      "verdictSummary",
      "clusterId",
      "publishedAt",
      "scheduledAt",
      "faqs",
      "sources",
    ]),
  );

  if (!parsed.success) {
    redirectWithError(path, firstError(parsed.error));
  }

  const slug = slugify(parsed.data.slug || parsed.data.title);
  if (!slug) redirectWithError(path, "Slug không hợp lệ.");

  return {
    ...parsed.data,
    slug,
    type: parsed.data.type as ArticleType,
    status: parsed.data.status as ArticleStatus,
    verdictScore: scoreValue(parsed.data.verdictScore),
  };
}

function validateArticleRelations(
  data: ReturnType<typeof parseArticleForm>,
  mainBookId: string,
  relatedBookIds: string[],
  formData: FormData,
  path: string,
) {
  if (data.status !== ArticleStatus.PUBLISHED && data.status !== ArticleStatus.SCHEDULED) {
    return;
  }

  if (data.type === ArticleType.TOP_LIST && relatedBookIds.length < 3) {
    redirectWithError(path, "Top list cần ít nhất 3 sách gợi ý trước khi publish.");
  }

  if (
    (data.type === ArticleType.REVIEW || data.type === ArticleType.STORY) &&
    !mainBookId
  ) {
    redirectWithError(path, "Bài review/story cần chọn sách chính trước khi publish.");
  }

  const quality = getArticleQualitySummary({
    ...data,
    faqs: parseFaqs(data.faqs).map((faq) => ({ name: faq.question })),
    sources: parseArticleSources(data.sources).map((source) => ({ name: source.title })),
    painPoints: selectedIds(formData, "painPointIds").map((id) => ({ id })),
    audiences: selectedIds(formData, "audienceIds").map((id) => ({ id })),
    books: [
      ...(mainBookId ? [{ role: ArticleBookRole.MAIN }] : []),
      ...relatedBookIds.map(() => ({ role: ArticleBookRole.RECOMMENDED })),
    ],
  });
  const blockingLabels = new Set([
    "Có SEO title",
    "Có SEO description",
    "Có focus keyword",
    "Có verdict biên tập",
    "Có ít nhất 1 pain point",
    "Có ít nhất 1 audience",
    "Có sách liên quan",
    "Top list có ít nhất 3 sách",
    "Content top-list tối thiểu 1.500 từ",
    "Content tối thiểu 900 từ",
    "Có FAQ cho bài review/top-list",
    "Có nguồn hoặc ghi chú biên tập",
    "Review/story có sách chính",
    "Có section sách nói về gì",
    "Có review chi tiết/góc nhìn sau khi đọc",
    "Có phần ai nên đọc",
    "Có phần ai không nên đọc",
    "Có phần điểm hạn chế",
    "Có ít nhất 2 internal links theo journey",
    "Không nhắc review Shopee khi chưa có ReviewInsight",
    "CTA không nằm trong markdown",
    "Top-list có bảng chọn nhanh hoặc bảng markdown",
  ]);
  const blockers = quality.checks
    .filter((check) => !check.ok && blockingLabels.has(check.label))
    .map((check) => check.label);

  if (blockers.length) {
    redirectWithError(
      path,
      `Chưa thể ${data.status === ArticleStatus.SCHEDULED ? "lên lịch" : "publish"}: ${blockers.slice(0, 3).join(", ")}${blockers.length > 3 ? ` và ${blockers.length - 3} mục khác` : ""}.`,
    );
  }
}

function articleAuthorForForm(data: ReturnType<typeof parseArticleForm>, formData: FormData) {
  const selected = getEditorialPersonaBySlug(data.authorSlug);
  if (selected) return articleAuthorData(selected);

  const persona = resolveEditorialPersona({
    articleType: data.type,
    painPointNames: selectedIds(formData, "painPointIds"),
    audienceNames: selectedIds(formData, "audienceIds"),
    bookSignals: [
      textValue(formData, "mainBookId"),
      ...orderedRelatedBookIds(formData),
      data.title,
      data.focusKeyword || "",
    ],
  });

  return articleAuthorData(persona);
}

function parseCategoryForm(formData: FormData, path: string) {
  const parsed = categorySchema.safeParse(
    formValues(formData, ["name", "slug", "description", "seoTitle", "seoDescription"]),
  );
  if (!parsed.success) redirectWithError(path, firstError(parsed.error));

  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!slug) redirectWithError(path, "Slug không hợp lệ.");

  return {
    name: parsed.data.name,
    slug,
    description: nullable(parsed.data.description),
    seoTitle: nullable(parsed.data.seoTitle),
    seoDescription: nullable(parsed.data.seoDescription),
  };
}

function parseSimpleTaxonomyForm(formData: FormData, path: string) {
  const parsed = simpleTaxonomySchema.safeParse(
    formValues(formData, ["name", "slug", "description"]),
  );
  if (!parsed.success) redirectWithError(path, firstError(parsed.error));

  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!slug) redirectWithError(path, "Slug không hợp lệ.");

  return {
    name: parsed.data.name,
    slug,
    description: nullable(parsed.data.description),
  };
}

function textList(value?: string) {
  return (value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseFaqs(value?: string) {
  return (value || "")
    .split(/\r?\n/)
    .map((line, index) => {
      const separatorIndex = line.indexOf("|");
      if (separatorIndex < 0) return null;
      const question = line.slice(0, separatorIndex).trim();
      const answer = line.slice(separatorIndex + 1).trim();
      if (!question || !answer) return null;
      return { question, answer, order: index + 1 };
    })
    .filter((item): item is { question: string; answer: string; order: number } => Boolean(item));
}

function parseArticleSources(value?: string) {
  return (value || "")
    .split(/\r?\n/)
    .map((line, index) => {
      const [rawTitle, rawUrl, rawKind, rawNote] = line.split("|").map((item) => item.trim());
      const title = rawTitle || rawUrl;
      if (!title) return null;

      const url = rawUrl && isValidUrl(rawUrl) ? rawUrl : null;
      const kind = sourceKind(rawKind);
      const domain = url ? new URL(url).hostname.replace(/^www\./, "") : null;

      return {
        title,
        url,
        domain,
        kind,
        note: nullable(rawNote),
        order: index + 1,
      };
    })
    .filter(
      (
        item,
      ): item is {
        title: string;
        url: string | null;
        domain: string | null;
        kind: ArticleSourceKind;
        note: string | null;
        order: number;
      } => Boolean(item),
    );
}

function sourceKind(value?: string) {
  const normalized = value?.trim().toUpperCase();
  if (
    normalized === ArticleSourceKind.BUYER_REVIEWS ||
    normalized === ArticleSourceKind.PUBLISHER ||
    normalized === ArticleSourceKind.EDITORIAL_NOTE ||
    normalized === ArticleSourceKind.REFERENCE
  ) {
    return normalized;
  }

  return ArticleSourceKind.REFERENCE;
}

function scoreValue(value?: string | null) {
  if (!value?.trim()) return null;
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.min(Math.max(score, 0), 5);
}

function scoreBreakdown(values: Record<string, string | undefined>) {
  const entries = Object.entries(values)
    .map(([key, value]) => [key, scoreValue(value)] as const)
    .filter((entry): entry is readonly [string, number] => typeof entry[1] === "number");

  return entries.length ? Object.fromEntries(entries) : Prisma.JsonNull;
}

function nullable(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function publishedAtFor(status: ArticleStatus, value?: string) {
  if (status !== ArticleStatus.PUBLISHED) return null;
  if (!value) return new Date();

  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function scheduledAtFor(status: ArticleStatus, value?: string) {
  if (status !== ArticleStatus.SCHEDULED) return null;
  return parseVietnamDatetimeLocal(value) || defaultVietnamScheduledDate();
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
  const nextDay = new Date(
    Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day) + 1, 1, 0, 0),
  );

  return nextDay;
}

async function syncBookAffiliateLink(
  bookId: string,
  title: string,
  slug: string,
  destinationUrl?: string,
) {
  const existing = await prisma.affiliateLink.findFirst({
    where: { bookId, articleId: null },
  });

  if (!destinationUrl) {
    if (existing) {
      await prisma.affiliateLink.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }
    await prisma.affiliateLink.updateMany({
      where: { bookId },
      data: { isActive: false },
    });
    return;
  }

  const data = {
    bookId,
    articleId: null,
    label: `Xem giá ${title}`,
    destinationUrl,
    trackingSlug: `book-${slug}`,
    isActive: true,
  };

  if (existing) {
    await prisma.affiliateLink.update({ where: { id: existing.id }, data });
  } else {
    await prisma.affiliateLink.create({ data });
  }

  // Tự động cập nhật destinationUrl cho toàn bộ bài viết liên kết với cuốn sách này
  await prisma.affiliateLink.updateMany({
    where: { bookId, articleId: { not: null } },
    data: {
      destinationUrl,
      isActive: true,
    },
  });

  // Tự động tạo link affiliate cho bài viết có sách chính là cuốn này nếu chưa có
  const mainArticles = await prisma.articleBook.findMany({
    where: { bookId, role: ArticleBookRole.MAIN },
    include: { article: { select: { id: true, title: true, slug: true } } },
  });

  for (const ab of mainArticles) {
    const articleLink = await prisma.affiliateLink.findFirst({
      where: { articleId: ab.article.id },
    });
    if (!articleLink) {
      await prisma.affiliateLink.create({
        data: {
          articleId: ab.article.id,
          bookId,
          label: `Xem sách gợi ý cho bài ${ab.article.title}`,
          destinationUrl,
          trackingSlug: await uniqueAffiliateTrackingSlug(`article-${ab.article.slug}`),
          isActive: true,
        },
      });
    }
  }
}

async function syncArticleBooks(
  articleId: string,
  articleType: ArticleType,
  mainBookId: string,
  relatedBookIds: string[],
) {
  const shouldUseMainBook = articleType !== ArticleType.TOP_LIST && Boolean(mainBookId);
  const normalizedRelatedIds = Array.from(
    new Set(
      relatedBookIds.filter(
        (bookId) => bookId && (!shouldUseMainBook || bookId !== mainBookId),
      ),
    ),
  );

  await prisma.articleBook.deleteMany({ where: { articleId } });

  const rows = [
    ...(shouldUseMainBook
      ? [{ articleId, bookId: mainBookId, role: ArticleBookRole.MAIN, order: 0 }]
      : []),
    ...normalizedRelatedIds.map((bookId, index) => ({
      articleId,
      bookId,
      role: ArticleBookRole.RECOMMENDED,
      order: index + 1,
    })),
  ];

  if (rows.length) {
    await prisma.articleBook.createMany({ data: rows, skipDuplicates: true });
  }
}

async function syncArticleFaqs(articleId: string, faqsText?: string) {
  await prisma.fAQ.deleteMany({ where: { articleId } });
  const faqs = parseFaqs(faqsText);
  if (faqs.length) {
    await prisma.fAQ.createMany({
      data: faqs.map((faq) => ({ ...faq, articleId })),
    });
  }
}

async function syncArticleSources(articleId: string, sourcesText?: string) {
  await prisma.articleSource.deleteMany({ where: { articleId } });
  const sources = parseArticleSources(sourcesText);
  if (sources.length) {
    await prisma.articleSource.createMany({
      data: sources.map((source) => ({ ...source, articleId })),
    });
  }
}

async function syncArticleAffiliateLink(
  articleId: string,
  title: string,
  slug: string,
  mainBookId?: string,
) {
  const existing = await prisma.affiliateLink.findFirst({
    where: { articleId },
  });

  const book = mainBookId
    ? await prisma.book.findUnique({
        where: { id: mainBookId },
        select: { id: true, shopeeAffiliateUrl: true },
      })
    : null;

  if (!book?.shopeeAffiliateUrl) {
    if (existing) {
      await prisma.affiliateLink.update({
        where: { id: existing.id },
        data: { isActive: false },
      });
    }
    return;
  }

  const data = {
    articleId,
    bookId: book.id,
    label: `Xem sách gợi ý cho bài ${title}`,
    destinationUrl: book.shopeeAffiliateUrl,
    isActive: true,
  };

  if (existing) {
    await prisma.affiliateLink.update({ where: { id: existing.id }, data });
  } else {
    await prisma.affiliateLink.create({
      data: {
        ...data,
        trackingSlug: await uniqueAffiliateTrackingSlug(`article-${slug}`),
      },
    });
  }
}

async function uniqueAffiliateTrackingSlug(input: string) {
  const base = slugify(input) || `affiliate-${Date.now()}`;
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

function firstError(error: z.ZodError) {
  return error.issues[0]?.message || "Dữ liệu không hợp lệ.";
}

async function checkAdminLoginRateLimit(email: string) {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const userAgent = headerStore.get("user-agent") || "";
  const ipKey = hashIp(`${forwardedFor || realIp || "unknown"}:${userAgent}`) || "unknown";

  return rateLimit({
    key: `admin-login:${email.toLowerCase()}:${ipKey}`,
    limit: 8,
    windowMs: 15 * 60 * 1000,
  });
}

function isValidUrl(value: string) {
  if (value.startsWith("/")) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function handlePrismaError(error: unknown, path: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      redirectWithError(path, "Slug hoặc tracking slug đã tồn tại.");
    }
    if (error.code === "P2025") {
      redirectWithError(path, "Không tìm thấy bản ghi cần cập nhật.");
    }
  }

  console.error(error);
  redirectWithError(path, "Có lỗi khi lưu dữ liệu. Vui lòng thử lại.");
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function redirectWithSuccess(path: string, message: string): never {
  redirect(`${path}?success=${encodeURIComponent(message)}`);
}

function revalidateAdmin() {
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/sach");
  revalidatePath("/sach/[slug]", "page");
  revalidatePath("/bai-viet/[slug]", "page");
  revalidatePath("/noi-dau/[slug]", "page");
  revalidatePath("/chu-de/[slug]", "page");
  revalidatePath("/doi-tuong/[slug]", "page");
  revalidatePath("/cum-noi-dung/[slug]", "page");
  revalidatePath("/admin");
  revalidatePath("/admin/books");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/pain-points");
  revalidatePath("/admin/audiences");
  revalidatePath("/bai-viet");
}
