import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/hash";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trackingSlug: string }> },
) {
  const { trackingSlug } = await params;
  const affiliateLink = await prisma.affiliateLink.findUnique({
    where: { trackingSlug },
    select: {
      id: true,
      articleId: true,
      bookId: true,
      destinationUrl: true,
      isActive: true,
    },
  });

  if (!affiliateLink?.isActive) {
    return NextResponse.redirect(siteUrl("/"), 302);
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");

  await prisma.clickEvent.create({
    data: {
      affiliateLinkId: affiliateLink.id,
      articleId: affiliateLink.articleId,
      bookId: affiliateLink.bookId,
      userAgent: request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      ipHash: hashIp(forwardedFor || realIp),
    },
  });

  return NextResponse.redirect(affiliateLink.destinationUrl, 302);
}
