import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleStatus, ArticleType } from "@prisma/client";
import { AffiliateDecisionCard } from "@/components/AffiliateDecisionCard";
import { ArticleIntentBox } from "@/components/ArticleIntentBox";
import { ArticleByline } from "@/components/ArticleByline";
import { ArticleShareActions } from "@/components/ArticleShareActions";
import { ArticleTableOfContents } from "@/components/ArticleTableOfContents";
import {
  BookContentBox,
  BookReadingPrelude,
  BookReadingQuestions,
} from "@/components/BookContentBox";
import { FAQBlock } from "@/components/FAQBlock";
import { HighlightText } from "@/components/HighlightText";
import { InternalLinkCluster } from "@/components/InternalLinkCluster";
import { IntentEventTracker } from "@/components/IntentEventTracker";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { NextSmallStep } from "@/components/NextSmallStep";
import { PainJourneyBlock } from "@/components/PainJourneyBlock";
import { ReaderNextSteps } from "@/components/ReaderNextSteps";
import { RelatedArticles } from "@/components/RelatedArticles";
import { RelatedBooks } from "@/components/RelatedBooks";
import { SavedArticleButton } from "@/components/SavedArticleButton";
import {
  TopListFinalCta,
  TopListQuickGuide,
  TopListSituationPicker,
} from "@/components/TopListBooks";
import { trackPageView } from "@/lib/page-view";
import { prisma } from "@/lib/prisma";
import { pageMetadata, siteName, siteUrl } from "@/lib/seo";
import { slugify } from "@/lib/slugify";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug },
    select: {
      title: true,
      excerpt: true,
      seoTitle: true,
      seoDescription: true,
      coverImage: true,
      status: true,
    },
  });

  if (!article || article.status !== ArticleStatus.PUBLISHED) {
    return pageMetadata({
      title: "Không tìm thấy bài viết",
      description: "Bài viết không tồn tại hoặc chưa được xuất bản.",
      path: `/bai-viet/${slug}`,
    });
  }

  return pageMetadata({
    title: article.seoTitle || article.title,
    description: article.seoDescription || article.excerpt,
    path: `/bai-viet/${slug}`,
    image: article.coverImage,
  });
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await prisma.article.findFirst({
    where: { slug, status: ArticleStatus.PUBLISHED },
    include: {
      categories: true,
      painPoints: true,
      audiences: true,
      faqs: { orderBy: { order: "asc" } },
      affiliateLinks: { where: { isActive: true }, take: 1 },
      books: {
        orderBy: [{ order: "asc" }],
        include: {
          book: {
            include: {
              painPoints: true,
              affiliateLinks: { where: { isActive: true }, take: 1 },
            },
          },
        },
      },
    },
  });

  if (!article) notFound();

  const isTopList = article.type === ArticleType.TOP_LIST;
  const mainBook =
    !isTopList
      ? article.books.find((item) => item.role === "MAIN")?.book || article.books[0]?.book
      : null;
  const topListBooks = isTopList ? article.books.map((item) => item.book) : [];
  const trackingSlug =
    !isTopList
      ? article.affiliateLinks[0]?.trackingSlug || mainBook?.affiliateLinks[0]?.trackingSlug
      : null;

  await trackPageView({ articleId: article.id, path: `/bai-viet/${article.slug}` });

  const [relatedArticles, samePainArticles, sameAudienceArticles, sameBookArticles] =
    await Promise.all([
      prisma.article.findMany({
        where: {
          id: { not: article.id },
          status: ArticleStatus.PUBLISHED,
          OR: [
            { painPoints: { some: { id: { in: article.painPoints.map((item) => item.id) } } } },
            { categories: { some: { id: { in: article.categories.map((item) => item.id) } } } },
          ],
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 4,
        include: { categories: true, painPoints: true },
      }),
      prisma.article.findMany({
        where: {
          id: { not: article.id },
          status: ArticleStatus.PUBLISHED,
          painPoints: { some: { id: { in: article.painPoints.map((item) => item.id) } } },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: { id: true, title: true, slug: true, excerpt: true },
      }),
      prisma.article.findMany({
        where: {
          id: { not: article.id },
          status: ArticleStatus.PUBLISHED,
          audiences: { some: { id: { in: article.audiences.map((item) => item.id) } } },
        },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        take: 3,
        select: { id: true, title: true, slug: true, excerpt: true },
      }),
      mainBook
        ? prisma.article.findMany({
            where: {
              id: { not: article.id },
              status: ArticleStatus.PUBLISHED,
              books: { some: { bookId: mainBook.id } },
            },
            orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
            take: 3,
            select: { id: true, title: true, slug: true, excerpt: true },
          })
        : Promise.resolve([]),
    ]);

  const relatedBooks = article.books.map((item) => item.book);
  const publishedAt = article.publishedAt || article.createdAt;
  const articleContent = splitArticleContent(article.content);
  const tocItems = extractTocItems(article.content);
  const articleUrl = siteUrl(`/bai-viet/${article.slug}`);
  const highlightKeywords = painHighlightKeywords({
    painPoints: article.painPoints.map((item) => item.name),
    audiences: article.audiences.map((item) => item.name),
    bookSignals: [
      ...(mainBook?.suitableFor || []),
      ...(mainBook?.notSuitableFor || []),
      ...topListBooks.flatMap((book) => [...book.suitableFor, ...book.notSuitableFor]),
    ],
  });
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.seoDescription || article.excerpt,
    datePublished: publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: {
      "@type": article.authorName ? "Person" : "Organization",
      name: article.authorName || siteName,
    },
    publisher: { "@type": "Organization", name: siteName },
    image: article.coverImage ? [article.coverImage] : undefined,
    mainEntityOfPage: siteUrl(`/bai-viet/${article.slug}`),
  };
  const faqJsonLd = article.faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: article.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }
    : null;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <IntentEventTracker
        articleId={article.id}
        bookId={mainBook?.id}
        painPointId={article.painPoints[0]?.id}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      ) : null}

      <div className="mx-auto max-w-3xl">
        <nav className="text-sm text-stone-500">
          <Link href="/" className="hover:text-amber-900">
            Trang chủ
          </Link>{" "}
          /{" "}
          <Link href="/bai-viet" className="hover:text-amber-900">
            Bài viết
          </Link>
        </nav>
        <div className="mt-6 flex flex-wrap gap-2">
          {article.painPoints.map((painPoint) => (
            <Link
              key={painPoint.id}
              href={`/noi-dau/${painPoint.slug}`}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-900"
            >
              {painPoint.name}
            </Link>
          ))}
        </div>
        <h1 className="mt-5 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
          <HighlightText text={article.title} keywords={highlightKeywords} />
        </h1>
        <p className="mt-5 text-lg leading-8 text-stone-700">
          <HighlightText text={article.excerpt} keywords={highlightKeywords} />
        </p>
        <ArticleByline
          article={{
            authorName: article.authorName,
            authorBio: article.authorBio,
            voiceTone: article.voiceTone,
            readingTime: article.readingTime,
            publishedAt,
            updatedAt: article.updatedAt,
          }}
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SavedArticleButton
            article={{
              id: article.id,
              title: article.title,
              slug: article.slug,
              excerpt: article.excerpt,
              readingTime: article.readingTime,
              tags: [
                ...article.painPoints.map((item) => item.name),
                ...article.audiences.map((item) => item.name),
              ],
            }}
          />
          <ArticleShareActions url={articleUrl} title={article.title} />
        </div>
      </div>

      <ArticleIntentBox type={article.type} painPointName={article.painPoints[0]?.name} />

      {!isTopList && mainBook ? (
        <BookContentBox book={mainBook} highlightKeywords={highlightKeywords} />
      ) : null}

      {isTopList ? (
        <TopListQuickGuide books={topListBooks} highlightKeywords={highlightKeywords} />
      ) : null}

      <PainJourneyBlock
        painPoint={article.painPoints[0]}
        articles={samePainArticles}
        books={relatedBooks}
      />

      <div className="mx-auto mt-10 max-w-3xl rounded-3xl bg-white px-5 py-8 shadow-sm sm:px-8">
        {!isTopList && mainBook ? (
          <BookReadingPrelude book={mainBook} highlightKeywords={highlightKeywords} />
        ) : null}
        {articleContent.intro ? (
          <MarkdownRenderer content={articleContent.intro} highlightKeywords={highlightKeywords} />
        ) : null}
        <ArticleTableOfContents items={tocItems} />
        <MarkdownRenderer content={articleContent.body} highlightKeywords={highlightKeywords} />
        {!isTopList && mainBook ? (
          <BookReadingQuestions book={mainBook} highlightKeywords={highlightKeywords} />
        ) : null}
      </div>

      <InternalLinkCluster
        groups={[
          {
            title: "Cùng nỗi đau",
            description: "Những bài viết chạm vào vấn đề gần với giai đoạn bạn đang đọc.",
            items: samePainArticles,
          },
          {
            title: "Cùng nhóm người đọc",
            description: "Các bài dành cho người có bối cảnh hoặc nhu cầu đọc tương tự.",
            items: sameAudienceArticles,
          },
          {
            title: "Cùng cuốn sách",
            description: "Những góc nhìn khác nếu bạn muốn hiểu thêm về cuốn sách này.",
            items: sameBookArticles,
          },
        ]}
      />

      <ReaderNextSteps
        painPointName={article.painPoints[0]?.name}
        audienceName={article.audiences[0]?.name}
        samePainArticles={samePainArticles}
        sameAudienceArticles={sameAudienceArticles}
        sameBookArticles={sameBookArticles}
        books={relatedBooks}
      />

      <NextSmallStep
        painPoint={article.painPoints[0]}
        nextArticle={samePainArticles[0] || sameAudienceArticles[0] || relatedArticles[0]}
        book={mainBook || relatedBooks[0]}
      />

      {isTopList ? (
        <div data-cta-visible-target>
          <TopListSituationPicker books={topListBooks} />
          <TopListFinalCta books={topListBooks} highlightKeywords={highlightKeywords} />
        </div>
      ) : (
        mainBook ? (
          <div data-cta-visible-target>
            <AffiliateDecisionCard
              book={mainBook}
              trackingSlug={trackingSlug}
              readBeforeBuying={samePainArticles}
            />
          </div>
        ) : null
      )}

      <div className="mx-auto max-w-3xl">
        <FAQBlock faqs={article.faqs} />
        <RelatedBooks books={relatedBooks} />
        <RelatedArticles articles={relatedArticles} />
      </div>
    </article>
  );
}

function splitArticleContent(content: string) {
  const firstHeadingIndex = content.search(/^##\s+/m);
  if (firstHeadingIndex <= 0) {
    return { intro: "", body: content };
  }

  return {
    intro: content.slice(0, firstHeadingIndex).trim(),
    body: content.slice(firstHeadingIndex).trim(),
  };
}

function extractTocItems(content: string) {
  const headingIds = new Map<string, number>();

  return content
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^(##|###)\s+(.+)$/);
      if (!match) return null;
      const title = match[2].trim();
      const baseId = slugify(title);
      const count = (headingIds.get(baseId) || 0) + 1;
      headingIds.set(baseId, count);

      return {
        id: count === 1 ? baseId : `${baseId}-${count}`,
        title,
        level: match[1].length,
      };
    })
    .filter((item): item is { id: string; title: string; level: number } => Boolean(item))
    .slice(0, 8);
}

function painHighlightKeywords({
  painPoints,
  audiences,
  bookSignals,
}: {
  painPoints: string[];
  audiences: string[];
  bookSignals: string[];
}) {
  const signalKeywords = bookSignals.flatMap((signal) => shortPainKeywords(signal));

  return Array.from(
    new Set(
      [...painPoints, ...audiences, ...signalKeywords]
        .map((keyword) => keyword.trim())
        .filter((keyword) => keyword.length >= 3),
    ),
  );
}

function shortPainKeywords(value: string) {
  const cleaned = value
    .trim()
    .replace(/^Bạn\s+/i, "")
    .replace(/^(đang|hay|muốn|cần|thường)\s+/i, "")
    .replace(/^một\s+/i, "")
    .replace(/[.?!]+$/g, "")
    .trim();

  const keywords = [cleaned];
  const compactPatterns = [
    /lười bắt đầu/i,
    /trì hoãn/i,
    /mất phương hướng/i,
    /thiếu tự tin/i,
    /overthinking/i,
    /burnout/i,
    /cô đơn/i,
    /sau chia tay/i,
    /thiếu kỷ luật/i,
    /ngại giao tiếp/i,
    /giao tiếp kém/i,
    /kỷ luật nhẹ nhàng/i,
  ];

  for (const pattern of compactPatterns) {
    const match = cleaned.match(pattern);
    if (match?.[0]) keywords.push(match[0]);
  }

  return keywords.filter((keyword) => keyword.length >= 3 && keyword.length <= 32);
}
