import type { AiGenerationType } from "@prisma/client";
import { z } from "zod";
import { requireAdminApi } from "@/lib/api-auth";
import {
  DeepSeekConfigError,
  type AiContentInput,
  generateBrief,
  generateDraft,
  generateOutline,
  improveDraft,
  seoCheck,
} from "@/lib/deepseek";
import { prisma } from "@/lib/prisma";

const aiRequestSchema = z.object({
  contentType: z
    .enum(["Review sách", "Top list", "Story essay", "Comparison"])
    .default("Review sách"),
  bookId: z.string().optional(),
  painPointId: z.string().optional(),
  audienceId: z.string().optional(),
  focusKeyword: z.string().trim().min(1, "Thiếu focus keyword."),
  tone: z.string().trim().default("ấm, từng trải, không quảng cáo"),
  extraNotes: z.string().optional(),
  verifiedRead: z.boolean().optional(),
  outline: z.string().optional(),
  draft: z.string().optional(),
});

const generators = {
  BRIEF: generateBrief,
  OUTLINE: generateOutline,
  DRAFT: generateDraft,
  IMPROVE: improveDraft,
  SEO_CHECK: seoCheck,
} satisfies Record<AiGenerationType, (input: AiContentInput) => Promise<string>>;

export async function handleAiGenerationRequest(
  request: Request,
  type: AiGenerationType,
) {
  const authError = await requireAdminApi();
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Payload JSON không hợp lệ." }, { status: 400 });
  }

  const parsed = aiRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message || "Dữ liệu không hợp lệ." },
      { status: 400 },
    );
  }

  const rawInput = parsed.data;
  const [book, painPoint, audience] = await Promise.all([
    rawInput.bookId
      ? prisma.book.findUnique({
          where: { id: rawInput.bookId },
          select: {
            id: true,
            title: true,
            author: true,
            publisher: true,
            description: true,
            pros: true,
            cons: true,
            keyLessons: true,
            suitableFor: true,
            notSuitableFor: true,
          },
        })
      : null,
    rawInput.painPointId
      ? prisma.painPoint.findUnique({
          where: { id: rawInput.painPointId },
          select: { id: true, name: true, description: true },
        })
      : null,
    rawInput.audienceId
      ? prisma.audience.findUnique({
          where: { id: rawInput.audienceId },
          select: { id: true, name: true, description: true },
        })
      : null,
  ]);
  const relatedBooks =
    rawInput.contentType === "Top list"
      ? await prisma.book.findMany({
          where: { status: "ACTIVE" },
          orderBy: { title: "asc" },
          select: {
            id: true,
            title: true,
            author: true,
            publisher: true,
            description: true,
            pros: true,
            cons: true,
            keyLessons: true,
            suitableFor: true,
            notSuitableFor: true,
          },
        })
      : undefined;

  const input: AiContentInput = {
    contentType: rawInput.contentType,
    book,
    relatedBooks,
    painPoint,
    audience,
    focusKeyword: rawInput.focusKeyword,
    tone: rawInput.tone,
    extraNotes: rawInput.extraNotes,
    verifiedRead: rawInput.verifiedRead,
    outline: rawInput.outline,
    draft: rawInput.draft,
  };

  try {
    const outputMarkdown = await generators[type](input);
    const generation = await prisma.aiGeneration.create({
      data: {
        type,
        inputJson: input,
        outputMarkdown,
        model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
        bookId: book?.id,
      },
    });

    return Response.json({
      id: generation.id,
      type: generation.type,
      model: generation.model,
      outputMarkdown,
      createdAt: generation.createdAt,
    });
  } catch (error) {
    if (error instanceof DeepSeekConfigError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    console.error(error);
    return Response.json(
      {
        error:
          "Không tạo được nội dung từ DeepSeek lúc này. Kiểm tra API key, model hoặc thử lại sau.",
      },
      { status: 502 },
    );
  }
}
