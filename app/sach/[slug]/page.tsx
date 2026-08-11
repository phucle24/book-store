import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleStatus, BookStatus } from "@prisma/client";
import { AffiliateButton } from "@/components/AffiliateButton";
import { ArticleCard } from "@/components/ArticleCard";
import { BookPainFitBlock } from "@/components/BookPainFitBlock";
import { BookCard } from "@/components/BookCard";
import { BookCover } from "@/components/BookCover";
import { DisclosureBox } from "@/components/DisclosureBox";
import { IntentEventTracker } from "@/components/IntentEventTracker";
import { PageViewTracker } from "@/components/PageViewTracker";
import { VerdictCard } from "@/components/VerdictCard";
import { prisma } from "@/lib/prisma";
import { getActiveBookBySlug } from "@/lib/queries";
import { pageMetadata, siteUrl } from "@/lib/seo";

export const revalidate = 600;

export async function generateStaticParams() {
  const books = await prisma.book.findMany({
    where: { status: BookStatus.ACTIVE },
    select: { slug: true },
  });

  return books.map((book) => ({ slug: book.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getActiveBookBySlug(slug);

  if (!book) {
    return pageMetadata({
      title: "Không tìm thấy sách",
      description: "Cuốn sách không tồn tại hoặc đang tạm ẩn.",
      path: `/sach/${slug}`,
    });
  }

  return pageMetadata({
    title: book.title,
    description: book.description,
    path: `/sach/${slug}`,
    image: book.coverImage,
  });
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getActiveBookBySlug(slug);

  if (!book) notFound();

  const relatedArticles = book.articles
    .map((item) => item.article)
    .filter((article) => article.status === ArticleStatus.PUBLISHED);
  const similarBooks = await prisma.book.findMany({
    where: {
      id: { not: book.id },
      status: BookStatus.ACTIVE,
      categories: { some: { id: { in: book.categories.map((item) => item.id) } } },
    },
    take: 4,
    include: { painPoints: true },
  });
  const trackingSlug = book.affiliateLinks[0]?.trackingSlug;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: { "@type": "Person", name: book.author },
    description: book.description,
    image: book.coverImage || undefined,
    url: siteUrl(`/sach/${book.slug}`),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <IntentEventTracker
        bookId={book.id}
        painPointId={book.painPoints[0]?.id}
      />
      <PageViewTracker bookId={book.id} path={`/sach/${book.slug}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-stone-500">
        <Link href="/" className="hover:text-amber-900">
          Trang chủ
        </Link>{" "}
        / Sách
      </nav>

      <section className="mt-8 grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm">
          <BookCover title={book.title} coverImage={book.coverImage} priority />
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            {book.categories.map((category) => (
              <Link
                key={category.id}
                href={`/chu-de/${category.slug}`}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-900"
              >
                {category.name}
              </Link>
            ))}
          </div>
          <h1 className="mt-5 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
            {book.title}
          </h1>
          <p className="mt-3 text-lg text-stone-700">Tác giả: {book.author}</p>
          {book.publisher ? (
            <p className="mt-1 text-sm text-stone-500">Nhà xuất bản: {book.publisher}</p>
          ) : null}
          <p className="mt-6 text-lg leading-8 text-stone-700">{book.description}</p>
          <VerdictCard
            score={book.editorialScore}
            scoreBreakdown={scoreBreakdown(book.scoreBreakdown)}
            summary={
              book.editorialScore
                ? "Điểm này phản ánh đánh giá biên tập của Trạm Đọc, không phải điểm người mua trên sàn."
                : null
            }
          />
        </div>
      </section>

      <BookPainFitBlock book={book} />

      <section className="mt-12 grid gap-5 md:grid-cols-2">
        <InfoList title="Đối tượng phù hợp" items={book.audiences.map((item) => item.name)} />
        <InfoList title="Nỗi đau giải quyết" items={book.painPoints.map((item) => item.name)} />
        <InfoList title="Điểm mạnh" items={book.pros} />
        <InfoList title="Điểm hạn chế" items={book.cons} />
        <InfoList title="Bài học chính" items={book.keyLessons} />
        <InfoList title="Không phù hợp nếu bạn..." items={book.notSuitableFor} />
      </section>

      <section
        data-cta-visible-target
        className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm sm:p-6"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
          Sau khi cân nhắc
        </p>
        <h2 className="mt-2 text-xl font-semibold text-stone-950">
          Nếu cuốn này đúng với giai đoạn của bạn
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">
          Bạn có thể xem giá như một bước kiểm tra thêm. Hãy đọc phần phù hợp và
          điểm hạn chế trước, rồi mới quyết định.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <AffiliateButton
            trackingSlug={trackingSlug}
            label="Xem sách trên Shopee"
            size="lg"
          />
          <DisclosureBox />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-stone-950">Bài review liên quan</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {relatedArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold text-stone-950">Các sách tương tự</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {similarBooks.map((item) => (
            <BookCard key={item.id} book={item} />
          ))}
        </div>
      </section>
    </div>
  );
}

function scoreBreakdown(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  return Object.fromEntries(
    Object.entries(value).filter(([, score]) => typeof score === "number"),
  ) as Record<string, number>;
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-950">{title}</h2>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}
