import { headers } from "next/headers";
import { hashIp } from "@/lib/hash";
import { prisma } from "@/lib/prisma";

type TrackPageViewInput = {
  articleId?: string;
  bookId?: string;
  path: string;
};

export async function trackPageView({ articleId, bookId, path }: TrackPageViewInput) {
  try {
    const headerStore = await headers();
    const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = headerStore.get("x-real-ip");

    await prisma.pageView.create({
      data: {
        articleId,
        bookId,
        path,
        userAgent: headerStore.get("user-agent"),
        referer: headerStore.get("referer"),
        ipHash: hashIp(forwardedFor || realIp),
      },
    });
  } catch (error) {
    console.error("Could not track page view", error);
  }
}
