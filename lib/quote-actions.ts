"use server";

import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { BookStatus } from "@prisma/client";
import { ALL_THEME_SLUGS } from "@/lib/quote-themes";
import { DeepSeekConfigError } from "@/lib/deepseek";

type GeneratedQuote = {
  content: string;
  attribution: string;
  themes: string[];
};

// ─── AI generate quotes for a single book ───────────────────────────────────

export async function generateQuotesForBookAction(bookId: string) {
  await requireAdmin();

  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      id: true,
      title: true,
      author: true,
      description: true,
      keyLessons: true,
      pros: true,
      suitableFor: true,
    },
  });

  if (!book) throw new Error("Không tìm thấy sách.");

  const quotes = await callAiGenerateQuotes(book);

  // Xóa quotes cũ của sách này (tránh duplicate khi chạy lại)
  await prisma.quote.deleteMany({ where: { bookId } });

  if (quotes.length > 0) {
    await prisma.quote.createMany({
      data: quotes.map((q, i) => ({
        bookId,
        content: q.content,
        attribution: q.attribution || `${book.title} — ${book.author}`,
        themes: q.themes.filter((t) => ALL_THEME_SLUGS.includes(t)),
        isPublished: true,
        order: i,
      })),
    });
  }

  revalidatePath("/trich-dan");
  ALL_THEME_SLUGS.forEach((slug) => revalidatePath(`/trich-dan/${slug}`));

  return { bookId, count: quotes.length };
}

// ─── AI generate quotes for ALL books ───────────────────────────────────────

export async function generateQuotesForAllBooksAction() {
  await requireAdmin();

  const books = await prisma.book.findMany({
    where: { status: BookStatus.ACTIVE },
    select: { id: true },
  });

  const results: { bookId: string; count: number }[] = [];

  for (const book of books) {
    try {
      const result = await generateQuotesForBookAction(book.id);
      results.push(result);
    } catch (err) {
      console.error(`Lỗi tạo quotes cho sách ${book.id}:`, err);
      results.push({ bookId: book.id, count: 0 });
    }
  }

  return results;
}

// ─── Admin: list all quotes ──────────────────────────────────────────────────

export async function getAdminQuotes(themeFilter?: string) {
  await requireAdmin();
  return prisma.quote.findMany({
    where: themeFilter
      ? { themes: { has: themeFilter } }
      : undefined,
    include: { book: { select: { title: true, slug: true } } },
    orderBy: [{ bookId: "asc" }, { order: "asc" }],
    take: 200,
  });
}

// ─── Public: get quotes by theme ────────────────────────────────────────────

export async function getQuotesByTheme(theme: string, limit = 60) {
  return prisma.quote.findMany({
    where: { themes: { has: theme }, isPublished: true },
    include: {
      book: {
        select: {
          title: true,
          slug: true,
          author: true,
          affiliateLinks: { where: { isActive: true }, take: 1 },
        },
      },
    },
    orderBy: { order: "asc" },
    take: limit,
  });
}

// ─── Public: quote counts per theme ─────────────────────────────────────────

export async function getQuoteCountsByTheme() {
  const quotes = await prisma.quote.findMany({
    where: { isPublished: true },
    select: { themes: true },
  });

  const counts: Record<string, number> = {};
  for (const q of quotes) {
    for (const theme of q.themes) {
      counts[theme] = (counts[theme] || 0) + 1;
    }
  }
  return counts;
}

// ─── Admin: delete quote ─────────────────────────────────────────────────────

export async function deleteQuoteAction(id: string) {
  await requireAdmin();
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/trich-dan");
  revalidatePath("/admin/quotes");
}

// ─── AI helper ──────────────────────────────────────────────────────────────

async function callAiGenerateQuotes(book: {
  title: string;
  author: string;
  description: string;
  keyLessons: string[];
  pros: string[];
  suitableFor: string[];
}): Promise<GeneratedQuote[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    throw new DeepSeekConfigError("Thiếu DEEPSEEK_API_KEY.");
  }

  const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 90_000 });

  const systemPrompt = `Bạn là biên tập viên sáng tạo chuyên trích lọc những câu nói đắt giá, sâu sắc nhất từ sách.
Nhiệm vụ: Chọn lọc đúng 10 câu trích dẫn TÂM ĐẮC NHẤT, ĐẮT GIÁ NHẤT và CHẠM CẢM XÚC NHẤT từ cuốn sách, dùng được ngay làm caption mạng xã hội (Facebook, TikTok, Instagram).

Quy tắc:
- Đúng 10 câu, chất lượng cao, sâu sắc, ngắn gọn (1–3 dòng), không sáo rỗng
- Phản ánh đúng tinh thần cuốn sách, không bịa đặt
- Mỗi câu phải gán ít nhất 1 theme trong danh sách sau:
  tinh-yeu, tuoi-tre, dong-luc, song-co-y-nghia, tac-phong-lam-viec, noi-dau-va-chua-lanh
- Trả về JSON array, không có text khác

Format JSON:
[
  {
    "content": "Câu trích dẫn ở đây...",
    "attribution": "Tên sách — Tác giả",
    "themes": ["dong-luc", "tuoi-tre"]
  }
]`;

  const userPrompt = `Sách: ${book.title}
Tác giả: ${book.author}
Mô tả: ${book.description}

Bài học chính:
${book.keyLessons.map((l) => `- ${l}`).join("\n")}

Điểm mạnh:
${book.pros.map((p) => `- ${p}`).join("\n")}

Phù hợp với:
${book.suitableFor.map((s) => `- ${s}`).join("\n")}

Hãy chắt lọc 10 câu caption/trích dẫn tâm đắc, đắt giá nhất theo format JSON yêu cầu.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "[]";

  try {
    const parsed = JSON.parse(raw);
    // Hỗ trợ cả { quotes: [...] } và [...]
    const arr: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.quotes)
        ? parsed.quotes
        : [];

    return arr
      .filter(
        (item): item is GeneratedQuote =>
          typeof item === "object" &&
          item !== null &&
          typeof (item as GeneratedQuote).content === "string" &&
          (item as GeneratedQuote).content.trim().length > 0,
      )
      .map((item) => ({
        content: (item as GeneratedQuote).content.trim(),
        attribution:
          (item as GeneratedQuote).attribution ||
          `${book.title} — ${book.author}`,
        themes: Array.isArray((item as GeneratedQuote).themes)
          ? (item as GeneratedQuote).themes
          : [],
      }));
  } catch {
    return [];
  }
}
