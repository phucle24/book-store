import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleStatus, ArticleType } from "@prisma/client";
import { AffiliateDecisionCard } from "@/components/AffiliateDecisionCard";
import { ArticleSourceNote } from "@/components/ArticleSourceNote";
import { ArticleIntentBox } from "@/components/ArticleIntentBox";
import { ArticleByline } from "@/components/ArticleByline";
import { ArticleReactions } from "@/components/ArticleReactions";
import { ArticleShareActions } from "@/components/ArticleShareActions";
import { ArticleTableOfContents } from "@/components/ArticleTableOfContents";
import {
  BookContentBox,
  BookReadingPrelude,
  BookReadingQuestions,
} from "@/components/BookContentBox";
import { CommentSection } from "@/components/CommentSection";
import { DisclosureBox } from "@/components/DisclosureBox";
import { FAQBlock } from "@/components/FAQBlock";
import { HighlightText } from "@/components/HighlightText";
import { IntentEventTracker } from "@/components/IntentEventTracker";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { PainJourneyBlock } from "@/components/PainJourneyBlock";
import { PageViewTracker } from "@/components/PageViewTracker";
import { ReadNext } from "@/components/ReadNext";
import { SavedArticleButton } from "@/components/SavedArticleButton";
import { SubscribeForm } from "@/components/SubscribeForm";
import { getCommentsAndReactions } from "@/lib/comment-actions";
import {
  TopListFinalCta,
  TopListQuickGuide,
  TopListSituationPicker,
} from "@/components/TopListBooks";
import { VerdictCard } from "@/components/VerdictCard";
import { prisma } from "@/lib/prisma";
import { getPublishedArticleBySlug } from "@/lib/queries";
import { breadcrumbSchema, faqSchema, itemListSchema } from "@/lib/schema-org";
import { pageMetadata, siteName, siteUrl } from "@/lib/seo";
import { slugify } from "@/lib/slugify";

export const revalidate = 600;

export async function generateStaticParams() {
  const articles = await prisma.article.findMany({
    where: { status: ArticleStatus.PUBLISHED },
    select: { slug: true },
  });

  return articles.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
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
    image: article.coverImage || siteUrl(`/bai-viet/${slug}/opengraph-image`),
    type: "article",
    authors: [article.authorName || siteName],
    publishedTime: article.publishedAt?.toISOString(),
    modifiedTime: article.updatedAt.toISOString(),
  });
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);

  if (!article) notFound();

  const isTopList = article.type === ArticleType.TOP_LIST;
  const mainBook =
    !isTopList
      ? article.books.find((item) => item.role === "MAIN")?.book || article.books[0]?.book
      : null;
  const topListBooks = isTopList ? article.books.map((item) => item.book) : [];
  const trackingSlug =
    !isTopList
      ? article.affiliateLinks[0]?.trackingSlug ||
        mainBook?.affiliateLinks[0]?.trackingSlug ||
        (mainBook?.slug ? `book-${mainBook.slug}` : `article-${article.slug}`)
      : null;

  const [
    relatedArticles,
    samePainArticles,
    sameAudienceArticles,
    sameBookArticles,
    ugcData,
  ] = await Promise.all([
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
    getCommentsAndReactions({ articleId: article.id }),
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
    headline: article.seoTitle || article.title,
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
    ...(ugcData.totalReviews > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: ugcData.averageRating,
            reviewCount: ugcData.totalReviews,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
  const faqJsonLd = article.faqs.length
    ? faqSchema(article.faqs.map((faq) => ({ question: faq.question, answer: faq.answer })))
    : null;
  const breadcrumbJsonLd = breadcrumbSchema([
    { name: "Trang chủ", url: siteUrl("/") },
    { name: "Bài viết", url: siteUrl("/bai-viet") },
    { name: article.title, url: articleUrl },
  ]);
  const reviewJsonLd =
    article.type === ArticleType.REVIEW && (article.verdictScore || mainBook?.editorialScore) && mainBook
      ? {
          "@context": "https://schema.org",
          "@type": "Review",
          name: article.title,
          reviewBody: article.verdictSummary || article.excerpt,
          author: {
            "@type": article.authorName ? "Person" : "Organization",
            name: article.authorName || siteName,
          },
          itemReviewed: {
            "@type": "Book",
            name: mainBook.title,
            author: { "@type": "Person", name: mainBook.author },
          },
          reviewRating: {
            "@type": "Rating",
            ratingValue: article.verdictScore || mainBook.editorialScore,
            bestRating: 5,
            worstRating: 1,
          },
          ...(ugcData.totalReviews > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: ugcData.averageRating,
                  reviewCount: ugcData.totalReviews,
                  bestRating: 5,
                  worstRating: 1,
                },
              }
            : {}),
        }
      : null;
  const itemListJsonLd = isTopList
    ? itemListSchema(topListBooks.map((book) => ({ name: book.title, url: siteUrl(`/sach/${book.slug}`) })))
    : null;

  return (
    <article className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <IntentEventTracker
        articleId={article.id}
        bookId={mainBook?.id}
        painPointId={article.painPoints[0]?.id}
      />
      <PageViewTracker articleId={article.id} path={`/bai-viet/${article.slug}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {reviewJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }}
        />
      ) : null}
      {itemListJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
        />
      ) : null}
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
        <VerdictCard
          score={article.verdictScore || mainBook?.editorialScore}
          summary={article.verdictSummary}
          scoreBreakdown={scoreBreakdown(mainBook?.scoreBreakdown)}
        />
        <ArticleByline
          article={{
            authorName: article.authorName,
            authorSlug: article.authorSlug,
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
              tagLinks: [
                ...article.painPoints.map((item) => ({
                  name: item.name,
                  href: `/noi-dau/${item.slug}`,
                })),
                ...article.audiences.map((item) => ({
                  name: item.name,
                  href: `/doi-tuong/${item.slug}`,
                })),
              ],
            }}
          />
          <ArticleShareActions url={articleUrl} title={article.title} />
        </div>
        {!isTopList ? (
          <div className="mt-5">
            <DisclosureBox />
          </div>
        ) : null}
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

        <ArticleReactions
          articleId={article.id}
          initialCounts={ugcData.reactionCounts}
        />
      </div>

      <ReadNext
        painPoint={article.painPoints[0]}
        featuredArticle={samePainArticles[0] || sameAudienceArticles[0] || sameBookArticles[0] || relatedArticles[0]}
        secondaryArticles={[...sameAudienceArticles, ...sameBookArticles, ...relatedArticles]}
        books={relatedBooks}
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
        <ArticleSourceNote sources={article.sources} reviewInsight={article.reviewInsight} />
        <FAQBlock faqs={article.faqs} />
        
        <CommentSection
          articleId={article.id}
          initialComments={ugcData.comments}
          averageRating={ugcData.averageRating}
          totalReviews={ugcData.totalReviews}
        />

        <div className="mt-8">
          <SubscribeForm
            source={`article:${article.slug}`}
            painPointId={article.painPoints[0]?.id}
          />
        </div>
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

function scoreBreakdown(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  return Object.fromEntries(
    Object.entries(value).filter(([, score]) => typeof score === "number"),
  ) as Record<string, number>;
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
