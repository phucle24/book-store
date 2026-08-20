import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashIp } from "@/lib/hash";
import { siteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trackingSlug: string }> },
) {
  const { trackingSlug } = await params;
  let affiliateLink = await prisma.affiliateLink.findUnique({
    where: { trackingSlug },
    include: {
      book: { select: { id: true, shopeeAffiliateUrl: true } },
      article: {
        select: {
          id: true,
          books: {
            where: { role: "MAIN" },
            include: { book: { select: { id: true, shopeeAffiliateUrl: true } } },
            take: 1,
          },
        },
      },
    },
  });

  // Dynamic fallback nếu chưa có affiliateLink trong DB
  if (!affiliateLink) {
    if (trackingSlug.startsWith("book-")) {
      const bookSlug = trackingSlug.replace(/^book-/, "");
      const book = await prisma.book.findUnique({
        where: { slug: bookSlug },
        select: { id: true, shopeeAffiliateUrl: true },
      });
      if (book?.shopeeAffiliateUrl) {
        return NextResponse.redirect(book.shopeeAffiliateUrl, 302);
      }
    } else if (trackingSlug.startsWith("article-")) {
      const articleSlug = trackingSlug.replace(/^article-/, "");
      const article = await prisma.article.findUnique({
        where: { slug: articleSlug },
        include: {
          books: {
            include: { book: { select: { id: true, shopeeAffiliateUrl: true } } },
            take: 1,
          },
        },
      });
      const bookUrl = article?.books[0]?.book?.shopeeAffiliateUrl;
      if (bookUrl) {
        return NextResponse.redirect(bookUrl, 302);
      }
    }

    const response = NextResponse.redirect(siteUrl("/"), 302);
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }

  if (!affiliateLink.isActive) {
    const response = NextResponse.redirect(siteUrl("/"), 302);
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }

  const targetUrl =
    affiliateLink.book?.shopeeAffiliateUrl ||
    affiliateLink.article?.books[0]?.book?.shopeeAffiliateUrl ||
    affiliateLink.destinationUrl;

  if (!targetUrl) {
    const response = NextResponse.redirect(siteUrl("/"), 302);
    response.headers.set("X-Robots-Tag", "noindex");
    return response;
  }

  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");
  const referer = request.headers.get("referer");
  const ipHash = hashIp(forwardedFor || realIp);

  after(async () => {
    await prisma.clickEvent.create({
      data: {
        affiliateLinkId: affiliateLink.id,
        articleId: affiliateLink.articleId,
        bookId: affiliateLink.bookId,
        userAgent,
        referer,
        ipHash,
      },
    });
  });

  const response = NextResponse.redirect(targetUrl, 302);
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}
