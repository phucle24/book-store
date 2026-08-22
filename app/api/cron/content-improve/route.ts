import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ArticleStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getArticleQualitySummary } from "@/lib/content-quality";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/content-improve
 * Scans published/scheduled articles with lower quality scores,
 * and automatically enriches/rewrites them using AI to satisfy 100% of the Quality Checklist.
 *
 * Crontab example (every Sunday 02:00 UTC = 09:00 VN):
 * 0 2 * * 0 curl -fsS -X POST https://tramdocmotchut.io.vn/api/cron/content-improve \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET" > /dev/null 2>&1
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;

  if (bearer !== secret && headerSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "DEEPSEEK_API_KEY not configured." }, { status: 503 });
  }

  try {
    // 1. Lấy tất cả bài viết kèm quan hệ để chấm điểm
    const articles = await prisma.article.findMany({
      where: {
        status: { in: [ArticleStatus.PUBLISHED, ArticleStatus.SCHEDULED] },
      },
      include: {
        books: { include: { book: true } },
        painPoints: true,
        audiences: true,
        faqs: true,
        sources: true,
      },
      orderBy: { updatedAt: "asc" },
      take: 20,
    });

    // 2. Lọc ra tối đa 3 bài có điểm thấp nhất (< 80)
    const lowQualityArticles = articles
      .map((art) => ({
        article: art,
        summary: getArticleQualitySummary(art),
      }))
      .filter((item) => item.summary.score < 80)
      .sort((a, b) => a.summary.score - b.summary.score)
      .slice(0, 3);

    if (!lowQualityArticles.length) {
      return NextResponse.json({
        improvedCount: 0,
        message: "Tất cả bài viết đều đạt chuẩn chất lượng cao (>= 80/100).",
      });
    }

    const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
    const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 120_000 });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tramdocmotchut.io.vn";

    const improvedSlugs: string[] = [];

    for (const { article, summary } of lowQualityArticles) {
      const mainBook = article.books[0]?.book;
      const failedReasons = [
        ...summary.failedRequired.map((c) => c.label),
        ...summary.failedWarnings.map((c) => c.label),
      ].join(", ");

      const painPointLinks = article.painPoints
        .slice(0, 2)
        .map((p) => `[${p.name}](${siteUrl}/noi-dau/${p.id})`)
        .join("\n");

      const systemPrompt = `Bạn là Trưởng ban Biên tập sách cao cấp.
Nhiệm vụ: Cải thiện và viết lại bài review sau để ĐẠT 100 ĐIỂM Content Quality Checklist.

Các lỗi bài viết hiện tại đang gặp:
${failedReasons || "Cần nâng cấp độ sâu và từ vựng."}

BẮT BUỘC tuân thủ Content Quality Checklist:
- Tối thiểu 1.500 từ thực chất, sâu sắc, không lan man
- PHẢI có đúng 6 heading sau:
  ## Sách nói về điều gì?
  ## Góc nhìn sau khi đọc — Đánh giá chi tiết
  ## Ai nên đọc cuốn sách này?
  ## Ai không nên đọc?
  ## Điểm hạn chế cần cân nhắc
  ## Nên mua nếu / Chưa nên mua nếu
- PHẢI dùng "tôi" hoặc "chúng tôi" ít nhất 3 lần
- PHẢI có ít nhất 2 internal link markdown: [mô tả](/bai-viet/... hoặc /sach/... hoặc /noi-dau/...)
- PHẢI có chi tiết cụ thể: số trang, tên chương, số liệu, năm xuất bản
- PHẢI đề cập nỗi đau của đối tượng trong 200 chữ ĐẦU TIÊN
- KHÔNG dùng cụm sáo rỗng: "trong thời đại ngày nay", "không thể phủ nhận rằng", "chìa khóa thành công", "hãy cùng khám phá", "đắm chìm", "hành trình khám phá", "tóm lại"
- KHÔNG chèn link affiliate hay CTA trong markdown
- FAQs: Tạo 3-5 câu hỏi thường gặp
- Sources: Tạo ít nhất 1 ghi chú nguồn biên tập

Trả về JSON:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "verdictScore": 4.5,
  "verdictSummary": "...",
  "content": "## Sách nói về điều gì?\\n\\n...",
  "faqs": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ],
  "sources": [
    { "label": "Ghi chú biên tập", "url": "", "note": "Nội dung review được biên tập lại hoàn chỉnh dựa trên phân tích sách thực tế." }
  ]
}`;

      const userPrompt = `Bài viết: ${article.title}
Sách: ${mainBook?.title || article.title} — ${mainBook?.author || "Tác giả"}
Focus Keyword: ${article.focusKeyword || mainBook?.title || "review sách"}
Nỗi đau hướng tới: ${article.painPoints.map((p) => p.name).join(", ")}
Đối tượng: ${article.audiences.map((a) => a.name).join(", ")}

Nội dung hiện tại (hãy mở rộng, nâng cấp toàn diện):
${article.content.slice(0, 2000)}

Internal links gợi ý chèn vào bài:
${painPointLinks || `[Xem thêm sách hay](/sach/${mainBook?.slug || ""})`}`;

      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "{}";
      const output: {
        seoTitle?: string;
        seoDescription?: string;
        verdictScore?: number;
        verdictSummary?: string;
        content?: string;
        faqs?: Array<{ question: string; answer: string }>;
        sources?: Array<{ label: string; url?: string; note?: string }>;
      } = JSON.parse(raw);

      if (!output.content) continue;

      const faqData = (output.faqs || []).filter((f) => f.question && f.answer);
      const sourceData = (output.sources || []).filter((s) => s.label);

      // Cập nhật bài viết
      await prisma.article.update({
        where: { id: article.id },
        data: {
          content: output.content,
          seoTitle: output.seoTitle || article.seoTitle,
          seoDescription: output.seoDescription || article.seoDescription,
          verdictScore: output.verdictScore ?? article.verdictScore,
          verdictSummary: output.verdictSummary || article.verdictSummary,
          readingTime: Math.max(1, Math.round(output.content.split(" ").length / 200)),
        },
      });

      // Bổ sung FAQs nếu bài cũ chưa có
      if (article.faqs.length === 0 && faqData.length > 0) {
        await prisma.fAQ.createMany({
          data: faqData.map((f, idx) => ({
            articleId: article.id,
            question: f.question,
            answer: f.answer,
            order: idx,
          })),
        });
      }

      // Bổ sung Sources nếu bài cũ chưa có
      if (article.sources.length === 0 && sourceData.length > 0) {
        await prisma.articleSource.createMany({
          data: sourceData.map((s, idx) => ({
            articleId: article.id,
            title: s.label,
            url: s.url || null,
            note: s.note || null,
            order: idx,
          })),
        });
      }

      improvedSlugs.push(article.slug);
    }

    revalidatePath("/bai-viet");
    revalidatePath("/admin/articles");
    revalidatePath("/admin/content-audit");

    return NextResponse.json({
      improvedCount: improvedSlugs.length,
      improvedSlugs,
    });
  } catch (error) {
    console.error("Content improve cron error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
