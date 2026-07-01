import OpenAI from "openai";

export type ContentType = "Review sách" | "Top list" | "Story essay" | "Comparison";

export type AiContentInput = {
  contentType: ContentType;
  book?: {
    id?: string;
    title: string;
    author: string;
    publisher?: string | null;
    description: string;
    pros?: string[];
    cons?: string[];
    keyLessons?: string[];
    suitableFor?: string[];
    notSuitableFor?: string[];
  } | null;
  relatedBooks?: {
    id?: string;
    title: string;
    author: string;
    publisher?: string | null;
    description: string;
    pros?: string[];
    cons?: string[];
    keyLessons?: string[];
    suitableFor?: string[];
    notSuitableFor?: string[];
  }[];
  painPoint?: {
    id?: string;
    name: string;
    description?: string | null;
  } | null;
  audience?: {
    id?: string;
    name: string;
    description?: string | null;
  } | null;
  focusKeyword: string;
  tone: string;
  extraNotes?: string;
  verifiedRead?: boolean;
  outline?: string;
  draft?: string;
};

export type ReviewInsightAnalyzeInput = {
  bookTitle: string;
  author?: string | null;
  rawReviews: string;
};

export type ReviewInsightArticleInput = {
  bookTitle: string;
  author?: string | null;
  affiliateUrl: string;
  positivePoints: unknown;
  negativePoints: unknown;
  buyerPersonas: unknown;
  painPoints: unknown;
  emotionalHooks: unknown;
  objections: unknown;
  purchaseReasons: unknown;
  articleAngles: unknown;
  summary?: string | null;
};

export type ResearchSourceForAi = {
  url?: string | null;
  domain?: string | null;
  title?: string | null;
  sourceType: string;
  summary?: string | null;
  excerptForAi: string;
};

export type SourceExtractionInput = {
  bookTitle: string;
  author?: string | null;
  productUrl?: string | null;
  manualBookData?: string | null;
  sourceNotes?: string | null;
  rawReviews?: string | null;
  sources: ResearchSourceForAi[];
};

export type AutopilotBookDataInput = SourceExtractionInput & {
  extractedFacts: unknown;
  focusKeyword?: string | null;
};

export type AutopilotArticleInput = AutopilotBookDataInput & {
  bookData: unknown;
  reviewInsight?: unknown;
  affiliateUrl: string;
  categoryName?: string | null;
  painPointName?: string | null;
  audienceName?: string | null;
  tone?: string | null;
};

const editorSystemPrompt =
  "Bạn là biên tập viên review sách theo hướng cảm xúc, insight người đọc và affiliate ethical. Không bịa trải nghiệm. Không quảng cáo quá đà.";

const sharedRules = [
  "Không bịa đã đọc sách nếu dữ liệu không có.",
  "Không dùng câu “cuốn sách này sẽ thay đổi cuộc đời bạn”.",
  "Không quảng cáo quá đà.",
  "Luôn có phần review chi tiết về sách: đánh giá sau khi đọc, điểm chạm với người đọc, điểm đáng tin, điểm cần cân nhắc.",
  "Luôn có phần “Điểm hạn chế”.",
  "Luôn có phần “Ai nên đọc” và “Ai không nên đọc”.",
  "Không tự tạo section CTA trong markdown; layout website sẽ hiển thị CTA riêng ở cuối bài.",
  "Không copy nguyên văn mô tả sản phẩm từ Shopee.",
  "Không viết section “review Shopee” nếu input không có ReviewInsight hoặc review người mua do admin paste thủ công.",
  "Nếu có insight từ review người mua, chỉ tổng hợp thành xu hướng nhận xét; không quote, không nêu tên người mua.",
  "Nội dung phải có góc nhìn riêng, phân tích theo nỗi đau người đọc.",
  "Ưu tiên kết thúc content bằng H2 “Nên đọc cuốn này như thế nào” để layout đặt block câu hỏi đọc tiếp bên dưới.",
  "Không bịa rằng tác giả nói điều không có trong dữ liệu.",
];

export async function generateBrief(input: AiContentInput) {
  return complete({
    system: editorSystemPrompt,
    user: `Tạo content brief cho bài affiliate review sách bằng tiếng Việt.

Input:
${formatInput(input)}

Output JSON hợp lệ, không markdown fence, gồm đúng các field:
- readerPain
- readerInnerVoice
- emotionalAngle
- articlePromise
- recommendedHook
- detailedReviewAngle
- readerReviewSignals
- keySections
- CTA angle
- whoShouldRead
- whoShouldNotRead`,
    responseFormat: "json_object",
  });
}

export async function generateOutline(input: AiContentInput) {
  return complete({
    system: editorSystemPrompt,
    user: `Tạo outline markdown cho bài ${input.contentType}.

Định hướng theo loại bài:
${contentTypeGuidelines(input)}

Yêu cầu:
- H2/H3 rõ.
- Có intro bằng tình huống đời thường.
- Có phần Sách nói về gì.
- Có phần Review chi tiết: cuốn sách này đáng ở điểm nào.
  Phần này cần có góc nhìn đánh giá sau khi đọc, không chỉ tóm tắt nội dung.
- Có phần Ai nên đọc.
- Có phần Ai không nên đọc.
- Có phần Điểm hạn chế.
- Có H2 cuối bài: Nên đọc cuốn này như thế nào.
- Không chèn CTA mua sách trong markdown.
- Bám focus keyword tự nhiên.

Input:
${formatInput(input)}

Quy tắc:
${sharedRules.map((rule) => `- ${rule}`).join("\n")}

Output markdown.`,
  });
}

export async function generateDraft(input: AiContentInput) {
  return complete({
    system: editorSystemPrompt,
    user: `Viết bản nháp markdown cho bài ${input.contentType}.

Định hướng theo loại bài:
${contentTypeGuidelines(input)}

Yêu cầu bắt buộc:
- 1500-2200 từ.
- Giọng văn ấm, từng trải, không quảng cáo.
- Mở đầu bằng tình huống đời thường.
- Có H2/H3 rõ.
- Có phần sách nói về gì.
- Có H2 “Review chi tiết: cuốn sách này đáng ở điểm nào?”.
- Trong phần review chi tiết, viết như một người đọc kỹ và đã suy ngẫm: đánh giá cách sách triển khai ý, điểm chạm cảm xúc, điểm hữu ích thật sự, điểm có thể khiến người đọc chưa thỏa mãn.
- Nếu có dữ liệu review người mua trong extraNotes, kết hợp thành nhận xét tổng hợp như “điều nhiều người thường thích/cân nhắc”, không copy hoặc quote review.
- Có phần Điểm hạn chế.
- Có phần Ai nên đọc và Ai không nên đọc.
- Kết thúc bằng H2 “Nên đọc cuốn này như thế nào”.
- Không chèn CTA mua sách hoặc link affiliate trong markdown; layout website sẽ hiển thị CTA riêng ở cuối bài.
- Không bịa rằng người viết đã đọc nếu verifiedRead không phải true.
- Không bịa chi tiết không có trong dữ liệu sách.
- Không copy nguyên văn mô tả sản phẩm từ Shopee.

Input:
${formatInput(input)}

Outline nếu có:
${input.outline || "Chưa có outline."}

Quy tắc:
${sharedRules.map((rule) => `- ${rule}`).join("\n")}

Output markdown.`,
  });
}

export async function improveDraft(input: AiContentInput) {
  return complete({
    system: editorSystemPrompt,
    user: `Biên tập lại bản nháp markdown bên dưới.

Mục tiêu:
- Giữ ý chính, làm giọng văn ấm và có chiều sâu hơn.
- Giảm câu quảng cáo, giảm khẳng định quá đà.
- Bổ sung hoặc làm sâu phần “Review chi tiết: cuốn sách này đáng ở điểm nào?” với góc nhìn đánh giá sau khi đọc.
- Bổ sung “Sách nói về gì”, “Điểm hạn chế”, “Ai nên đọc”, “Ai không nên đọc” nếu thiếu.
- Sắp xếp hoặc bổ sung H2 “Nên đọc cuốn này như thế nào” ở cuối content nếu thiếu.
- Loại bỏ CTA mua sách hoặc link affiliate khỏi markdown; layout website sẽ hiển thị CTA riêng ở cuối bài.
- Không bịa trải nghiệm đã đọc nếu verifiedRead không phải true.

Input:
${formatInput(input)}

Bản nháp:
${input.draft || "Chưa có bản nháp."}

Output markdown đã cải thiện.`,
  });
}

export async function seoCheck(input: AiContentInput) {
  return complete({
    system:
      "Bạn là SEO editor cho website review sách affiliate. Bạn kiểm tra SEO nhưng vẫn ưu tiên sự trung thực và trải nghiệm đọc.",
    user: `SEO check cho draft markdown.

Input:
${formatInput(input)}

Draft:
${input.draft || "Chưa có draft."}

Output JSON hợp lệ, không markdown fence, gồm:
- seoTitle
- metaDescription
- focusKeywordUsage
- suggestedSlug
- missingSections
- internalLinkIdeas
- faqSuggestions
- affiliateRiskWarnings
- improvementChecklist`,
    responseFormat: "json_object",
  });
}

export async function analyzeShopeeReviews(input: ReviewInsightAnalyzeInput) {
  return complete({
    system: "Bạn là chuyên gia phân tích review sản phẩm và content affiliate sách.",
    user: `Dữ liệu dưới đây là review công khai do admin tự tổng hợp thủ công từ người mua sách trên sàn thương mại điện tử.

Nhiệm vụ:
1. Không copy nguyên văn review.
2. Không trích dẫn tên người mua.
3. Không tạo thông tin sai.
4. Chỉ rút insight marketing.
5. Phân tích xem người mua thật sự quan tâm điều gì.
6. Tìm pain point, emotional hook, objection và purchase trigger.
7. Output JSON hợp lệ, không markdown fence.

Input:
Tên sách: ${input.bookTitle}
Tác giả: ${input.author || "Không rõ"}
Review:
${input.rawReviews}

Output JSON:
{
  "positivePoints": [],
  "negativePoints": [],
  "buyerPersonas": [],
  "painPoints": [],
  "emotionalHooks": [],
  "objections": [],
  "purchaseReasons": [],
  "articleAngles": [],
  "summary": ""
}`,
    responseFormat: "json_object",
  });
}

export async function generateArticleFromReviewInsight(input: ReviewInsightArticleInput) {
  return complete({
    system: "Bạn là cây bút review sách affiliate tiếng Việt.",
    user: `Hãy viết một bài review sách theo phong cách storytelling, cảm xúc, gần gũi, có chiều sâu.

Không copy review người mua.
Không bịa là “tôi đã đọc hết cuốn sách” nếu dữ liệu không chứng minh.
Có thể viết theo giọng: “Có những cuốn sách khiến người ta nhận ra...”
Tập trung vào nỗi đau của người đọc, vấn đề họ đang gặp và lý do cuốn sách này phù hợp.

Thông tin sách:
Tên sách: ${input.bookTitle}
Tác giả: ${input.author || "Không rõ"}
Link mua nội bộ dùng cho layout CTA, không chèn trực tiếp vào content: ${input.affiliateUrl}

Insight từ review:
Positive points: ${JSON.stringify(input.positivePoints)}
Negative points: ${JSON.stringify(input.negativePoints)}
Buyer personas: ${JSON.stringify(input.buyerPersonas)}
Pain points: ${JSON.stringify(input.painPoints)}
Emotional hooks: ${JSON.stringify(input.emotionalHooks)}
Objections: ${JSON.stringify(input.objections)}
Purchase reasons: ${JSON.stringify(input.purchaseReasons)}
Article angles: ${JSON.stringify(input.articleAngles)}
Summary: ${input.summary || ""}

Yêu cầu bài viết:
- Độ dài: 1200-1800 chữ.
- Có H2/H3 rõ ràng.
- Có SEO title.
- Có meta description.
- Không chèn CTA mua sách hoặc link affiliate trong contentMarkdown.
- Content phải có phần sách nói về gì, review chi tiết, ai nên đọc, ai không nên đọc, điểm hạn chế.
- Phần review chi tiết phải có H2 đúng: “Review chi tiết: cuốn sách này đáng ở điểm nào?”.
- Content phải kết thúc bằng H2 “Nên đọc cuốn này như thế nào”.
- Phần review chi tiết cần kết hợp insight từ review người mua thành nhận xét tổng hợp: điểm thường được thích, điều còn lăn tăn, lý do mua. Không quote review, không nêu tên người mua.
- Viết theo góc nhìn người đọc đã suy ngẫm về cuốn sách, nhưng không xưng “tôi đã đọc hết” nếu dữ liệu không chứng minh.
- Không viết như quảng cáo lộ liễu.
- Không dùng quá nhiều emoji.
- Văn phong Việt Nam, cảm xúc, đời thường.

Article structure:
1. Hook title
2. Emotional opening story
3. Who this book is for
4. What problem the book helps solve
5. Main ideas from the book
6. Detailed review after reading
7. Shopee review insight synthesis without quoting
8. What readers usually like
9. What readers may not like
10. Nên đọc cuốn này như thế nào

Output JSON hợp lệ, không markdown fence, gồm:
{
  "title": "",
  "slug": "",
  "excerpt": "",
  "seoTitle": "",
  "seoDescription": "",
  "contentMarkdown": ""
}`,
    responseFormat: "json_object",
  });
}

export async function extractBookFactsFromSources(input: SourceExtractionInput) {
  return complete({
    system:
      "Bạn là research editor cho website review sách. Nhiệm vụ của bạn là rút facts và insight từ nguồn public mà không copy văn bản nguồn.",
    user: `Phân tích nguồn cho một bài review sách affiliate tiếng Việt.

Nguyên tắc:
- Không copy nguyên văn nội dung nguồn.
- Không quote review người mua.
- Không tạo facts nếu nguồn không hỗ trợ.
- Tách rõ fact có nguồn, insight suy luận, và phần cần admin kiểm tra.
- Nếu nguồn yếu hoặc mâu thuẫn, ghi cảnh báo.

Input:
Tên sách: ${input.bookTitle}
Tác giả admin nhập: ${input.author || "Không rõ"}
Product URL: ${input.productUrl || "Không có"}
Manual book data:
${truncateForPrompt(input.manualBookData)}

Source notes:
${truncateForPrompt(input.sourceNotes)}

Raw reviews admin paste thủ công, chỉ dùng để rút insight, không quote:
${truncateForPrompt(input.rawReviews)}

Nguồn research:
${JSON.stringify(
  input.sources.map((source) => ({
    url: source.url,
    domain: source.domain,
    title: source.title,
    sourceType: source.sourceType,
    summary: source.summary,
    excerpt: truncateForPrompt(source.excerptForAi, 2200),
  })),
  null,
  2,
)}

Output JSON hợp lệ, không markdown fence:
{
  "overallSummary": "",
  "bookFacts": {
    "title": "",
    "author": "",
    "publisher": "",
    "description": "",
    "mainIdeas": [],
    "themes": [],
    "audiences": [],
    "painPoints": [],
    "strengths": [],
    "limitations": []
  },
  "sourceFacts": [
    {
      "url": "",
      "title": "",
      "summary": "",
      "facts": [],
      "confidence": 0.0,
      "warnings": []
    }
  ],
  "insights": {
    "readerPain": [],
    "emotionalHooks": [],
    "objections": [],
    "purchaseTriggers": [],
    "articleAngles": []
  },
  "adminCheck": [],
  "warnings": [],
  "confidence": 0.0
}`,
    responseFormat: "json_object",
  });
}

export async function generateAutopilotBookData(input: AutopilotBookDataInput) {
  return complete({
    system: editorSystemPrompt,
    user: `Tạo dữ liệu Book có cấu trúc cho website review sách.

Nguyên tắc:
- Chỉ dùng dữ liệu admin cung cấp và facts/insights đã extract từ nguồn.
- Không copy mô tả sản phẩm từ nguồn khác.
- Nếu không chắc tác giả/nhà xuất bản thì để "Không rõ" hoặc ghi warning.
- Dữ liệu phải hữu ích cho bài review theo nỗi đau người đọc.

Input:
Tên sách: ${input.bookTitle}
Tác giả admin nhập: ${input.author || "Không rõ"}
Focus keyword: ${input.focusKeyword || "Không có"}
Manual book data:
${truncateForPrompt(input.manualBookData)}

Extracted facts:
${JSON.stringify(input.extractedFacts, null, 2)}

Output JSON hợp lệ, không markdown fence:
{
  "title": "",
  "author": "",
  "publisher": "",
  "description": "",
  "pros": [],
  "cons": [],
  "keyLessons": [],
  "suitableFor": [],
  "notSuitableFor": [],
  "categoryNames": [],
  "painPointNames": [],
  "audienceNames": [],
  "warnings": [],
  "confidence": 0.0
}`,
    responseFormat: "json_object",
  });
}

export async function generateAutopilotArticle(input: AutopilotArticleInput) {
  return complete({
    system: editorSystemPrompt,
    user: `Viết bài review sách affiliate tiếng Việt từ source pack đã research.

Phong cách:
- Storytelling, cảm xúc, gần gũi, có chiều sâu.
- Viết như một người đọc kỹ và đã suy ngẫm, nhưng không xưng "tôi đã đọc hết" nếu dữ liệu không chứng minh.
- Chạm vào nỗi đau người đọc, không viết như quảng cáo.
- Không copy hoặc quote nguồn/review.
- Không chèn CTA mua sách hoặc link affiliate trong contentMarkdown; layout website sẽ đặt CTA cuối bài.

Yêu cầu:
- 1400-2200 từ.
- Có H2/H3 rõ.
- Có phần "Sách nói về gì".
- Có H2 đúng: "Review chi tiết: cuốn sách này đáng ở điểm nào?".
- Có phần "Ai nên đọc" và "Ai không nên đọc".
- Có phần "Điểm hạn chế".
- Kết thúc bằng H2 "Nên đọc cuốn này như thế nào".
- Có FAQ riêng theo bài.
- Không viết section "review Shopee" nếu chỉ có review paste thủ công; chỉ tổng hợp thành xu hướng người mua thường thích/cân nhắc.

Input:
Tên sách: ${input.bookTitle}
Tác giả: ${input.author || "Không rõ"}
Affiliate URL nội bộ dùng cho layout, không chèn vào markdown: ${input.affiliateUrl}
Focus keyword: ${input.focusKeyword || input.bookTitle}
Category: ${input.categoryName || "Không chọn"}
Pain point: ${input.painPointName || "Không chọn"}
Audience: ${input.audienceName || "Không chọn"}
Tone: ${input.tone || "ấm, từng trải, không quảng cáo"}

Book data:
${JSON.stringify(input.bookData, null, 2)}

Extracted facts:
${JSON.stringify(input.extractedFacts, null, 2)}

Review insight nếu có:
${JSON.stringify(input.reviewInsight || null, null, 2)}

Source notes:
${truncateForPrompt(input.sourceNotes)}

Quy tắc chung:
${sharedRules.map((rule) => `- ${rule}`).join("\n")}

Output JSON hợp lệ, không markdown fence:
{
  "title": "",
  "slug": "",
  "excerpt": "",
  "seoTitle": "",
  "seoDescription": "",
  "focusKeyword": "",
  "contentMarkdown": "",
  "faqs": [
    { "question": "", "answer": "" }
  ],
  "warnings": [],
  "confidence": 0.0
}`,
    responseFormat: "json_object",
  });
}

async function complete({
  system,
  user,
  responseFormat,
}: {
  system: string;
  user: string;
  responseFormat?: "json_object";
}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseURL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    throw new DeepSeekConfigError(
      "Thiếu DEEPSEEK_API_KEY. Hãy thêm API key vào .env để dùng AI generator.",
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL,
  });

  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    response_format: responseFormat ? { type: responseFormat } : undefined,
  });

  return completion.choices[0]?.message?.content?.trim() || "";
}

function formatInput(input: AiContentInput) {
  return JSON.stringify(
    {
      contentType: input.contentType,
      book: input.book,
      relatedBooks: input.relatedBooks,
      painPoint: input.painPoint,
      audience: input.audience,
      focusKeyword: input.focusKeyword,
      tone: input.tone,
      extraNotes: input.extraNotes,
      verifiedRead: Boolean(input.verifiedRead),
    },
    null,
    2,
  );
}

function contentTypeGuidelines(input: AiContentInput) {
  if (input.contentType === "Top list") {
    return `- Đây là bài top-list nhiều sách, không viết như review riêng một cuốn.
- Dùng relatedBooks trong input làm nguồn dữ liệu chính cho danh sách.
- Mỗi sách cần có: hợp với ai, nên đọc khi nào, điểm đáng đọc, điểm cần cân nhắc.
- Có bảng chọn nhanh ở đầu bài bằng markdown table.
- Có H2 “Nếu bạn chỉ chọn một cuốn...” gần cuối bài.
- Không tạo CTA hoặc link affiliate trong markdown.`;
  }

  if (input.contentType === "Story essay") {
    return `- Đây là bài story essay: ưu tiên câu chuyện đời thường và cảm xúc trước, review sách đến sau.
- Không biến bài thành danh sách gạch đầu dòng khô.
- Vẫn cần có phần điểm hạn chế và cách đọc tỉnh táo.`;
  }

  if (input.contentType === "Comparison") {
    return `- Đây là bài comparison: so sánh các lựa chọn theo nhu cầu đọc, không tuyên bố một cuốn thắng tuyệt đối.
- Có bảng so sánh ngắn và kết luận nên chọn theo từng tình huống.`;
  }

  return `- Đây là bài review một cuốn chính.
- Tập trung vào trải nghiệm đọc, điểm chạm với nỗi đau người đọc và lý do nên/không nên đọc.`;
}

function truncateForPrompt(value?: string | null, maxLength = 6000) {
  if (!value) return "Không có.";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}... [đã rút gọn]`;
}

export class DeepSeekConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeepSeekConfigError";
  }
}
