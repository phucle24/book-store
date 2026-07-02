import { ArticleBookRole, ArticleType, type ArticleStatus } from "@prisma/client";
import { scoreByKeywords } from "@/lib/pain-journey";

type RelationItem = { id?: string; name?: string | null; slug?: string | null };
type BookRelation = { role?: ArticleBookRole | string };
type ContentQualityArticle = {
  title?: string | null;
  excerpt?: string | null;
  type?: ArticleType | string | null;
  status?: ArticleStatus | string | null;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  focusKeyword?: string | null;
  authorName?: string | null;
  authorSlug?: string | null;
  voiceTone?: string | null;
  reviewInsightId?: string | null;
  clusterId?: string | null;
  faqs?: RelationItem[];
  books?: BookRelation[];
  painPoints?: RelationItem[];
  audiences?: RelationItem[];
  scheduledAt?: Date | string | null;
};

export type ContentQualityCheck = {
  label: string;
  ok: boolean;
  meta?: string;
  severity: "required" | "warning";
};

export function getArticleQualityChecks(article?: ContentQualityArticle) {
  const content = article?.content || "";
  const type = (article?.type || ArticleType.REVIEW) as ArticleType;
  const wordCount = countWords(content);
  const headingCount = countHeadings(content);
  const internalLinkCount = countInternalLinks(content);
  const minimumWords = type === ArticleType.TOP_LIST ? 1500 : 900;
  const relatedBooks = article?.books?.filter((item) => item.role !== ArticleBookRole.MAIN) || [];
  const hasMainBook = Boolean(article?.books?.some((item) => item.role === ArticleBookRole.MAIN));
  const mentionsShopeeReviews = /review\s+shopee/i.test(content);
  const hasLayoutCtaInMarkdown =
    /(xem\s+giá|mua\s+sách|đặt\s+mua|link\s+mua|link\s+affiliate|liên\s+kết\s+bên\s+dưới|\/go\/)/i.test(
      content,
    );
  const contentLower = content.toLocaleLowerCase("vi");
  const introText = firstWords([article?.title || "", article?.excerpt || "", content].join("\n"), 200);
  const painSignals =
    article?.painPoints?.flatMap((item) => [item.name || "", item.slug || ""]).filter(Boolean) || [];
  const hasPainHook = !painSignals.length || scoreByKeywords(introText, painSignals) > 0;
  const hasDecisionSection =
    contentLower.includes("nên mua nếu") ||
    contentLower.includes("chưa nên mua nếu") ||
    (contentLower.includes("ai nên đọc") &&
      (contentLower.includes("ai không nên đọc") || contentLower.includes("ai không phù hợp")));

  const checks: ContentQualityCheck[] = [
    {
      label: "Có SEO title",
      ok: Boolean(article?.seoTitle?.trim()),
      severity: "required",
    },
    {
      label: "Có SEO description",
      ok: Boolean(article?.seoDescription?.trim()),
      severity: "required",
    },
    {
      label: "Có focus keyword",
      ok: Boolean(article?.focusKeyword?.trim()),
      severity: "warning",
    },
    {
      label: "Có bút danh biên tập",
      ok: Boolean(article?.authorName?.trim() && article?.authorSlug?.trim()),
      severity: "warning",
      meta: article?.authorName || "Chưa có",
    },
    {
      label: "Có ít nhất 1 pain point",
      ok: Boolean(article?.painPoints?.length),
      severity: "required",
    },
    {
      label: "Có ít nhất 1 audience",
      ok: Boolean(article?.audiences?.length),
      severity: "required",
    },
    {
      label:
        type === ArticleType.TOP_LIST
          ? "Top list có ít nhất 3 sách"
          : "Có sách liên quan",
      ok: type === ArticleType.TOP_LIST ? relatedBooks.length >= 3 : Boolean(article?.books?.length),
      severity: "required",
      meta:
        type === ArticleType.TOP_LIST
          ? `${relatedBooks.length} sách`
          : `${article?.books?.length || 0} sách`,
    },
    {
      label:
        type === ArticleType.TOP_LIST
          ? "Content top-list tối thiểu 1.500 từ"
          : "Content tối thiểu 900 từ",
      ok: wordCount >= minimumWords,
      severity: "required",
      meta: content ? `${wordCount} từ` : "Chưa có nội dung",
    },
    {
      label: "Gọi đúng nỗi đau trong 200 chữ đầu",
      ok: hasPainHook,
      severity: "warning",
      meta: painSignals.length ? painSignals.slice(0, 2).join(", ") : "Chưa có pain point",
    },
    {
      label: "Có cấu trúc heading đủ để scan",
      ok: headingCount >= (type === ArticleType.TOP_LIST ? 5 : 4),
      severity: "warning",
      meta: `${headingCount} heading`,
    },
    {
      label: "Có FAQ cho bài review/top-list",
      ok:
        type !== ArticleType.REVIEW && type !== ArticleType.TOP_LIST
          ? true
          : Boolean(article?.faqs?.length),
      severity: "warning",
      meta: `${article?.faqs?.length || 0} FAQ`,
    },
    {
      label: "Review/story có sách chính",
      ok:
        type === ArticleType.TOP_LIST ||
        type === ArticleType.COMPARISON ||
        type === ArticleType.GUIDE ||
        hasMainBook,
      severity: "required",
    },
    {
      label: "Có section sách nói về gì",
      ok:
        type === ArticleType.TOP_LIST ||
        contentLower.includes("sách nói về gì") ||
        contentLower.includes("cuốn sách nói về"),
      severity: "warning",
    },
    {
      label: "Có review chi tiết/góc nhìn sau khi đọc",
      ok:
        type === ArticleType.TOP_LIST ||
        contentLower.includes("review chi tiết") ||
        contentLower.includes("góc nhìn sau khi đọc") ||
        contentLower.includes("đánh giá chi tiết"),
      severity: "warning",
    },
    {
      label: "Có phần ai nên đọc",
      ok: contentLower.includes("ai nên đọc") || type === ArticleType.TOP_LIST,
      severity: "warning",
    },
    {
      label: "Có phần ai không nên đọc",
      ok: contentLower.includes("ai không nên đọc") || type === ArticleType.TOP_LIST,
      severity: "warning",
    },
    {
      label: "Có decision section trước CTA",
      ok: hasDecisionSection || type === ArticleType.TOP_LIST,
      severity: "warning",
    },
    {
      label: "Có phần điểm hạn chế",
      ok: contentLower.includes("điểm hạn chế") || contentLower.includes("điểm cần cân nhắc"),
      severity: "warning",
    },
    {
      label: "Có internal link trong markdown",
      ok: internalLinkCount > 0,
      severity: "warning",
      meta: `${internalLinkCount} link`,
    },
    {
      label: "Có ít nhất 2 internal links theo journey",
      ok: internalLinkCount >= 2,
      severity: "warning",
      meta: `${internalLinkCount} link`,
    },
    {
      label: "Có content cluster",
      ok: Boolean(article?.clusterId),
      severity: "warning",
    },
    {
      label: "Không nhắc review Shopee khi chưa có ReviewInsight",
      ok: !mentionsShopeeReviews || Boolean(article?.reviewInsightId),
      severity: "required",
    },
    {
      label: "CTA không nằm trong markdown",
      ok: !hasLayoutCtaInMarkdown,
      severity: "warning",
    },
  ];

  if (type === ArticleType.TOP_LIST) {
    checks.push({
      label: "Top-list có bảng chọn nhanh hoặc bảng markdown",
      ok: content.includes("|") || contentLower.includes("bảng chọn nhanh"),
      severity: "warning",
    });
  }

  return checks;
}

export function getArticleQualitySummary(article?: ContentQualityArticle) {
  const checks = getArticleQualityChecks(article);
  const failedRequired = checks.filter((check) => !check.ok && check.severity === "required");
  const failedWarnings = checks.filter((check) => !check.ok && check.severity === "warning");
  const passed = checks.length - failedRequired.length - failedWarnings.length;
  const score = Math.round((passed / checks.length) * 100);

  return {
    checks,
    score,
    failedRequired,
    failedWarnings,
    wordCount: countWords(article?.content || ""),
  };
}

export function countWords(content: string) {
  return content
    .replace(/[#>*_`~\-[\]()|]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function countHeadings(content: string) {
  return content
    .split(/\r?\n/)
    .filter((line) => /^#{2,3}\s+\S/.test(line.trim())).length;
}

function countInternalLinks(content: string) {
  const matches = content.match(/\]\(\/(bai-viet|sach|noi-dau|chu-de|doi-tuong)\//g);
  return matches?.length || 0;
}

function firstWords(content: string, count: number) {
  return content
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~[\]()|]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, count)
    .join(" ");
}
