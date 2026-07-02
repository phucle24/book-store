import { slugify } from "@/lib/slugify";
import { normalizeVietnameseText, scoreByKeywords } from "@/lib/pain-journey";

type TaxonomyItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

type DiscoverArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  focusKeyword?: string | null;
  painPoints?: TaxonomyItem[];
  audiences?: TaxonomyItem[];
};

type DiscoverBook = {
  id: string;
  title: string;
  slug: string;
  description: string;
  author?: string;
  pros?: string[];
  cons?: string[];
  keyLessons?: string[];
  suitableFor?: string[];
  notSuitableFor?: string[];
  painPoints?: TaxonomyItem[];
  audiences?: TaxonomyItem[];
};

export function discoverByPainQuery<
  TArticle extends DiscoverArticle,
  TBook extends DiscoverBook,
>({
  query,
  painPoints,
  audiences,
  articles,
  books,
}: {
  query: string;
  painPoints: TaxonomyItem[];
  audiences: TaxonomyItem[];
  articles: TArticle[];
  books: TBook[];
}) {
  const normalizedQuery = normalizeVietnameseText(query);
  if (!normalizedQuery) {
    return { painPoint: null, audience: null, articles: [], books: [], confidence: 0 };
  }

  const scoredPainPoints = painPoints
    .map((painPoint) => {
      const aliases = painAliases(painPoint);
      const taxonomyText = [
        painPoint.name,
        painPoint.slug,
        painPoint.description || "",
        aliases.join(" "),
      ].join(" ");
      const contentScore =
        scoreByKeywords(query, aliases) +
        scoreByKeywords(taxonomyText, queryTokens(query)) +
        relatedContentScore(query, painPoint.id, articles, books);

      return { item: painPoint, score: contentScore };
    })
    .sort((a, b) => b.score - a.score);

  const scoredAudiences = audiences
    .map((audience) => ({
      item: audience,
      score:
        scoreByKeywords(query, audienceAliases(audience)) +
        scoreByKeywords([audience.name, audience.slug, audience.description || ""].join(" "), queryTokens(query)),
    }))
    .sort((a, b) => b.score - a.score);

  const painPoint = scoredPainPoints[0]?.score > 0 ? scoredPainPoints[0].item : null;
  const audience = scoredAudiences[0]?.score > 0 ? scoredAudiences[0].item : null;
  const contextKeywords = [
    ...queryTokens(query),
    ...(painPoint ? painAliases(painPoint) : []),
    ...(audience ? audienceAliases(audience) : []),
  ];

  const matchedArticles = articles
    .map((article, index) => ({
      article,
      index,
      score:
        scoreByKeywords(articleText(article), contextKeywords) +
        (painPoint && article.painPoints?.some((item) => item.id === painPoint.id) ? 8 : 0) +
        (audience && article.audiences?.some((item) => item.id === audience.id) ? 4 : 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 2)
    .map((item) => item.article);

  const matchedBooks = books
    .map((book, index) => ({
      book,
      index,
      score:
        scoreByKeywords(bookText(book), contextKeywords) +
        (painPoint && book.painPoints?.some((item) => item.id === painPoint.id) ? 8 : 0) +
        (audience && book.audiences?.some((item) => item.id === audience.id) ? 4 : 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 2)
    .map((item) => item.book);

  const confidence = Math.min(1, (scoredPainPoints[0]?.score || 0) / 20);

  return {
    painPoint,
    audience,
    articles: matchedArticles,
    books: matchedBooks,
    confidence,
  };
}

function relatedContentScore(
  query: string,
  painPointId: string,
  articles: DiscoverArticle[],
  books: DiscoverBook[],
) {
  const relatedTexts = [
    ...articles
      .filter((article) => article.painPoints?.some((item) => item.id === painPointId))
      .slice(0, 5)
      .map(articleText),
    ...books
      .filter((book) => book.painPoints?.some((item) => item.id === painPointId))
      .slice(0, 5)
      .map(bookText),
  ];

  return relatedTexts.reduce((score, text) => score + scoreByKeywords(text, queryTokens(query)), 0);
}

function queryTokens(query: string) {
  const normalized = normalizeVietnameseText(query);
  const tokens = normalized
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !stopWords.has(token));

  const phrases = [
    "khong bat dau",
    "khong biet bat dau",
    "ngai giao tiep",
    "so bi danh gia",
    "mat phuong huong",
    "thieu ky luat",
    "qua met",
    "can dong luc",
    "hay tri hoan",
    "luoi bat dau",
  ].filter((phrase) => normalized.includes(phrase));

  return [...new Set([...tokens, ...phrases, slugify(query)])];
}

function articleText(article: DiscoverArticle) {
  return [
    article.title,
    article.excerpt,
    article.focusKeyword || "",
    article.content || "",
    ...(article.painPoints || []).map((item) => item.name),
    ...(article.audiences || []).map((item) => item.name),
  ].join(" ");
}

function bookText(book: DiscoverBook) {
  return [
    book.title,
    book.author || "",
    book.description,
    ...(book.pros || []),
    ...(book.cons || []),
    ...(book.keyLessons || []),
    ...(book.suitableFor || []),
    ...(book.notSuitableFor || []),
    ...(book.painPoints || []).map((item) => item.name),
    ...(book.audiences || []).map((item) => item.name),
  ].join(" ");
}

function painAliases(painPoint: TaxonomyItem) {
  const base = [painPoint.name, painPoint.slug, painPoint.description || ""];
  const aliases = aliasBySlug[painPoint.slug] || [];

  return [...base, ...aliases];
}

function audienceAliases(audience: TaxonomyItem) {
  const aliases = audienceAliasBySlug[audience.slug] || [];
  return [audience.name, audience.slug, audience.description || "", ...aliases];
}

const aliasBySlug: Record<string, string[]> = {
  "tri-hoan": [
    "hay trì hoãn",
    "không bắt đầu",
    "không biết bắt đầu",
    "lười bắt đầu",
    "né việc",
    "bắt đầu rồi bỏ",
    "thiếu kỷ luật",
    "cần động lực",
  ],
  "mat-phuong-huong": [
    "mất phương hướng",
    "không biết mình muốn gì",
    "không biết đi đâu",
    "mông lung",
    "lạc hướng",
    "quá nhiều lựa chọn",
  ],
  overthinking: [
    "nghĩ quá nhiều",
    "sợ bị đánh giá",
    "cần được công nhận",
    "lo nghĩ",
    "vòng lặp suy nghĩ",
    "khó dừng suy nghĩ",
  ],
  burnout: [
    "kiệt sức",
    "quá mệt",
    "cạn năng lượng",
    "áp lực công việc",
    "mất động lực",
    "không muốn làm gì",
  ],
  "sau-chia-tay": [
    "sau chia tay",
    "thất tình",
    "nhớ người cũ",
    "tự trách trong tình yêu",
    "cần chữa lành",
  ],
  "thieu-ky-luat": [
    "thiếu kỷ luật",
    "không đều đặn",
    "không duy trì được",
    "mất động lực",
    "muốn xây thói quen",
  ],
  "giao-tiep-kem": [
    "giao tiếp kém",
    "ngại giao tiếp",
    "khó nói chuyện",
    "lúng túng công sở",
    "thiếu tự tin khi nói",
    "muốn cải thiện quan hệ",
  ],
  "tai-chinh-ca-nhan": [
    "tài chính cá nhân",
    "lo về tiền",
    "chi tiêu cảm xúc",
    "không kiểm soát tiền",
    "muốn quản lý tiền",
  ],
};

const audienceAliasBySlug: Record<string, string[]> = {
  "sinh-vien": ["sinh viên", "đại học", "mới ra trường"],
  "nguoi-moi-di-lam": ["người mới đi làm", "mới đi làm", "công sở", "đi làm năm đầu"],
  "dan-van-phong": ["dân văn phòng", "công sở", "áp lực công việc"],
  "nguoi-huong-noi": ["người hướng nội", "hướng nội", "ngại giao tiếp"],
  "cha-me": ["cha mẹ", "phụ huynh", "nuôi con"],
  "giao-vien": ["giáo viên", "dạy học", "lớp học"],
  "nguoi-kinh-doanh": ["người kinh doanh", "bán hàng", "khởi nghiệp"],
};

const stopWords = new Set([
  "toi",
  "minh",
  "ban",
  "dang",
  "hay",
  "rat",
  "qua",
  "nhung",
  "khong",
  "can",
  "muon",
  "biet",
  "phai",
  "lam",
  "mot",
  "cua",
  "cho",
  "voi",
  "thi",
  "la",
]);
