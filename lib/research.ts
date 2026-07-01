import crypto from "node:crypto";

export type ResearchInput = {
  bookTitle: string;
  author?: string | null;
  productUrl?: string | null;
  manualBookData?: string | null;
  sourceNotes?: string | null;
  rawReviews?: string | null;
};

export type ResearchCandidate = {
  url?: string | null;
  domain?: string | null;
  title?: string | null;
  sourceType: "SEARCH_RESULT" | "FETCHED_PAGE" | "PRODUCT_PAGE" | "MANUAL_NOTE" | "MANUAL_REVIEW";
  status: "USED" | "SKIPPED" | "ERROR";
  summary?: string | null;
  excerptForAi: string;
  contentHash?: string | null;
  skipReason?: string | null;
  confidence?: number | null;
};

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  score?: number;
};

type TavilyResponse = {
  results?: TavilyResult[];
};

export class ResearchConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchConfigError";
  }
}

export async function researchBookSources(input: ResearchInput) {
  const warnings: string[] = [];
  const candidates: ResearchCandidate[] = manualCandidates(input);
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    if (candidates.length) {
      warnings.push("Thiếu TAVILY_API_KEY nên chỉ dùng dữ liệu admin nhập thủ công.");
      return { candidates, warnings };
    }
    throw new ResearchConfigError(
      "Thiếu TAVILY_API_KEY. Hãy thêm Tavily API key vào .env để dùng AI research crawler.",
    );
  }

  const maxSources = positiveInt(process.env.RESEARCH_MAX_SOURCES, 12);
  const queries = buildQueries(input).slice(0, 6);
  const seenUrls = new Set<string>();
  const seenHashes = new Set<string>();

  for (const query of queries) {
    if (candidates.filter((item) => item.status === "USED").length >= maxSources) break;

    try {
      const results = await searchTavily(apiKey, query);
      for (const result of results) {
        if (candidates.filter((item) => item.status === "USED").length >= maxSources) break;

        const url = normalizeUrl(result.url);
        if (!url || seenUrls.has(url)) continue;
        seenUrls.add(url);

        const domain = domainFromUrl(url);
        const sourceType = sourceTypeFromDomain(domain);
        const tavilyText = cleanText(result.raw_content || result.content || "");
        const source = await buildCandidateFromResult({
          url,
          domain,
          title: result.title,
          sourceType,
          tavilyText,
          score: result.score,
        });

        if (source.contentHash && seenHashes.has(source.contentHash)) {
          candidates.push({
            ...source,
            status: "SKIPPED",
            skipReason: "Nội dung trùng với nguồn đã có.",
            excerptForAi: "",
          });
          continue;
        }
        if (source.contentHash) seenHashes.add(source.contentHash);

        candidates.push(source);
      }
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `Không search được query "${query}": ${error.message}`
          : `Không search được query "${query}".`,
      );
    }
  }

  const usedCount = candidates.filter((item) => item.status === "USED").length;
  if (!usedCount) warnings.push("Không tìm được nguồn public đủ sạch để AI phân tích.");

  return {
    candidates: candidates.slice(0, maxSources + manualCandidates(input).length + 8),
    warnings,
  };
}

function manualCandidates(input: ResearchInput): ResearchCandidate[] {
  const candidates: ResearchCandidate[] = [];

  if (input.manualBookData?.trim()) {
    const text = cleanText(input.manualBookData);
    candidates.push({
      title: "Dữ liệu sách admin nhập",
      sourceType: "MANUAL_NOTE",
      status: "USED",
      summary: truncate(text, 700),
      excerptForAi: truncate(text, 3500),
      contentHash: contentHash(text),
      confidence: 0.85,
    });
  }

  if (input.sourceNotes?.trim()) {
    const text = cleanText(input.sourceNotes);
    candidates.push({
      title: "Ghi chú nguồn admin nhập",
      sourceType: "MANUAL_NOTE",
      status: "USED",
      summary: truncate(text, 700),
      excerptForAi: truncate(text, 3500),
      contentHash: contentHash(text),
      confidence: 0.75,
    });
  }

  if (input.rawReviews?.trim()) {
    const text = cleanText(input.rawReviews);
    candidates.push({
      title: "Review người mua admin paste thủ công",
      sourceType: "MANUAL_REVIEW",
      status: "USED",
      summary: `Admin đã paste thủ công khoảng ${countReviewBlocks(text)} review để rút insight nội bộ.`,
      excerptForAi: truncate(text, 5000),
      contentHash: contentHash(text),
      confidence: 0.8,
    });
  }

  if (input.productUrl?.trim()) {
    const url = normalizeUrl(input.productUrl);
    candidates.push({
      url,
      domain: url ? domainFromUrl(url) : null,
      title: "Product URL admin cung cấp",
      sourceType: "PRODUCT_PAGE",
      status: url ? "USED" : "SKIPPED",
      summary: url
        ? "Link sản phẩm do admin cung cấp. Không tự scrape review từ trang sản phẩm."
        : "Product URL không hợp lệ.",
      excerptForAi: url
        ? `Product URL do admin cung cấp: ${url}. Không tự scrape review từ trang này.`
        : "",
      contentHash: url ? contentHash(url) : null,
      skipReason: url ? null : "URL không hợp lệ.",
      confidence: url ? 0.35 : 0,
    });
  }

  return candidates;
}

function buildQueries(input: ResearchInput) {
  const title = input.bookTitle.trim();
  const author = input.author?.trim();
  const base = author ? `"${title}" "${author}"` : `"${title}"`;

  return [
    `${base} review sách`,
    `${base} sách nói về gì`,
    `${base} ai nên đọc`,
    `${base} điểm hạn chế`,
    `${base} tóm tắt nội dung sách`,
    `${base} tác giả nhà xuất bản`,
  ];
}

async function searchTavily(apiKey: string, query: string) {
  const timeoutMs = positiveInt(process.env.RESEARCH_CRAWL_TIMEOUT_MS, 8000);
  const response = await fetchWithTimeout(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_answer: false,
        include_raw_content: true,
        max_results: 5,
      }),
    },
    timeoutMs,
  );

  if (!response.ok) {
    throw new Error(`Tavily trả ${response.status}`);
  }

  const data = (await response.json()) as TavilyResponse;
  return Array.isArray(data.results) ? data.results : [];
}

async function buildCandidateFromResult({
  url,
  domain,
  title,
  sourceType,
  tavilyText,
  score,
}: {
  url: string;
  domain: string | null;
  title?: string;
  sourceType: ResearchCandidate["sourceType"];
  tavilyText: string;
  score?: number;
}): Promise<ResearchCandidate> {
  let text = tavilyText;
  let nextSourceType = sourceType;
  let skipReason: string | null = null;

  if (sourceType !== "PRODUCT_PAGE" && text.length < 500) {
    const fetched = await fetchReadablePage(url);
    if (fetched.status === "USED") {
      text = fetched.text;
      nextSourceType = "FETCHED_PAGE";
    } else {
      skipReason = fetched.reason;
    }
  }

  if (sourceType === "PRODUCT_PAGE") {
    text = tavilyText || `Trang sản phẩm public: ${url}. Không tự crawl review từ trang này.`;
  }

  const blockedReason = blockedContentReason(text);
  if (!text || text.length < 160 || blockedReason) {
    return {
      url,
      domain,
      title,
      sourceType: nextSourceType,
      status: "SKIPPED",
      summary: text ? truncate(text, 400) : null,
      excerptForAi: "",
      contentHash: text ? contentHash(text) : null,
      skipReason: blockedReason || skipReason || "Nguồn quá ngắn hoặc không đọc được.",
      confidence: 0,
    };
  }

  return {
    url,
    domain,
    title,
    sourceType: nextSourceType,
    status: "USED",
    summary: truncate(text, 700),
    excerptForAi: truncate(text, 2600),
    contentHash: contentHash(text),
    confidence: typeof score === "number" ? clamp(score, 0.2, 0.9) : 0.55,
  };
}

async function fetchReadablePage(url: string) {
  const timeoutMs = positiveInt(process.env.RESEARCH_CRAWL_TIMEOUT_MS, 8000);

  try {
    const response = await fetchWithTimeout(
      url,
      {
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "TramDocMotChutResearchBot/1.0 (+https://example.com)",
        },
        redirect: "follow",
      },
      timeoutMs,
    );

    if (response.status === 403 || response.status === 429) {
      return { status: "SKIPPED" as const, reason: `Trang trả ${response.status}.` };
    }
    if (!response.ok) {
      return { status: "SKIPPED" as const, reason: `Trang trả ${response.status}.` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
      return { status: "SKIPPED" as const, reason: "Không phải HTML/text." };
    }

    const html = await response.text();
    return { status: "USED" as const, text: htmlToText(html) };
  } catch (error) {
    return {
      status: "ERROR" as const,
      reason: error instanceof Error ? error.message : "Fetch lỗi.",
    };
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function htmlToText(html: string) {
  return cleanText(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">"),
  );
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function blockedContentReason(text: string) {
  const lower = text.toLowerCase();
  if (lower.includes("captcha")) return "Có captcha.";
  if (lower.includes("access denied")) return "Access denied.";
  if (lower.includes("cloudflare") && text.length < 1000) return "Bị chặn bởi anti-bot.";
  if (lower.includes("đăng nhập") && text.length < 600) return "Cần đăng nhập.";
  if (lower.includes("sign in") && text.length < 600) return "Cần đăng nhập.";
  return null;
}

function sourceTypeFromDomain(domain: string | null): ResearchCandidate["sourceType"] {
  if (!domain) return "SEARCH_RESULT";
  if (/(shopee|tiki|lazada|amazon|fahasa|nhanam|vinabook)/i.test(domain)) {
    return "PRODUCT_PAGE";
  }
  return "SEARCH_RESULT";
}

function normalizeUrl(value?: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function domainFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function contentHash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function truncate(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}...`;
}

function positiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function countReviewBlocks(rawReviews: string) {
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
