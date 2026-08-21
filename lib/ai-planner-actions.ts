"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import OpenAI from "openai";
import { ArticleStatus, ArticleType, ArticleBookRole, BookStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { DeepSeekConfigError } from "@/lib/deepseek";
import { notifySearchEngines } from "@/lib/indexing";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlanItem = {
  bookId: string;
  bookTitle: string;
  bookSlug: string;
  affiliateUrl: string;
  focusKeyword: string;
  angle: string;
  scheduledAt: string; // ISO string
};

type PlannerConfig = {
  articlesPerBook: number;       // default 2
  startDate: Date;
  intervalDays: number;          // default 2 (Mon/Wed/Fri rhythm)
  publishHour: number;           // default 8 (8:00 AM VN time = UTC+7)
};

// ─── Step 1: AI generates a plan ─────────────────────────────────────────────

export async function generateArticlePlanAction(formData: FormData) {
  await requireAdmin();

  const articlesPerBook = Number(formData.get("articlesPerBook") || "2");
  const startDateStr = formData.get("startDate") as string | null;
  const intervalDays = Number(formData.get("intervalDays") || "2");

  const startDate = startDateStr ? new Date(startDateStr) : nextMonday();

  const config: PlannerConfig = {
    articlesPerBook: Math.min(articlesPerBook, 5),
    startDate,
    intervalDays,
    publishHour: 8,
  };

  const plan = await buildAiArticlePlan(config);

  // Lưu plan tạm vào DB Setting để Admin xem và execute
  await prisma.setting.upsert({
    where: { key: "ai_planner_pending_plan" },
    update: { value: JSON.stringify(plan) },
    create: { key: "ai_planner_pending_plan", value: JSON.stringify(plan) },
  });

  revalidatePath("/admin/ai-planner");
  redirect(
    `/admin/ai-planner?success=${encodeURIComponent(`AI đã tạo kế hoạch ${plan.length} bài viết. Bấm Chạy để bắt đầu viết.`)}`,
  );
}

// ─── Step 2: Execute plan — AI writes + schedules all articles ───────────────

export async function executePlanAction(formData: FormData) {
  await requireAdmin();

  const settingRow = await prisma.setting.findUnique({
    where: { key: "ai_planner_pending_plan" },
  });
  if (!settingRow) redirect(`/admin/ai-planner?error=${encodeURIComponent("Chưa có kế hoạch để thực thi.")}`);

  const plan: PlanItem[] = JSON.parse(settingRow.value);
  const results: { title: string; status: string }[] = [];

  for (const item of plan) {
    try {
      const slug = await writeAndScheduleArticle(item);
      results.push({ title: item.focusKeyword, status: `✅ ${slug}` });
    } catch (err) {
      console.error("Lỗi viết bài:", err);
      results.push({ title: item.focusKeyword, status: "❌ Lỗi" });
    }
  }

  // Xóa plan sau khi chạy xong
  await prisma.setting.delete({ where: { key: "ai_planner_pending_plan" } });

  revalidatePath("/admin/articles");
  revalidatePath("/admin/ai-planner");
  const successCount = results.filter((r) => r.status.startsWith("✅")).length;
  redirect(
    `/admin/ai-planner?success=${encodeURIComponent(`Đã viết ${successCount}/${plan.length} bài và lên lịch thành công.`)}`,
  );
}

// ─── Run full pipeline (plan + execute) ──────────────────────────────────────

export async function runFullPipelineAction(formData: FormData) {
  await requireAdmin();

  const articlesPerBook = Number(formData.get("articlesPerBook") || "2");
  const startDateStr = formData.get("startDate") as string | null;
  const intervalDays = Number(formData.get("intervalDays") || "2");
  const startDate = startDateStr ? new Date(startDateStr) : nextMonday();

  const config: PlannerConfig = {
    articlesPerBook: Math.min(articlesPerBook, 5),
    startDate,
    intervalDays,
    publishHour: 8,
  };

  const plan = await buildAiArticlePlan(config);
  let successCount = 0;

  for (const item of plan) {
    try {
      await writeAndScheduleArticle(item);
      successCount++;
    } catch (err) {
      console.error("Lỗi viết bài:", item.focusKeyword, err);
    }
  }

  revalidatePath("/");
  revalidatePath("/admin/articles");
  revalidatePath("/bai-viet");
  redirect(
    `/admin/ai-planner?success=${encodeURIComponent(`Pipeline hoàn tất. Đã lên lịch ${successCount}/${plan.length} bài.`)}`,
  );
}

// ─── Get pending plan ────────────────────────────────────────────────────────

export async function getPendingPlan(): Promise<PlanItem[] | null> {
  await requireAdmin();
  const row = await prisma.setting.findUnique({
    where: { key: "ai_planner_pending_plan" },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.value) as PlanItem[];
  } catch {
    return null;
  }
}

// ─── Internal: build AI plan ─────────────────────────────────────────────────

async function buildAiArticlePlan(config: PlannerConfig): Promise<PlanItem[]> {
  const books = await prisma.book.findMany({
    where: {
      status: BookStatus.ACTIVE,
      shopeeAffiliateUrl: { not: null },
    },
    select: {
      id: true,
      title: true,
      slug: true,
      author: true,
      shopeeAffiliateUrl: true,
      description: true,
      keyLessons: true,
      suitableFor: true,
      painPoints: { select: { name: true } },
      _count: { select: { articles: true } },
    },
  });

  if (!books.length) throw new Error("Không có sách nào có affiliate URL.");

  const existingArticles = await prisma.article.findMany({
    where: { status: ArticleStatus.PUBLISHED },
    select: { title: true, focusKeyword: true },
  });

  const existingTitles = existingArticles.map((a) => a.title).join(", ");

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) throw new DeepSeekConfigError("Thiếu DEEPSEEK_API_KEY.");

  const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 90_000 });

  const bookListStr = books
    .map(
      (b) =>
        `- ID: ${b.id} | Tên: ${b.title} | Tác giả: ${b.author} | Số bài đã có: ${b._count.articles} | Nỗi đau: ${b.painPoints.map((p) => p.name).join(", ")} | Bài học: ${b.keyLessons.slice(0, 3).join("; ")}`,
    )
    .join("\n");

  const systemPrompt = `Bạn là content strategist chuyên SEO sách tiếng Việt.
Nhiệm vụ: Từ danh sách sách, tạo kế hoạch bài viết mới chưa có trên website.

Với mỗi sách, tạo ${config.articlesPerBook} ý tưởng bài viết khác nhau:
- Một góc nhìn review cụ thể (review theo đối tượng, theo vấn đề cụ thể)
- Một bài so sánh hoặc "nên đọc hay không"
- Từ khóa dài (long-tail) có lượt tìm kiếm thực

Trả về JSON array, không có text khác:
[
  {
    "bookId": "...",
    "focusKeyword": "atomic habits dành cho người hay trì hoãn",
    "angle": "Review chi tiết Atomic Habits từ góc nhìn người trì hoãn mãn tính — thực sự có hiệu quả không?"
  }
]`;

  const userPrompt = `Danh sách sách:
${bookListStr}

Bài viết đã có (KHÔNG lặp lại):
${existingTitles || "Chưa có bài nào."}

Tạo kế hoạch ${config.articlesPerBook} bài/sách cho ${books.length} cuốn.`;

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim() || "[]";
  let planItems: Array<{ bookId: string; focusKeyword: string; angle: string }>;

  try {
    const parsed = JSON.parse(raw);
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

  // Gán scheduledAt theo lịch Mon/Wed/Fri
  const schedule = computeSchedule(config.startDate, planItems.length, config.intervalDays, config.publishHour);
  const bookMap = new Map(books.map((b) => [b.id, b]));

  return planItems
    .filter((item) => item.bookId && bookMap.has(item.bookId))
    .map((item, i) => {
      const book = bookMap.get(item.bookId)!;
      return {
        bookId: item.bookId,
        bookTitle: book.title,
        bookSlug: book.slug,
        affiliateUrl: book.shopeeAffiliateUrl!,
        focusKeyword: item.focusKeyword,
        angle: item.angle,
        scheduledAt: schedule[i]?.toISOString() ?? new Date().toISOString(),
      };
    });
}

// ─── Internal: write + schedule 1 article ────────────────────────────────────

async function writeAndScheduleArticle(item: PlanItem): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) throw new DeepSeekConfigError("Thiếu DEEPSEEK_API_KEY.");

  const book = await prisma.book.findUnique({
    where: { id: item.bookId },
    include: { painPoints: true, audiences: true },
  });
  if (!book) throw new Error(`Không tìm thấy sách ${item.bookId}`);

  const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 120_000 });

  const systemPrompt = `Bạn là biên tập viên content chuyên review sách tiếng Việt theo phong cách tỉnh táo, chân thật.

Tạo bài viết review đầy đủ theo format:
- Title: Tiêu đề SEO (60–70 ký tự)
- Slug: slug URL từ tiêu đề
- Excerpt: Mô tả ngắn 120–160 ký tự
- SeoTitle: Giống Title hoặc biến thể
- SeoDescription: Meta description 150–160 ký tự
- VerdictScore: Điểm 1–5 (số thực, ví dụ 4.2)
- VerdictSummary: Tóm tắt verdict 1–2 câu
- Content: Nội dung bài đầy đủ bằng Markdown (1500–2500 từ)

Phong cách: Không hoa mỹ, không sáo, không tự nói kinh nghiệm cá nhân. Viết theo góc nhìn biên tập.
Không thêm CTA affiliate trong markdown — website tự thêm.
Không tạo phần FAQ trong markdown — website render riêng.

Trả về JSON object, không có text khác.`;

  const userPrompt = `Sách: ${book.title} — ${book.author}
Mô tả: ${book.description}
Bài học: ${book.keyLessons.join("; ")}
Nỗi đau: ${book.painPoints.map((p) => p.name).join(", ")}
Đối tượng: ${book.audiences.map((a) => a.name).join(", ")}
Focus keyword: ${item.focusKeyword}
Góc bài: ${item.angle}

Format JSON:
{
  "title": "...",
  "slug": "...",
  "excerpt": "...",
  "seoTitle": "...",
  "seoDescription": "...",
  "verdictScore": 4.2,
  "verdictSummary": "...",
  "content": "## Markdown content here..."
}`;

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
  let output: {
    title?: string;
    slug?: string;
    excerpt?: string;
    seoTitle?: string;
    seoDescription?: string;
    verdictScore?: number;
    verdictSummary?: string;
    content?: string;
  };

  try {
    output = JSON.parse(raw);
  } catch {
    throw new Error("AI trả về JSON không hợp lệ.");
  }

  if (!output.title || !output.content) {
    throw new Error("AI không tạo được nội dung đầy đủ.");
  }

  const scheduledAt = new Date(item.scheduledAt);
  const slug = await uniqueArticleSlug(output.slug || output.title);

  const article = await prisma.article.create({
    data: {
      title: output.title,
      slug,
      excerpt: output.excerpt || "",
      content: output.content,
      type: ArticleType.REVIEW,
      status: ArticleStatus.SCHEDULED,
      seoTitle: output.seoTitle || output.title,
      seoDescription: output.seoDescription || output.excerpt || "",
      focusKeyword: item.focusKeyword,
      verdictScore: output.verdictScore ?? null,
      verdictSummary: output.verdictSummary || null,
      readingTime: Math.max(1, Math.round(output.content.split(" ").length / 200)),
      publishedAt: scheduledAt,
      scheduledAt,
      painPoints: {
        connect: book.painPoints.map((p) => ({ id: p.id })),
      },
      audiences: {
        connect: book.audiences.map((a) => ({ id: a.id })),
      },
      books: {
        create: {
          bookId: item.bookId,
          role: ArticleBookRole.MAIN,
          order: 0,
        },
      },
      affiliateLinks: {
        create: {
          bookId: item.bookId,
          label: `Xem giá ${book.title}`,
          destinationUrl: item.affiliateUrl,
          trackingSlug: await uniqueTrackingSlug(`plan-${slug}`),
          isActive: true,
        },
      },
    },
  });

  await prisma.aiGeneration.create({
    data: {
      type: "DRAFT",
      inputJson: {
        source: "ai_planner",
        bookId: item.bookId,
        focusKeyword: item.focusKeyword,
        angle: item.angle,
      },
      outputMarkdown: output.content,
      model,
      articleId: article.id,
      bookId: item.bookId,
    },
  });

  // Notify IndexNow when article actually publishes (via cron)
  const urlPath = `/bai-viet/${slug}`;
  if (scheduledAt <= new Date()) {
    await prisma.article.update({
      where: { id: article.id },
      data: { status: ArticleStatus.PUBLISHED, scheduledAt: null },
    });
    notifySearchEngines([urlPath]);
  }

  revalidatePath("/admin/articles");
  return slug;
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

function computeSchedule(start: Date, count: number, intervalDays: number, hour: number): Date[] {
  const dates: Date[] = [];
  const base = new Date(start);
  // Chuẩn hoá về 8:00 GMT+7 (= 1:00 UTC)
  base.setUTCHours(hour - 7 < 0 ? hour - 7 + 24 : hour - 7, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i * intervalDays);
    dates.push(d);
  }
  return dates;
}

function nextMonday(): Date {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon...
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(8, 0, 0, 0);
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

async function uniqueTrackingSlug(base: string): Promise<string> {
  let candidate = base.slice(0, 80);
  let attempts = 0;

  while (true) {
    const existing = await prisma.affiliateLink.findUnique({
      where: { trackingSlug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    attempts++;
    candidate = `${base.slice(0, 75)}-${attempts}`;
  }
}
