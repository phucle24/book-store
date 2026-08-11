import { AdminAiAutopilot } from "@/components/AdminAiAutopilot";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BookStatus, type Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminAiPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; researchRunId?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [
    painPoints,
    audiences,
    categories,
    recentResearchRuns,
    selectedResearchRun,
    quickDraftSuggestions,
  ] = await Promise.all([
    prisma.painPoint.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.audience.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.researchRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        sources: { orderBy: { createdAt: "asc" } },
        createdBook: { select: { title: true, slug: true } },
        createdArticle: { select: { id: true, title: true, slug: true, status: true } },
      },
    }),
    params.researchRunId
      ? prisma.researchRun.findUnique({
          where: { id: params.researchRunId },
          include: {
            sources: { orderBy: { createdAt: "asc" } },
            createdBook: { select: { title: true, slug: true } },
            createdArticle: { select: { id: true, title: true, slug: true, status: true } },
          },
        })
      : null,
    prisma.book.findMany({
      where: {
        status: BookStatus.ACTIVE,
        shopeeAffiliateUrl: { not: null },
      },
      orderBy: [{ updatedAt: "desc" }],
      take: 8,
      include: {
        categories: { take: 1, select: { id: true, name: true } },
        painPoints: { take: 1, select: { id: true, name: true } },
        audiences: { take: 1, select: { id: true, name: true } },
        _count: { select: { articles: true } },
      },
    }),
  ]);

  return (
    <AdminShell
      title="AI Autopilot"
      description="Nhập tên sách, dữ liệu nguồn và affiliate link để AI research, tạo sách, tạo bài và hỗ trợ biên tập."
    >
      <AdminNotice error={params.error} success={params.success} />
      <AdminAiAutopilot
        categories={categories}
        painPoints={painPoints}
        audiences={audiences}
        selectedRun={selectedResearchRun ? mapResearchRun(selectedResearchRun) : null}
        recentRuns={recentResearchRuns.map(mapResearchRun)}
        quickDraftSuggestions={quickDraftSuggestions.map(mapQuickDraftSuggestion)}
      />
    </AdminShell>
  );
}

type QuickDraftSuggestionWithRelations = Prisma.BookGetPayload<{
  include: {
    categories: { take: 1; select: { id: true; name: true } };
    painPoints: { take: 1; select: { id: true; name: true } };
    audiences: { take: 1; select: { id: true; name: true } };
    _count: { select: { articles: true } };
  };
}>;

function mapQuickDraftSuggestion(book: QuickDraftSuggestionWithRelations) {
  const painPoint = book.painPoints[0] || null;
  const audience = book.audiences[0] || null;
  const category = book.categories[0] || null;

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    publisher: book.publisher,
    affiliateUrl: book.shopeeAffiliateUrl,
    articleCount: book._count.articles,
    category,
    painPoint,
    audience,
    manualBookData: [
      `Tên sách: ${book.title}`,
      `Tác giả: ${book.author}`,
      book.publisher ? `Nhà xuất bản: ${book.publisher}` : "",
      `Mô tả hiện có: ${book.description}`,
      book.pros.length ? `Điểm mạnh: ${book.pros.join("; ")}` : "",
      book.cons.length ? `Điểm hạn chế: ${book.cons.join("; ")}` : "",
      book.keyLessons.length ? `Một vài ý chính: ${book.keyLessons.join("; ")}` : "",
      book.suitableFor.length ? `Phù hợp với: ${book.suitableFor.join("; ")}` : "",
      book.notSuitableFor.length ? `Không phù hợp với: ${book.notSuitableFor.join("; ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    focusKeyword: painPoint
      ? `review ${book.title} cho người đang ${painPoint.name.toLowerCase()}`
      : `review ${book.title}`,
  };
}

type ResearchRunWithRelations = Prisma.ResearchRunGetPayload<{
  include: {
    sources: true;
    createdBook: { select: { title: true; slug: true } };
    createdArticle: { select: { id: true; title: true; slug: true; status: true } };
  };
}>;

function mapResearchRun(run: ResearchRunWithRelations) {
  return {
    id: run.id,
    bookTitle: run.bookTitle,
    author: run.author,
    affiliateUrl: run.affiliateUrl,
    productUrl: run.productUrl,
    manualBookData: run.manualBookData,
    sourceNotes: run.sourceNotes,
    rawReviews: run.rawReviews,
    status: run.status,
    warnings: run.warnings,
    sourceSummary: run.sourceSummary,
    confidence: run.confidence,
    createdAt: run.createdAt.toISOString(),
    createdBook: run.createdBook,
    createdArticle: run.createdArticle,
    sources: run.sources.map((source) => ({
      id: source.id,
      url: source.url,
      domain: source.domain,
      title: source.title,
      sourceType: source.sourceType,
      status: source.status,
      summary: source.summary,
      confidence: source.confidence,
      skipReason: source.skipReason,
    })),
  };
}
