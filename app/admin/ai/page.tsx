import { AdminAiAutopilot } from "@/components/AdminAiAutopilot";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminAiPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; researchRunId?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const [painPoints, audiences, categories, recentResearchRuns, selectedResearchRun] = await Promise.all([
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
      />
    </AdminShell>
  );
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
