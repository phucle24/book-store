"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ArticleStatus,
  ArticleType,
  KeywordIdeaStatus,
  Prisma,
} from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import {
  DeepSeekConfigError,
  generateBrief,
  generateOutline,
  type ContentType,
} from "@/lib/deepseek";
import { readingTimeFromMarkdown } from "@/lib/markdown";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

const clusterSchema = z.object({
  name: z.string().trim().min(1, "Thiếu tên cluster."),
  slug: z.string().trim().optional(),
  description: z.string().trim().optional(),
  pillarArticleId: z.string().trim().optional(),
  categoryId: z.string().trim().optional(),
  painPointId: z.string().trim().optional(),
  audienceId: z.string().trim().optional(),
});

const ideaSchema = z.object({
  keyword: z.string().trim().min(1, "Thiếu keyword."),
  intent: z.string().trim().min(1, "Thiếu search intent."),
  priority: z.coerce.number().int().min(1).max(5).default(2),
  status: z.enum(["IDEA", "BRIEFED", "WRITING", "SCHEDULED", "PUBLISHED"]),
  articleType: z.enum(["REVIEW", "TOP_LIST", "STORY", "COMPARISON", "GUIDE"]),
  notes: z.string().trim().optional(),
  clusterId: z.string().trim().optional(),
  articleId: z.string().trim().optional(),
  painPointId: z.string().trim().optional(),
  audienceId: z.string().trim().optional(),
});

export async function createContentClusterAction(formData: FormData) {
  await requireAdmin();
  const data = parseClusterForm(formData);

  try {
    await prisma.contentCluster.create({ data });
  } catch (error) {
    handlePlannerError(error, "Không tạo được content cluster.");
  }

  revalidatePlanner();
  redirect("/admin/content-planner?success=Đã tạo content cluster.");
}

export async function updateContentClusterAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const data = parseClusterForm(formData);

  try {
    await prisma.contentCluster.update({ where: { id }, data });
  } catch (error) {
    handlePlannerError(error, "Không cập nhật được content cluster.");
  }

  revalidatePlanner();
  redirect("/admin/content-planner?success=Đã cập nhật content cluster.");
}

export async function deleteContentClusterAction(formData: FormData) {
  await requireAdmin();
  await prisma.contentCluster.delete({ where: { id: requiredId(formData) } });
  revalidatePlanner();
  redirect("/admin/content-planner?success=Đã xóa content cluster.");
}

export async function createKeywordIdeaAction(formData: FormData) {
  await requireAdmin();
  const data = parseIdeaForm(formData);

  try {
    await prisma.keywordIdea.create({ data });
  } catch (error) {
    handlePlannerError(error, "Không tạo được keyword idea.");
  }

  revalidatePlanner();
  redirect("/admin/content-planner?success=Đã tạo keyword idea.");
}

export async function updateKeywordIdeaAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const data = parseIdeaForm(formData);

  try {
    await prisma.keywordIdea.update({ where: { id }, data });
  } catch (error) {
    handlePlannerError(error, "Không cập nhật được keyword idea.");
  }

  revalidatePlanner();
  redirect("/admin/content-planner?success=Đã cập nhật keyword idea.");
}

export async function deleteKeywordIdeaAction(formData: FormData) {
  await requireAdmin();
  await prisma.keywordIdea.delete({ where: { id: requiredId(formData) } });
  revalidatePlanner();
  redirect("/admin/content-planner?success=Đã xóa keyword idea.");
}

export async function generateKeywordIdeaBriefAction(formData: FormData) {
  await generateIdeaAiOutput(requiredId(formData), "brief");
}

export async function generateKeywordIdeaOutlineAction(formData: FormData) {
  await generateIdeaAiOutput(requiredId(formData), "outline");
}

export async function createDraftFromKeywordIdeaAction(formData: FormData) {
  await requireAdmin();
  const id = requiredId(formData);
  const idea = await prisma.keywordIdea.findUnique({
    where: { id },
    include: { painPoint: true, audience: true, cluster: true, article: true },
  });

  if (!idea) redirect("/admin/content-planner?error=Không tìm thấy keyword idea.");
  if (idea.articleId) {
    redirect(`/admin/articles/${idea.articleId}/edit?success=Idea này đã có article draft.`);
  }

  const content = draftContentFromIdea(idea);
  const article = await prisma.article.create({
    data: {
      title: idea.keyword,
      slug: await uniqueArticleSlug(idea.keyword),
      excerpt:
        idea.notes ||
        `Gợi ý đọc cho keyword "${idea.keyword}", cần được biên tập trước khi publish.`,
      content,
      type: idea.articleType,
      status: ArticleStatus.DRAFT,
      seoTitle: idea.keyword,
      seoDescription:
        idea.notes?.slice(0, 155) ||
        `Bài viết gợi ý sách theo keyword ${idea.keyword}.`,
      focusKeyword: idea.keyword,
      readingTime: readingTimeFromMarkdown(content),
      clusterId: idea.clusterId,
      painPoints: idea.painPointId ? { connect: [{ id: idea.painPointId }] } : undefined,
      audiences: idea.audienceId ? { connect: [{ id: idea.audienceId }] } : undefined,
    },
  });

  await prisma.keywordIdea.update({
    where: { id },
    data: { articleId: article.id, status: KeywordIdeaStatus.WRITING },
  });

  revalidatePlanner();
  redirect(`/admin/articles/${article.id}/edit?success=Đã tạo article draft từ keyword idea.`);
}

function parseClusterForm(formData: FormData) {
  const parsed = clusterSchema.safeParse(formValues(formData, Object.keys(clusterSchema.shape)));
  if (!parsed.success) {
    redirect(`/admin/content-planner?error=${encodeURIComponent(firstError(parsed.error))}`);
  }

  const slug = slugify(parsed.data.slug || parsed.data.name);
  if (!slug) redirect("/admin/content-planner?error=Slug cluster không hợp lệ.");

  return {
    name: parsed.data.name,
    slug,
    description: nullable(parsed.data.description),
    pillarArticleId: nullable(parsed.data.pillarArticleId),
    categoryId: nullable(parsed.data.categoryId),
    painPointId: nullable(parsed.data.painPointId),
    audienceId: nullable(parsed.data.audienceId),
  };
}

function parseIdeaForm(formData: FormData) {
  const parsed = ideaSchema.safeParse(formValues(formData, Object.keys(ideaSchema.shape)));
  if (!parsed.success) {
    redirect(`/admin/content-planner?error=${encodeURIComponent(firstError(parsed.error))}`);
  }

  return {
    keyword: parsed.data.keyword,
    intent: parsed.data.intent,
    priority: parsed.data.priority,
    status: parsed.data.status as KeywordIdeaStatus,
    articleType: parsed.data.articleType as ArticleType,
    notes: nullable(parsed.data.notes),
    clusterId: nullable(parsed.data.clusterId),
    articleId: nullable(parsed.data.articleId),
    painPointId: nullable(parsed.data.painPointId),
    audienceId: nullable(parsed.data.audienceId),
  };
}

async function generateIdeaAiOutput(id: string, kind: "brief" | "outline") {
  await requireAdmin();
  const idea = await prisma.keywordIdea.findUnique({
    where: { id },
    include: { painPoint: true, audience: true, cluster: true },
  });

  if (!idea) redirect("/admin/content-planner?error=Không tìm thấy keyword idea.");

  try {
    const input = {
      contentType: mapArticleTypeToContentType(idea.articleType),
      book: null,
      painPoint: idea.painPoint,
      audience: idea.audience,
      focusKeyword: idea.keyword,
      tone: "ấm, từng trải, không quảng cáo",
      extraNotes: [
        `Search intent: ${idea.intent}`,
        idea.cluster ? `Content cluster: ${idea.cluster.name}` : "",
        idea.notes ? `Notes: ${idea.notes}` : "",
        "Không chèn CTA mua sách trong markdown.",
      ]
        .filter(Boolean)
        .join("\n"),
      verifiedRead: false,
    };
    const output = kind === "brief" ? await generateBrief(input) : await generateOutline(input);

    await prisma.keywordIdea.update({
      where: { id },
      data:
        kind === "brief"
          ? { briefMarkdown: output, status: KeywordIdeaStatus.BRIEFED }
          : { outlineMarkdown: output, status: KeywordIdeaStatus.BRIEFED },
    });

    revalidatePlanner();
    redirect(
      `/admin/content-planner?success=${encodeURIComponent(
        kind === "brief" ? "Đã generate brief." : "Đã generate outline.",
      )}`,
    );
  } catch (error) {
    if (error instanceof DeepSeekConfigError) {
      redirect(`/admin/content-planner?error=${encodeURIComponent(error.message)}`);
    }
    console.error(error);
    redirect("/admin/content-planner?error=Không gọi được AI cho keyword idea.");
  }
}

function draftContentFromIdea(idea: {
  keyword: string;
  intent: string;
  notes: string | null;
  briefMarkdown: string | null;
  outlineMarkdown: string | null;
  cluster: { name: string } | null;
}) {
  return [
    `# ${idea.keyword}`,
    "",
    "## Content brief",
    idea.briefMarkdown || "Chưa có brief. Hãy generate brief hoặc viết thủ công trước khi publish.",
    "",
    "## Outline",
    idea.outlineMarkdown || "Chưa có outline.",
    "",
    "## Ghi chú biên tập",
    `- Search intent: ${idea.intent}`,
    idea.cluster ? `- Content cluster: ${idea.cluster.name}` : "",
    idea.notes ? `- Notes: ${idea.notes}` : "",
    "- Bài này là draft từ Content Planner, cần viết lại thành nội dung hoàn chỉnh trước khi publish.",
  ]
    .filter(Boolean)
    .join("\n");
}

function formValues(formData: FormData, keys: string[]) {
  return Object.fromEntries(keys.map((key) => [key, textValue(formData, key)]));
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function requiredId(formData: FormData) {
  const id = textValue(formData, "id");
  if (!id) redirect("/admin/content-planner?error=Thiếu ID.");
  return id;
}

function nullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function firstError(error: z.ZodError) {
  return error.issues[0]?.message || "Dữ liệu không hợp lệ.";
}

function mapArticleTypeToContentType(type: ArticleType): ContentType {
  if (type === ArticleType.TOP_LIST) return "Top list";
  if (type === ArticleType.STORY) return "Story essay";
  if (type === ArticleType.COMPARISON) return "Comparison";
  return "Review sách";
}

async function uniqueArticleSlug(title: string) {
  const base = slugify(title) || `keyword-idea-${Date.now()}`;
  let candidate = base;
  let suffix = 2;

  while (await prisma.article.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function handlePlannerError(error: unknown, fallback: string): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      redirect("/admin/content-planner?error=Slug hoặc dữ liệu unique đã tồn tại.");
    }
    if (error.code === "P2025") {
      redirect("/admin/content-planner?error=Không tìm thấy bản ghi cần cập nhật.");
    }
  }

  console.error(error);
  redirect(`/admin/content-planner?error=${encodeURIComponent(fallback)}`);
}

function revalidatePlanner() {
  revalidatePath("/admin");
  revalidatePath("/admin/content-planner");
  revalidatePath("/admin/articles");
  revalidatePath("/");
}
