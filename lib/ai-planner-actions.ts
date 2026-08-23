"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import OpenAI from "openai";
import { ArticleStatus, ArticleType, ArticleBookRole, BookStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { DeepSeekConfigError } from "@/lib/deepseek";
import { notifySearchEngines } from "@/lib/indexing";
import { ALL_THEME_SLUGS } from "@/lib/quote-themes";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlanItem = {
  isNewBook: boolean;
  bookId?: string;
  bookTitle: string;
  author: string;
  bookDescription?: string;
  keyLessons?: string[];
  pros?: string[];
  cons?: string[];
  suitableFor?: string[];
  categoryNames?: string[];
  painPointNames?: string[];
  audienceNames?: string[];
  focusKeyword: string;
  angle: string;
  scheduledAt: string; // ISO string
};

type PlannerMode = "discover_new_books" | "custom_books" | "existing_books";

type PlannerConfig = {
  mode: PlannerMode;
  bookCount: number;             // Số lượng sách mới muốn lên kế hoạch (default 3)
  articlesPerBook: number;       // Số bài/sách (default 1)
  customBookTitles?: string[];   // Nếu chọn custom_books
  startDate: Date;
  intervalDays: number;          // default 2 (Mon/Wed/Fri rhythm)
  publishHour: number;           // default 8 (8:00 AM VN time = UTC+7)
};

// ─── Step 1: AI generates a plan ─────────────────────────────────────────────

export async function generateArticlePlanAction(formData: FormData) {
  await requireAdmin();

  const mode = (formData.get("mode") as PlannerMode) || "discover_new_books";
  const bookCount = Number(formData.get("bookCount") || "3");
  const articlesPerBook = Number(formData.get("articlesPerBook") || "1");
  const customBookText = (formData.get("customBookTitles") as string) || "";
  const startDateStr = formData.get("startDate") as string | null;
  const intervalDays = Number(formData.get("intervalDays") || "2");

  const customBookTitles = customBookText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const startDate = startDateStr ? new Date(startDateStr) : nextMonday();

  const config: PlannerConfig = {
    mode,
    bookCount: Math.min(Math.max(bookCount, 1), 6),
    articlesPerBook: Math.min(Math.max(articlesPerBook, 1), 3),
    customBookTitles,
    startDate,
    intervalDays,
    publishHour: 8,
  };

  const plan = await buildAiArticlePlan(config);

  if (!plan.length) {
    redirect(
      `/admin/ai-planner?error=${encodeURIComponent("Không thể tạo kế hoạch lúc này. Hãy thử lại.")}`,
    );
  }

  // Lưu plan tạm vào DB Setting để Admin xem và execute
  await prisma.setting.upsert({
    where: { key: "ai_planner_pending_plan" },
    update: { value: JSON.stringify(plan) },
    create: { key: "ai_planner_pending_plan", value: JSON.stringify(plan) },
  });

  revalidatePath("/admin/ai-planner");
  const newBookCount = plan.filter((p) => p.isNewBook).length;
  const msg = newBookCount > 0
    ? `AI đã lên kế hoạch ${plan.length} bài viết cho ${newBookCount} cuốn sách mới!`
    : `AI đã lên kế hoạch ${plan.length} bài viết!`;
  redirect(`/admin/ai-planner?success=${encodeURIComponent(msg)}`);
}

// ─── Step 2: Execute plan — AI creates books + writes articles ───────────────

export async function executePlanAction(formData: FormData) {
  await requireAdmin();

  const settingRow = await prisma.setting.findUnique({
    where: { key: "ai_planner_pending_plan" },
  });
  if (!settingRow) {
    redirect(`/admin/ai-planner?error=${encodeURIComponent("Chưa có kế hoạch để thực thi.")}`);
  }

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
  revalidatePath("/admin/books");
  revalidatePath("/admin/quotes");
  revalidatePath("/admin/ai-planner");
  revalidatePath("/trich-dan");
  revalidatePath("/sach");
  revalidatePath("/bai-viet");

  const successCount = results.filter((r) => r.status.startsWith("✅")).length;
  redirect(
    `/admin/ai-planner?success=${encodeURIComponent(`Đã tạo sách, viết ${successCount}/${plan.length} bài và lên lịch thành công.`)}`,
  );
}

// ─── Run full pipeline (plan + execute) ──────────────────────────────────────

export async function runFullPipelineAction(formData: FormData) {
  await requireAdmin();

  const mode = (formData.get("mode") as PlannerMode) || "discover_new_books";
  const bookCount = Number(formData.get("bookCount") || "3");
  const articlesPerBook = Number(formData.get("articlesPerBook") || "1");
  const customBookText = (formData.get("customBookTitles") as string) || "";
  const startDateStr = formData.get("startDate") as string | null;
  const intervalDays = Number(formData.get("intervalDays") || "2");
  const startDate = startDateStr ? new Date(startDateStr) : nextMonday();

  const customBookTitles = customBookText
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const config: PlannerConfig = {
    mode,
    bookCount: Math.min(Math.max(bookCount, 1), 6),
    articlesPerBook: Math.min(Math.max(articlesPerBook, 1), 3),
    customBookTitles,
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
  revalidatePath("/admin/books");
  revalidatePath("/admin/quotes");
  revalidatePath("/trich-dan");
  revalidatePath("/sach");
  revalidatePath("/bai-viet");
  redirect(
    `/admin/ai-planner?success=${encodeURIComponent(`Pipeline hoàn tất. Đã tạo sách mới và lên lịch ${successCount}/${plan.length} bài.`)}`,
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
  const [existingBooks, existingArticles, categories, painPoints, audiences] = await Promise.all([
    prisma.book.findMany({
      select: {
        id: true,
        title: true,
        author: true,
        slug: true,
        shopeeAffiliateUrl: true,
        _count: { select: { articles: true } },
      },
    }),
    prisma.article.findMany({
      select: { title: true, focusKeyword: true, books: { select: { bookId: true } } },
    }),
    prisma.category.findMany({ select: { name: true } }),
    prisma.painPoint.findMany({ select: { name: true } }),
    prisma.audience.findMany({ select: { name: true } }),
  ]);

  const existingBookTitles = existingBooks.map((b) => b.title);
  const existingArticleTitles = existingArticles.map((a) => a.title).slice(0, 30).join("; ");
  const categoryList = categories.map((c) => c.name).join(", ");
  const painPointList = painPoints.map((p) => p.name).join(", ");
  const audienceList = audiences.map((a) => a.name).join(", ");

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) throw new DeepSeekConfigError("Thiếu DEEPSEEK_API_KEY.");

  const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 90_000 });

  let systemPrompt = "";
  let userPrompt = "";

  if (config.mode === "discover_new_books" || (config.mode === "custom_books" && config.customBookTitles?.length)) {
    // 🌟 Mode 1 & 2: Tạo SÁCH MỚI + BÀI VIẾT MỚI
    const customPromptPart = config.mode === "custom_books" && config.customBookTitles?.length
      ? `Danh sách sách người dùng chỉ định (hãy tạo thông tin cho các cuốn này):\n${config.customBookTitles.join("\n")}`
      : `Hãy đề xuất ${config.bookCount} đầu sách BESTSELLER, kinh điển, cực kỳ được yêu thích tại Việt Nam (Tâm lý, Chữa lành, Kỹ năng, Tài chính, Tư duy, v.v.) mà TUYỆT ĐỐI CHƯA CÓ trong danh sách đã có.`;

    systemPrompt = `Bạn là Giám đốc Nội dung và Chiến lược gia SEO sách chuyên nghiệp tại Việt Nam.
Nhiệm vụ: Đề xuất các cuốn sách mới và lên kế hoạch bài viết review chất lượng cao cho website.

Quy tắc quan trọng:
1. TUYỆT ĐỐI KHÔNG chọn các cuốn sách đã có trong danh sách đã tồn tại trên website.
2. Với mỗi cuốn sách mới, hãy cung cấp đầy đủ thông tin chi tiết:
   - bookTitle: Tên sách chính xác tại Việt Nam
   - author: Tác giả
   - bookDescription: Tóm tắt 2-3 câu giá trị cốt lõi
   - keyLessons: 3-4 bài học sâu sắc nhất rút ra từ sách
   - pros: 2-3 điểm mạnh vượt trội
   - cons: 1-2 điểm hạn chế hoặc lưu ý khi đọc
   - suitableFor: 2-3 đối tượng nên đọc nhất
   - categoryNames: 1-2 thể loại phù hợp nhất trong danh sách [${categoryList}]
   - painPointNames: 1-2 nỗi đau phù hợp nhất trong danh sách [${painPointList}]
   - audienceNames: 1-2 đối tượng độc giả trong danh sách [${audienceList}]
   - focusKeyword: Từ khóa SEO mục tiêu tìm kiếm cao (tiếng Việt không dấu hoặc có dấu thường gặp)
   - angle: Góc nhìn review độc đáo, đánh trúng tâm lý độc giả

Trả về JSON array các bài viết:
[
  {
    "bookTitle": "Tâm Lý Học Về Tiền",
    "author": "Morgan Housel",
    "bookDescription": "Cuốn sách giúp nhìn nhận lại mối quan hệ giữa con người và tiền bạc, chứng minh rằng thành công tài chính phụ thuộc vào hành vi hơn là trí thông minh.",
    "keyLessons": ["Tự do tài chính quan trọng hơn giàu có phô trương", "Kiểm soát lòng tham và biết thế nào là đủ", "Thời gian là đòn bẩy lớn nhất trong đầu tư"],
    "pros": ["Lối viết lôi cuốn, dễ hiểu", "Nhiều câu chuyện thực tế sâu sắc"],
    "cons": ["Không phải sách hướng dẫn kỹ thuật đầu tư chi tiết"],
    "suitableFor": ["Người trẻ mới đi làm", "Người muốn xây dựng tư duy tài chính lành mạnh"],
    "categoryNames": ["Phát triển bản thân"],
    "painPointNames": ["Áp lực đồng trang lứa", "Mất phương hướng"],
    "audienceNames": ["Người mới đi làm", "Dân văn phòng"],
    "focusKeyword": "review tam ly hoc ve tien",
    "angle": "Review Tâm Lý Học Về Tiền: Cuốn sách giúp bạn thoát khỏi áp lực kiếm tiền mù quáng"
  }
]`;

    userPrompt = `Sách ĐÃ CÓ trên website (TUYỆT ĐỐI TRÁNH KHÔNG ĐƯỢC CHỌN LẠI):
${existingBookTitles.length ? existingBookTitles.join(", ") : "Chưa có sách nào."}

Bài viết ĐÃ CÓ (tránh trùng lặp từ khóa/tiêu đề):
${existingArticleTitles || "Chưa có bài nào."}

${customPromptPart}

Hãy tạo danh sách ${config.bookCount} cuốn sách mới và bài viết tương ứng dưới dạng JSON array.`;

  } else {
    // 📚 Mode 3: Viết cho sách hiện có (chưa có đủ bài viết)
    const booksWithFewArticles = existingBooks
      .sort((a, b) => a._count.articles - b._count.articles)
      .slice(0, 6);

    if (!booksWithFewArticles.length) {
      throw new Error("Chưa có sách nào trong kho.");
    }

    const bookListStr = booksWithFewArticles
      .map((b) => `- ID: ${b.id} | Tên: ${b.title} | Tác giả: ${b.author} | Số bài đã có: ${b._count.articles}`)
      .join("\n");

    systemPrompt = `Bạn là content strategist chuyên SEO sách. Hãy tạo kế hoạch bài viết review mới cho các cuốn sách sau, với góc nhìn mới lạ chưa có trên website.
Trả về JSON array:
[
  {
    "bookId": "...",
    "bookTitle": "...",
    "author": "...",
    "focusKeyword": "...",
    "angle": "..."
  }
]`;

    userPrompt = `Danh sách sách cần viết thêm bài:
${bookListStr}

Bài viết đã có: ${existingArticleTitles || "Chưa có."}

Tạo kế hoạch ${config.articlesPerBook} bài/sách.`;
  }

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
  let rawItems: Array<Partial<PlanItem>>;

  try {
    const parsed = JSON.parse(raw);
    rawItems = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.plan)
        ? parsed.plan
        : Array.isArray(parsed.books)
          ? parsed.books
          : Array.isArray(parsed.items)
            ? parsed.items
            : [];
  } catch {
    rawItems = [];
  }

  const schedule = computeSchedule(
    config.startDate,
    rawItems.length,
    config.intervalDays,
    config.publishHour,
  );

  const existingBookMap = new Map(existingBooks.map((b) => [b.title.toLowerCase().trim(), b]));

  return rawItems
    .filter((item) => item.bookTitle && item.focusKeyword)
    .map((item, i) => {
      const titleClean = (item.bookTitle || "").trim();
      const existingMatch = existingBookMap.get(titleClean.toLowerCase());

      return {
        isNewBook: !existingMatch,
        bookId: existingMatch?.id || item.bookId,
        bookTitle: titleClean,
        author: item.author || existingMatch?.author || "Không rõ",
        bookDescription: item.bookDescription,
        keyLessons: item.keyLessons || [],
        pros: item.pros || [],
        cons: item.cons || [],
        suitableFor: item.suitableFor || [],
        categoryNames: item.categoryNames || [],
        painPointNames: item.painPointNames || [],
        audienceNames: item.audienceNames || [],
        focusKeyword: item.focusKeyword || titleClean,
        angle: item.angle || `Đánh giá chi tiết sách ${titleClean}`,
        scheduledAt: schedule[i]?.toISOString() ?? new Date().toISOString(),
      };
    });
}

// ─── Internal: write + schedule 1 article & auto-create book if needed ──────

async function writeAndScheduleArticle(item: PlanItem): Promise<string> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) throw new DeepSeekConfigError("Thiếu DEEPSEEK_API_KEY.");

  // 1. Tìm hoặc TỰ ĐỘNG TẠO SÁCH MỚI
  let book = item.bookId
    ? await prisma.book.findUnique({
        where: { id: item.bookId },
        include: { painPoints: true, audiences: true, categories: true },
      })
    : null;

  if (!book) {
    const existingByTitle = await prisma.book.findFirst({
      where: { title: { equals: item.bookTitle, mode: "insensitive" } },
      include: { painPoints: true, audiences: true, categories: true },
    });

    if (existingByTitle) {
      book = existingByTitle;
    } else {
      // 🌟 TẠO SÁCH MỚI HOÀN TOÀN VÀO CƠ SỞ DỮ LIỆU
      const bookSlug = await uniqueBookSlug(item.bookTitle);
      const [matchedCategories, matchedPainPoints, matchedAudiences] = await Promise.all([
        matchTaxonomyRecords("category", item.categoryNames || []),
        matchTaxonomyRecords("painPoint", item.painPointNames || []),
        matchTaxonomyRecords("audience", item.audienceNames || []),
      ]);

      book = await prisma.book.create({
        data: {
          title: item.bookTitle,
          slug: bookSlug,
          author: item.author || "Không rõ",
          description: item.bookDescription || `Sách ${item.bookTitle} của tác giả ${item.author}.`,
          pros: (item.pros || []).slice(0, 6),
          cons: (item.cons || []).slice(0, 6),
          keyLessons: (item.keyLessons || []).slice(0, 6),
          suitableFor: (item.suitableFor || []).slice(0, 6),
          status: BookStatus.ACTIVE,
          shopeeAffiliateUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(item.bookTitle)}`,
          categories: matchedCategories.length ? { connect: matchedCategories.map((c) => ({ id: c.id })) } : undefined,
          painPoints: matchedPainPoints.length ? { connect: matchedPainPoints.map((p) => ({ id: p.id })) } : undefined,
          audiences: matchedAudiences.length ? { connect: matchedAudiences.map((a) => ({ id: a.id })) } : undefined,
        },
        include: { painPoints: true, audiences: true, categories: true },
      });

      // 💬 TỰ ĐỘNG TẠO 10 QUOTES CHO SÁCH MỚI NÀY
      await generateAndSaveQuotesForNewBook(book);
    }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tramdocmotchut.io.vn";
  const painPointLinks = book.painPoints.slice(0, 2)
    .map((p) => `[${p.name}](${siteUrl}/noi-dau/${p.id})`)
    .join("\n");

  const systemPrompt = `Bạn là biên tập viên sách chuyên nghiệp viết review sâu sắc, thực tế, chạm cảm xúc độc giả Việt Nam.

BẮT BUỘC tuân thủ Content Quality Checklist - bài viết phải pass đầy đủ các tiêu chí sau:

CONTENT MARKDOWN (field "content"):
- Tối thiểu 1.500 từ thực chất, không padding
- PHẢI có đúng các heading sau (dùng chính xác các cụm từ này):
  ## Sách nói về điều gì?
  ## Góc nhìn sau khi đọc — Đánh giá chi tiết
  ## Ai nên đọc cuốn sách này?
  ## Ai không nên đọc?
  ## Điểm hạn chế cần cân nhắc
  ## Nên mua nếu / Chưa nên mua nếu
- PHẢI dùng "tôi" hoặc "chúng tôi" ít nhất 3 lần (giọng người viết thực sự)
- PHẢI có ít nhất 2 internal link markdown: [văn bản mô tả](/bai-viet/... hoặc /sach/... hoặc /noi-dau/...)
- PHẢI có chi tiết cụ thể: số trang, tên chương, số liệu, năm xuất bản hoặc tên tác giả đầy đủ
- PHẢI đề cập nỗi đau của đối tượng trong 200 chữ ĐẦU TIÊN của content
- KHÔNG dùng các cụm sáo rỗng: "trong thời đại ngày nay", "không thể phủ nhận rằng", "chìa khóa thành công", "hãy cùng khám phá", "đắm chìm", "hành trình khám phá", "tóm lại"
- KHÔNG chèn link affiliate, URL Shopee hay CTA trong markdown
- KHÔNG viết phần FAQ trong markdown (FAQ tạo riêng)
- Câu văn biến thiên tự nhiên: xen lẫn câu ngắn 5-8 chữ và câu dài 20-30 chữ

FAQs (field "faqs"): BẮT BUỘC tạo 3-5 câu hỏi thường gặp thực tế

SOURCES (field "sources"): BẮT BUỘC tạo ít nhất 1 ghi chú nguồn biên tập

SEO (bắt buộc): seoTitle 50-60 ký tự, seoDescription 120-160 ký tự chứa focus keyword

VERDICT (bắt buộc): verdictScore số thực 3.0-5.0, verdictSummary 1-2 câu kết luận sắc bén

Trả về JSON object đúng format:
{
  "title": "...",
  "slug": "slug-khong-dau",
  "excerpt": "...",
  "seoTitle": "...",
  "seoDescription": "...",
  "verdictScore": 4.2,
  "verdictSummary": "...",
  "content": "## Sách nói về điều gì?\\n\\n...",
  "faqs": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ],
  "sources": [
    { "label": "Ghi chú biên tập", "url": "", "note": "Nội dung review dựa trên phân tích sách và trải nghiệm đọc thực tế của biên tập viên Trạm Đọc Một Chút." }
  ]
}`;

  const userPrompt = `Viết bài review PASS ĐẦY ĐỦ content quality checklist cho cuốn sách:

Tên sách: ${book.title}
Tác giả: ${book.author}
Mô tả: ${book.description}
Bài học cốt lõi: ${book.keyLessons.join("; ")}
Điểm mạnh: ${book.pros.join("; ")}
Điểm hạn chế (đề cập trung thực): ${book.cons.join("; ")}
Phù hợp với: ${book.suitableFor.join("; ")}
Nỗi đau đối tượng (PHẢI đề cập trong 200 chữ đầu): ${book.painPoints.map((p) => p.name).join(", ")}
Đối tượng: ${book.audiences.map((a) => a.name).join(", ")}
Focus keyword (xuất hiện tự nhiên đầu bài): ${item.focusKeyword}
Góc tiếp cận: ${item.angle}

Internal links PHẢI nhúng vào content (ít nhất 2 link):
${painPointLinks || `[Xem sách ${book.title}](/sach/${book.slug || ""})`}
[Xem trang sách ${book.title}](/sach/${book.slug || ""})`;
  // 2. Viết bài viết chi tiết bằng AI
  const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 120_000 });

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
    faqs?: Array<{ question: string; answer: string }>;
    sources?: Array<{ label: string; url?: string; note?: string }>;
  };

  try {
    output = JSON.parse(raw);
  } catch {
    throw new Error("AI không trả về JSON hợp lệ.");
  }

  if (!output.title || !output.content) {
    throw new Error("AI không tạo đủ nội dung bài viết.");
  }

  const scheduledAt = new Date(item.scheduledAt);
  const slug = await uniqueArticleSlug(output.slug || output.title);
  const affiliateUrl = book.shopeeAffiliateUrl || `https://shopee.vn/search?keyword=${encodeURIComponent(book.title)}`;

  // FAQs + Sources fallback
  const faqData = (output.faqs || []).filter((f) => f.question && f.answer);
  const sourceData = (output.sources || []).filter((s) => s.label);
  if (!sourceData.length) {
    sourceData.push({
      label: "Biên tập viên Trạm Đọc Một Chút",
      url: "",
      note: "Dựa trên phân tích nội dung sách và trải nghiệm đọc thực tế.",
    });
  }

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
      categories: {
        connect: book.categories.map((c) => ({ id: c.id })),
      },
      books: {
        create: {
          bookId: book.id,
          role: ArticleBookRole.MAIN,
          order: 0,
        },
      },
      affiliateLinks: {
        create: {
          bookId: book.id,
          label: `Xem giá ${book.title}`,
          destinationUrl: affiliateUrl,
          trackingSlug: await uniqueTrackingSlug(`plan-${slug}`),
          isActive: true,
        },
      },
      ...(faqData.length > 0
        ? {
            faqs: {
              create: faqData.map((f, i) => ({
                question: f.question,
                answer: f.answer,
                order: i,
              })),
            },
          }
        : {}),
      ...(sourceData.length > 0
        ? {
            sources: {
              create: sourceData.map((s, i) => ({
                title: s.label,
                url: s.url || null,
                note: s.note || null,
                order: i,
              })),
            },
          }
        : {}),
    },
  });

  await prisma.aiGeneration.create({
    data: {
      type: "DRAFT",
      inputJson: {
        source: "ai_planner",
        bookId: book.id,
        bookTitle: book.title,
        focusKeyword: item.focusKeyword,
        angle: item.angle,
        isNewBook: item.isNewBook,
      } as Prisma.InputJsonValue,
      outputMarkdown: output.content,
      model,
      articleId: article.id,
      bookId: book.id,
    },
  });

  if (scheduledAt <= new Date()) {
    await prisma.article.update({
      where: { id: article.id },
      data: { status: ArticleStatus.PUBLISHED, scheduledAt: null },
    });
    try {
      notifySearchEngines([`/bai-viet/${slug}`]);
    } catch {
      // ignore
    }
  }

  return slug;
}

// ─── Helpers: Quotes auto generator for new books ───────────────────────────

async function generateAndSaveQuotesForNewBook(book: {
  id: string;
  title: string;
  author: string;
  description: string;
  keyLessons: string[];
  pros: string[];
  suitableFor: string[];
}) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
    const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
    if (!apiKey) return;

    const client = new OpenAI({ apiKey, baseURL, maxRetries: 2, timeout: 90_000 });
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: `Chắt lọc đúng 10 câu trích dẫn TÂM ĐẮC NHẤT, ĐẮT GIÁ NHẤT từ cuốn sách để làm caption mạng xã hội.
Gán theme từ danh sách: tinh-yeu, tuoi-tre, dong-luc, song-co-y-nghia, tac-phong-lam-viec, noi-dau-va-chua-lanh.
Trả về JSON object: { "quotes": [ { "content": "...", "attribution": "Tên sách — Tác giả", "themes": ["dong-luc"] } ] }`,
        },
        {
          role: "user",
          content: `Sách: ${book.title}\nTác giả: ${book.author}\nMô tả: ${book.description}\nBài học: ${book.keyLessons.join("; ")}`,
        },
      ],
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(raw);
    const quotes: Array<{ content: string; attribution?: string; themes?: string[] }> = Array.isArray(parsed.quotes) ? parsed.quotes : [];

    if (quotes.length > 0) {
      await prisma.quote.createMany({
        data: quotes.slice(0, 10).map((q, i) => ({
          bookId: book.id,
          content: q.content.trim(),
          attribution: q.attribution || `${book.title} — ${book.author}`,
          themes: (q.themes || []).filter((t) => ALL_THEME_SLUGS.includes(t)),
          isPublished: true,
          order: i,
        })),
      });
    }
  } catch (err) {
    console.error("Lỗi tự tạo quotes cho sách mới:", err);
  }
}

// ─── Helpers: Taxonomy matcher ──────────────────────────────────────────────

async function matchTaxonomyRecords(
  type: "category" | "painPoint" | "audience",
  names: string[],
) {
  if (!names.length) return [];
  const normalized = names.map((n) => n.toLowerCase().trim());

  if (type === "category") {
    const list = await prisma.category.findMany({ select: { id: true, name: true } });
    return list.filter((item) => normalized.some((n) => item.name.toLowerCase().includes(n) || n.includes(item.name.toLowerCase())));
  }
  if (type === "painPoint") {
    const list = await prisma.painPoint.findMany({ select: { id: true, name: true } });
    return list.filter((item) => normalized.some((n) => item.name.toLowerCase().includes(n) || n.includes(item.name.toLowerCase())));
  }
  const list = await prisma.audience.findMany({ select: { id: true, name: true } });
  return list.filter((item) => normalized.some((n) => item.name.toLowerCase().includes(n) || n.includes(item.name.toLowerCase())));
}

// ─── Schedule helpers ─────────────────────────────────────────────────────────

function computeSchedule(start: Date, count: number, intervalDays: number, hour: number): Date[] {
  const dates: Date[] = [];
  const base = new Date(start);
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
  const day = now.getDay();
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);
  monday.setHours(8, 0, 0, 0);
  return monday;
}

async function uniqueBookSlug(base: string): Promise<string> {
  const cleaned = slugifyClean(base);
  let candidate = cleaned;
  let attempts = 0;

  while (true) {
    const existing = await prisma.book.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    attempts++;
    candidate = `${cleaned}-${attempts}`;
  }
}

async function uniqueArticleSlug(base: string): Promise<string> {
  const cleaned = slugifyClean(base);
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

function slugifyClean(base: string): string {
  return base
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
}
