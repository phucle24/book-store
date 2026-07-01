"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  AiGenerationType,
  ArticleBookRole,
  ArticleType,
  type Book,
} from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { DeepSeekConfigError, improveDraft, type ContentType } from "@/lib/deepseek";
import { prisma } from "@/lib/prisma";

export async function improveArticleContentAction(formData: FormData) {
  await requireAdmin();

  const id = textValue(formData, "id");
  if (!id) redirect("/admin/articles?error=Thiếu ID bài viết.");

  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      painPoints: true,
      audiences: true,
      books: {
        orderBy: [{ order: "asc" }],
        include: { book: true },
      },
      reviewInsight: true,
    },
  });

  if (!article) {
    redirect("/admin/articles?error=Không tìm thấy bài viết.");
  }

  const mainBook =
    article.books.find((item) => item.role === ArticleBookRole.MAIN)?.book ||
    article.books[0]?.book ||
    null;
  const relatedBooks = article.books
    .filter((item) => item.role !== ArticleBookRole.MAIN)
    .map((item) => item.book);
  const extraNotes = [
    article.reviewInsight
      ? `Bài này có ReviewInsight nội bộ. Có thể dùng insight đã phân tích, nhưng không quote review và không nhắc tên người mua. Summary: ${article.reviewInsight.summary || "Chưa có summary."}`
      : "Bài này chưa có ReviewInsight. Không viết như đã tổng hợp review Shopee.",
    "Ưu tiên tăng hook, review chi tiết, section còn thiếu, FAQ ideas và internal link ideas.",
  ].join("\n");

  try {
    const outputMarkdown = await improveDraft({
      contentType: mapArticleTypeToContentType(article.type),
      book: mainBook ? normalizeBook(mainBook) : null,
      relatedBooks: relatedBooks.map(normalizeBook),
      painPoint: article.painPoints[0] || null,
      audience: article.audiences[0] || null,
      focusKeyword: article.focusKeyword || article.title,
      tone: "ấm, từng trải, không quảng cáo",
      extraNotes,
      verifiedRead: false,
      draft: article.content,
    });

    await prisma.aiGeneration.create({
      data: {
        type: AiGenerationType.IMPROVE,
        inputJson: {
          articleId: article.id,
          title: article.title,
          type: article.type,
          focusKeyword: article.focusKeyword,
          extraNotes,
        },
        outputMarkdown,
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        articleId: article.id,
        bookId: mainBook?.id,
      },
    });

    revalidatePath(`/admin/articles/${article.id}/edit`);
    redirect(
      `/admin/articles/${article.id}/edit?success=${encodeURIComponent(
        "AI đã tạo bản improve. Hãy xem ở panel AI Improve và copy thủ công nếu phù hợp.",
      )}`,
    );
  } catch (error) {
    if (error instanceof DeepSeekConfigError) {
      redirect(
        `/admin/articles/${article.id}/edit?error=${encodeURIComponent(error.message)}`,
      );
    }

    console.error(error);
    redirect(
      `/admin/articles/${article.id}/edit?error=${encodeURIComponent(
        "Không tạo được bản improve lúc này. Kiểm tra DeepSeek API hoặc thử lại.",
      )}`,
    );
  }
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function mapArticleTypeToContentType(type: ArticleType): ContentType {
  if (type === ArticleType.TOP_LIST) return "Top list";
  if (type === ArticleType.STORY) return "Story essay";
  if (type === ArticleType.COMPARISON) return "Comparison";
  return "Review sách";
}

function normalizeBook(book: Book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    description: book.description,
    pros: book.pros,
    cons: book.cons,
    keyLessons: book.keyLessons,
    suitableFor: book.suitableFor,
    notSuitableFor: book.notSuitableFor,
  };
}
