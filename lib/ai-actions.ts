"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArticleBookRole, ArticleStatus, ArticleType, Prisma } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { readingTimeFromMarkdown } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

const draftFromAiSchema = z.object({
  generationId: z.string().min(1, "Thiếu generation ID."),
  title: z.string().trim().min(1, "Thiếu tiêu đề draft."),
  excerpt: z.string().trim().min(1, "Thiếu excerpt draft."),
  content: z.string().trim().min(1, "Thiếu nội dung draft."),
  type: z.enum(["REVIEW", "TOP_LIST", "STORY", "COMPARISON", "GUIDE"]),
  seoTitle: z.string().trim().optional(),
  seoDescription: z.string().trim().optional(),
  focusKeyword: z.string().trim().optional(),
  bookId: z.string().optional(),
  painPointId: z.string().optional(),
  audienceId: z.string().optional(),
});

export async function createArticleDraftFromAiAction(formData: FormData) {
  await requireAdmin();

  const parsed = draftFromAiSchema.safeParse({
    generationId: textValue(formData, "generationId"),
    title: textValue(formData, "title"),
    excerpt: textValue(formData, "excerpt"),
    content: textValue(formData, "content"),
    type: mapContentTypeToArticleType(textValue(formData, "contentType")),
    seoTitle: textValue(formData, "seoTitle"),
    seoDescription: textValue(formData, "seoDescription"),
    focusKeyword: textValue(formData, "focusKeyword"),
    bookId: textValue(formData, "bookId"),
    painPointId: textValue(formData, "painPointId"),
    audienceId: textValue(formData, "audienceId"),
  });

  if (!parsed.success) {
    redirect(`/admin/ai?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ.")}`);
  }

  const data = parsed.data;
  const generation = await prisma.aiGeneration.findUnique({
    where: { id: data.generationId },
  });
  if (!generation) {
    redirect("/admin/ai?error=Không tìm thấy AI generation.");
  }

  try {
    const article = await prisma.article.create({
      data: {
        title: data.title,
        slug: await uniqueArticleSlug(data.title),
        excerpt: data.excerpt,
        content: data.content,
        type: data.type as ArticleType,
        status: ArticleStatus.DRAFT,
        seoTitle: nullable(data.seoTitle),
        seoDescription: nullable(data.seoDescription),
        focusKeyword: nullable(data.focusKeyword),
        readingTime: readingTimeFromMarkdown(data.content),
        categories: {
          connect: selectedIds(formData, "categoryIds").map((id) => ({ id })),
        },
        painPoints: data.painPointId
          ? { connect: [{ id: data.painPointId }] }
          : undefined,
        audiences: data.audienceId
          ? { connect: [{ id: data.audienceId }] }
          : undefined,
        books: data.bookId
          ? {
              create: {
                bookId: data.bookId,
                role:
                  data.type === "TOP_LIST"
                    ? ArticleBookRole.RECOMMENDED
                    : ArticleBookRole.MAIN,
                order: data.type === "TOP_LIST" ? 1 : 0,
              },
            }
          : undefined,
      },
    });

    await prisma.aiGeneration.update({
      where: { id: generation.id },
      data: { articleId: article.id },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/articles");
    redirect(`/admin/articles/${article.id}/edit?success=Đã copy AI output sang article draft.`);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/admin/ai?error=Slug bài viết đã tồn tại, hãy đổi tiêu đề draft.");
    }
    console.error(error);
    redirect("/admin/ai?error=Không tạo được article draft từ AI output.");
  }
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

function nullable(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function mapContentTypeToArticleType(contentType: string) {
  if (contentType === "Top list") return "TOP_LIST";
  if (contentType === "Story essay") return "STORY";
  if (contentType === "Comparison") return "COMPARISON";
  return "REVIEW";
}

async function uniqueArticleSlug(title: string) {
  const base = slugify(title) || `ai-draft-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (await prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
