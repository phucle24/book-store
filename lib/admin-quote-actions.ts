"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookStatus } from "@prisma/client";
import { ALL_THEME_SLUGS } from "@/lib/quote-themes";
import { DeepSeekConfigError } from "@/lib/deepseek";
import OpenAI from "openai";

// ─── Admin form actions (void returns) ───────────────────────────────────────

export async function adminGenerateAllQuotes(_formData: FormData) {
  await requireAdmin();

  const books = await prisma.book.findMany({
    where: { status: BookStatus.ACTIVE },
    select: { id: true },
  });

  let total = 0;
  for (const book of books) {
    try {
      const count = await generateQuotesCore(book.id);
      total += count;
    } catch (err) {
      console.error(`Lỗi tạo quotes sách ${book.id}:`, err);
    }
  }

  revalidatePath("/trich-dan");
  ALL_THEME_SLUGS.forEach((slug) => revalidatePath(`/trich-dan/${slug}`));
  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes?success=${encodeURIComponent(`Đã tạo ${total} quotes cho ${books.length} sách`)}`);
}

export async function adminGenerateQuotesForBook(bookId: string, _formData: FormData) {
  await requireAdmin();

  try {
    const count = await generateQuotesCore(bookId);
    revalidatePath("/trich-dan");
    ALL_THEME_SLUGS.forEach((slug) => revalidatePath(`/trich-dan/${slug}`));
    revalidatePath("/admin/quotes");
    redirect(`/admin/quotes?success=${encodeURIComponent(`Đã tạo ${count} quotes`)}`);
  } catch (err) {
    const msg = err instanceof DeepSeekConfigError
      ? err.message
      : err instanceof Error
        ? err.message
        : "Không tạo được quotes. Kiểm tra DEEPSEEK_API_KEY.";
    redirect(`/admin/quotes?error=${encodeURIComponent(msg)}`);
  }
}

export async function adminDeleteQuote(id: string, _formData: FormData) {
  await requireAdmin();
  await prisma.quote.delete({ where: { id } });
  revalidatePath("/trich-dan");
  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes?success=${encodeURIComponent("Đã xóa quote")}`);
}

// ─── Core AI generation logic (not a server action) ──────────────────────────

async function generateQuotesCore(bookId: string): Promise<number> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
    select: {
      title: true,
      author: true,
      description: true,
      keyLessons: true,
      pros: true,
      suitableFor: true,
    },
  });

  if (!book) throw new Error("Không tìm thấy sách.");

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) throw new DeepSeekConfigError("Thiếu DEEPSEEK_API_KEY.");

  const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 90_000 });

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `Bạn là biên tập viên sáng tạo chuyên trích lọc những câu nói đắt giá, sâu sắc nhất từ sách.
Nhiệm vụ: Chọn lọc đúng 10 câu trích dẫn TÂM ĐẮC NHẤT, ĐẮT GIÁ NHẤT và CHẠM CẢM XÚC NHẤT từ cuốn sách, dùng được ngay làm caption mạng xã hội (Facebook, TikTok, Instagram).
Quy tắc:
- Đúng 10 câu, chất lượng cao, sâu sắc, ngắn gọn (1–3 dòng), không dài dòng, không sáo rỗng.
- Phản ánh chính xác tinh thần và tư tưởng cốt lõi của cuốn sách.
- Mỗi câu phải gán ít nhất 1 theme từ danh sách: tinh-yeu, tuoi-tre, dong-luc, song-co-y-nghia, tac-phong-lam-viec, noi-dau-va-chua-lanh.
Trả về JSON object: { "quotes": [ { "content": "...", "attribution": "Tên sách — Tác giả", "themes": ["dong-luc"] } ] }`,
      },
      {
        role: "user",
        content: `Sách: ${book.title}\nTác giả: ${book.author}\nMô tả: ${book.description}\nBài học: ${book.keyLessons.join("; ")}\nĐiểm mạnh: ${book.pros.join("; ")}\nPhù hợp: ${book.suitableFor.join("; ")}\n\nHãy chắt lọc 10 câu trích dẫn tâm đắc, đắt giá nhất.`,
      },
    ],
    temperature: 0.8,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "{}";
  let items: Array<{ content: string; attribution?: string; themes?: string[] }> = [];

  try {
    const parsed = JSON.parse(raw);
    items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.quotes) ? parsed.quotes : [];
  } catch {
    return 0;
  }

  // Xóa quotes cũ, tạo quotes mới
  await prisma.quote.deleteMany({ where: { bookId } });

  const validItems = items.filter(
    (item) => typeof item.content === "string" && item.content.trim().length > 0,
  );

  if (validItems.length > 0) {
    await prisma.quote.createMany({
      data: validItems.map((item, i) => ({
        bookId,
        content: item.content.trim(),
        attribution: item.attribution || `${book.title} — ${book.author}`,
        themes: (item.themes || []).filter((t) => ALL_THEME_SLUGS.includes(t)),
        isPublished: true,
        order: i,
      })),
    });
  }

  return validItems.length;
}
