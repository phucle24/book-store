import { NextRequest } from "next/server";
import { z } from "zod";
import { hashIp } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const pageViewSchema = z.object({
  articleId: z.string().trim().optional().nullable(),
  bookId: z.string().trim().optional().nullable(),
  path: z.string().trim().min(1).max(300),
});

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = request.headers.get("x-real-ip")?.trim();
    const userAgent = request.headers.get("user-agent") || "";
    const rateKey = hashIp(`${forwardedFor || realIp || "unknown"}:${userAgent}`) || "unknown";
    const limit = rateLimit({ key: `page-view:${rateKey}`, limit: 60, windowMs: 60_000 });

    if (!limit.ok) return new Response(null, { status: 204 });

    const parsed = pageViewSchema.safeParse(await request.json());
    if (!parsed.success) return new Response(null, { status: 204 });

    await prisma.pageView.create({
      data: {
        articleId: nullable(parsed.data.articleId),
        bookId: nullable(parsed.data.bookId),
        path: parsed.data.path,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        ipHash: hashIp(forwardedFor || realIp),
      },
    });
  } catch (error) {
    console.error("Could not track page view", error);
  }

  return new Response(null, { status: 204 });
}

function nullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}
