"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { hashIp } from "@/lib/hash";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

type SubscribeState = {
  ok: boolean;
  message: string;
};

const subscribeSchema = z.object({
  email: z.string().trim().email("Email chưa hợp lệ."),
  source: z.string().trim().max(80).optional(),
  painPointId: z.string().trim().optional(),
});

export async function subscribeAction(
  _previousState: SubscribeState,
  formData: FormData,
): Promise<SubscribeState> {
  const parsed = subscribeSchema.safeParse({
    email: textValue(formData, "email"),
    source: textValue(formData, "source"),
    painPointId: textValue(formData, "painPointId"),
  });

  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message || "Dữ liệu chưa hợp lệ." };
  }

  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerStore.get("x-real-ip")?.trim();
  const ipKey = hashIp(`${forwardedFor || realIp || "unknown"}:${parsed.data.email}`) || "unknown";
  const rate = rateLimit({
    key: `subscribe:${ipKey}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  if (!rate.ok) {
    return {
      ok: false,
      message: `Bạn thử lại sau khoảng ${rate.retryAfterSeconds} giây nhé.`,
    };
  }

  await prisma.subscriber.upsert({
    where: { email: parsed.data.email.toLowerCase() },
    create: {
      email: parsed.data.email.toLowerCase(),
      source: parsed.data.source || null,
      painPointId: parsed.data.painPointId || null,
      token: crypto.randomBytes(24).toString("hex"),
    },
    update: {
      source: parsed.data.source || null,
      painPointId: parsed.data.painPointId || null,
    },
  });

  return {
    ok: true,
    message: "Đã lưu email. Khi có gợi ý sách phù hợp, Trạm Đọc sẽ dùng danh sách này để gửi sau.",
  };
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
