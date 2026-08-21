import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ArticleStatus, BookStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifySearchEngines } from "@/lib/indexing";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/ai-planner
 * Runs weekly: generates + writes + schedules new articles automatically.
 * Called by system cron (same CRON_SECRET as publish-scheduled).
 *
 * Crontab example (every Monday 01:00 UTC = 08:00 VN):
 * 0 1 * * 1 curl -fsS -X POST https://tramdocmotchut.io.vn/api/cron/ai-planner \
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
    // 1. Get books with affiliate URLs
    const books = await prisma.book.findMany({
      where: { status: BookStatus.ACTIVE, shopeeAffiliateUrl: { not: null } },
      include: { painPoints: true, audiences: true },
    });

    if (!books.length) {
      return NextResponse.json({ skipped: true, reason: "No active books with affiliate URLs." });
    }

    // 2. Get existing articles to avoid duplicates
    const existing = await prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      select: { title: true, focusKeyword: true },
    });
    const existingTitles = existing.map((a) => a.title).join(", ");

    // 3. AI generates plan (2 articles per book)
    const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
    const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 90_000 });

    const bookListStr = books
      .map(
        (b) =>
          `ID:${b.id} | ${b.title} | ${b.painPoints.map((p) => p.name).join(",")}`,
      )
      .join("\n");

    const planCompletion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Tạo kế hoạch 2 bài viết SEO mới cho mỗi cuốn sách. Trả về JSON array:
[{"bookId":"...","focusKeyword":"...","angle":"..."}]`,
        },
        {
          role: "user",
          content: `Sách:\n${bookListStr}\n\nBài đã có (không lặp): ${existingTitles || "Chưa có."}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const planRaw = planCompletion.choices[0]?.message?.content?.trim() || "[]";
    let planItems: Array<{ bookId: string; focusKeyword: string; angle: string }>;

    try {
      const parsed = JSON.parse(planRaw);
      planItems = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.plan)
          ? parsed.plan
          : Array.isArray(parsed.items)
            ? parsed.items
            : [];
    } catch {
      planItems = [];
    }

    // 4. Schedule dates: Mon/Wed/Fri starting next Monday at 08:00 VN (01:00 UTC)
    const startDate = nextMonday();
    const schedule = planItems.map((_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i * 2);
      return d;
    });

    const bookMap = new Map(books.map((b) => [b.id, b]));
    const results: string[] = [];

    // 5. Write each article
    for (let i = 0; i < planItems.length; i++) {
      const item = planItems[i];
      const book = bookMap.get(item.bookId);
      if (!book) continue;

      try {
        const articleCompletion = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: `Viết bài review sách tiếng Việt. Trả về JSON:
{"title":"...","slug":"...","excerpt":"...","seoTitle":"...","seoDescription":"...","verdictScore":4.2,"verdictSummary":"...","content":"## Markdown..."}`,
            },
            {
              role: "user",
              content: `Sách: ${book.title} — ${book.author}
Nỗi đau: ${book.painPoints.map((p) => p.name).join(", ")}
Focus keyword: ${item.focusKeyword}
Góc bài: ${item.angle}`,
            },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        });

        const raw = articleCompletion.choices[0]?.message?.content?.trim() || "{}";
        const output = JSON.parse(raw);

        if (!output.title || !output.content) continue;

        const scheduledAt = schedule[i] || startDate;
        const slug = await uniqueArticleSlug(output.slug || output.title);
        const trackingSlug = `weekly-${slug}`.slice(0, 80);

        await prisma.article.create({
          data: {
            title: output.title,
            slug,
            excerpt: output.excerpt || "",
            content: output.content,
            type: "REVIEW",
            status: ArticleStatus.SCHEDULED,
            seoTitle: output.seoTitle || output.title,
            seoDescription: output.seoDescription || output.excerpt || "",
            focusKeyword: item.focusKeyword,
            verdictScore: output.verdictScore ?? null,
            verdictSummary: output.verdictSummary || null,
            readingTime: Math.max(1, Math.round(output.content.split(" ").length / 200)),
            publishedAt: scheduledAt,
            scheduledAt,
            painPoints: { connect: book.painPoints.map((p) => ({ id: p.id })) },
            audiences: { connect: book.audiences.map((a) => ({ id: a.id })) },
            books: { create: { bookId: book.id, role: "MAIN", order: 0 } },
            affiliateLinks: {
              create: {
                bookId: book.id,
                label: `Xem giá ${book.title}`,
                destinationUrl: book.shopeeAffiliateUrl!,
                trackingSlug,
                isActive: true,
              },
            },
          },
        });

        results.push(slug);
      } catch (err) {
        console.error("Cron AI planner: lỗi viết bài", item.focusKeyword, err);
      }
    }

    // 6. Revalidate caches
    revalidatePath("/admin/articles");
    revalidatePath("/admin/ai-planner");

    // 7. Notify IndexNow for articles scheduled for today
    const todayArticles = results.filter((_, i) => {
      const d = schedule[i];
      return d && d <= new Date();
    });
    if (todayArticles.length > 0) {
      try {
        notifySearchEngines(todayArticles.map((s) => `/bai-viet/${s}`));
      } catch {
        // ignore notify errors
      }
    }

    return NextResponse.json({
      scheduled: results.length,
      slugs: results,
      nextRun: new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (err) {
    console.error("Cron AI planner error:", err);
    return NextResponse.json({ error: "Internal error." }, { status: 500 });
  }
}

function nextMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = day === 1 ? 7 : (8 - day) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntil);
  // 08:00 VN = 01:00 UTC
  monday.setUTCHours(1, 0, 0, 0);
  return monday;
}

async function uniqueArticleSlug(base: string): Promise<string> {
  const cleaned = base
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
    .replace(/[èéẹẻẽêềếệểễ]/g, "e")
    .replace(/[ìíịỉĩ]/g, "i")
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
    .replace(/[ùúụủũưừứựửữ]/g, "u")
    .replace(/[ỳýỵỷỹ]/g, "y")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);

  let candidate = cleaned;
  let attempts = 0;
  while (true) {
    const existing = await prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    attempts++;
    candidate = `${cleaned}-${attempts}`;
  }
}
