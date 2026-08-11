import { headers } from "next/headers";
import { after } from "next/server";
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
    const userAgent = headerStore.get("user-agent");
    const referer = headerStore.get("referer");
    const ipHash = hashIp(forwardedFor || realIp);

    after(async () => {
      await prisma.pageView.create({
        data: {
          articleId,
          bookId,
          path,
          userAgent,
          referer,
          ipHash,
        },
      });
    });
  } catch (error) {
    console.error("Could not track page view", error);
  }
}
