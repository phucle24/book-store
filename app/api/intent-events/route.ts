import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { hashIp } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  type: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_:-]+$/i),
  articleId: z.string().trim().optional().nullable(),
  bookId: z.string().trim().optional().nullable(),
  painPointId: z.string().trim().optional().nullable(),
  path: z.string().trim().min(1).max(300).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = request.headers.get("x-real-ip")?.trim();
    const userAgent = request.headers.get("user-agent") || "";
    const rateKey = hashIp(`${forwardedFor || realIp || "unknown"}:${userAgent}`) || "unknown";
    const eventRate = rateLimit({
      key: `intent-event:${rateKey}`,
      limit: 180,
      windowMs: 60_000,
    });

    if (!eventRate.ok) {
      return Response.json(
        { ok: false, error: "Too many events" },
        {
          status: 429,
          headers: { "Retry-After": String(eventRate.retryAfterSeconds) },
        },
      );
    }

    const json = await request.json();
    const parsed = eventSchema.safeParse(json);
    if (!parsed.success) {
      return Response.json({ ok: false, error: "Invalid event" }, { status: 400 });
    }

    const data = parsed.data;

    await prisma.intentEvent.create({
      data: {
        type: data.type,
        articleId: nullable(data.articleId),
        bookId: nullable(data.bookId),
        painPointId: nullable(data.painPointId),
        path: data.path || "/",
        metadata: data.metadata ? sanitizeMetadata(data.metadata) : undefined,
        userAgent: request.headers.get("user-agent"),
        referer: request.headers.get("referer"),
        ipHash: hashIp(forwardedFor || realIp),
      },
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Could not track intent event", error);
    return Response.json({ ok: false }, { status: 200 });
  }
}

function nullable(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || null;
}

function sanitizeMetadata(metadata: Record<string, unknown>) {
  const json = JSON.stringify(metadata).slice(0, 2000);
  return JSON.parse(json) as Prisma.InputJsonValue;
}
