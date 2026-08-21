import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { QUOTE_THEMES, getThemeBySlug, ALL_THEME_SLUGS } from "@/lib/quote-themes";
import { getQuotesByTheme } from "@/lib/quote-actions";
import { siteUrl } from "@/lib/seo";
import { AffiliateButton } from "@/components/AffiliateButton";

export const revalidate = 3600;

export function generateStaticParams() {
  return ALL_THEME_SLUGS.map((slug) => ({ "chu-de": slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ "chu-de": string }>;
}): Promise<Metadata> {
  const { "chu-de": chuDe } = await params;
  const theme = getThemeBySlug(chuDe);
  if (!theme) return {};

  return {
    title: `${theme.seoTitle} | Trạm Đọc Một Chút`,
    description: theme.seoDescription,
    alternates: { canonical: siteUrl(`/trich-dan/${chuDe}`) },
    openGraph: {
      title: theme.seoTitle,
      description: theme.seoDescription,
      url: siteUrl(`/trich-dan/${chuDe}`),
    },
  };
}

export default async function TrichDanThemePage({
  params,
}: {
  params: Promise<{ "chu-de": string }>;
}) {
  const { "chu-de": chuDe } = await params;
  const theme = getThemeBySlug(chuDe);
  if (!theme) notFound();

  const quotes = await getQuotesByTheme(chuDe, 60);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: theme.seoTitle,
    description: theme.seoDescription,
    url: siteUrl(`/trich-dan/${chuDe}`),
    numberOfItems: quotes.length,
    itemListElement: quotes.slice(0, 20).map((q, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Quotation",
        text: q.content,
        spokenByCharacter: q.attribution || q.book?.title,
      },
    })),
  };

  // Get unique books with affiliate links for CTA
  const bookCtas = Array.from(
    new Map(
      quotes
        .filter((q) => q.book?.affiliateLinks?.[0]?.trackingSlug)
        .map((q) => [q.book!.slug, q.book!]),
    ).values(),
  ).slice(0, 3);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-stone-500">
          <Link href="/" className="hover:text-amber-900">Trang chủ</Link>
          {" / "}
          <Link href="/trich-dan" className="hover:text-amber-900">Trích dẫn</Link>
          {" / "}
          <span className="text-stone-700">{theme.name}</span>
        </nav>

        {/* Hero */}
        <div className="mt-8 max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="text-5xl">{theme.emoji}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
                Caption & Trích dẫn
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-stone-950 sm:text-4xl">
                {theme.name}
              </h1>
            </div>
          </div>
          <p className="mt-4 text-base leading-7 text-stone-600">{theme.description}</p>
          {quotes.length > 0 && (
            <p className="mt-2 text-sm text-stone-500">{quotes.length} câu trích dẫn từ sách</p>
          )}
        </div>

        {/* Quotes Grid */}
        {quotes.length > 0 ? (
          <div className="mt-10 columns-1 gap-5 sm:columns-2 lg:columns-3">
            {quotes.map((quote) => (
              <div
                key={quote.id}
                className="break-inside-avoid mb-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm"
              >
                {/* Quote content */}
                <blockquote className="text-base leading-7 text-stone-800 font-medium">
                  &ldquo;{quote.content}&rdquo;
                </blockquote>

                {/* Attribution */}
                <p className="mt-4 text-xs font-semibold text-amber-800">
                  — {quote.attribution || quote.book?.title || "Trích từ sách"}
                </p>

                {/* Action buttons */}
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <CopyButton content={quote.content} attribution={quote.attribution || quote.book?.title || ""} />
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(siteUrl(`/trich-dan/${chuDe}`))}&quote=${encodeURIComponent(`"${quote.content}" — ${quote.attribution || quote.book?.title || ""}`)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    Share Facebook
                  </a>

                  {/* Book link */}
                  {quote.book && (
                    <Link
                      href={`/sach/${quote.book.slug}`}
                      className="ml-auto text-xs text-stone-400 hover:text-amber-800"
                    >
                      {quote.book.title}
                    </Link>
                  )}
                </div>

                {/* Affiliate CTA */}
                {quote.book?.affiliateLinks?.[0]?.trackingSlug && (
                  <div className="mt-4 pt-4 border-t border-stone-100">
                    <AffiliateButton
                      trackingSlug={quote.book.affiliateLinks[0].trackingSlug}
                      label="Xem giá trên Shopee"
                      size="sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-16 text-center">
            <p className="text-stone-500">Chưa có trích dẫn nào trong chủ đề này.</p>
          </div>
        )}

        {/* Related books CTA section */}
        {bookCtas.length > 0 && (
          <div className="mt-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
              Sách trong chủ đề này
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {bookCtas.map((book) => (
                <Link
                  key={book.slug}
                  href={`/sach/${book.slug}`}
                  className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md"
                >
                  <p className="text-xs font-medium text-amber-800">{book.author}</p>
                  <h3 className="mt-1 font-semibold text-stone-950">{book.title}</h3>
                  <p className="mt-3 text-xs font-medium text-amber-900">Đọc review →</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Other themes */}
        <div className="mt-16">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-stone-500">
            Chủ đề khác
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {QUOTE_THEMES.filter((t) => t.slug !== chuDe).map((t) => (
              <Link
                key={t.slug}
                href={`/trich-dan/${t.slug}`}
                className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-300 hover:text-amber-900"
              >
                {t.emoji} {t.name}
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}

// Client-side Copy Button component (inline)
function CopyButton({ content, attribution }: { content: string; attribution: string }) {
  const text = attribution ? `"${content}"\n— ${attribution}` : `"${content}"`;
  return (
    <button
      type="button"
      data-copy={text}
      onClick={undefined}
      className="copy-btn rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
    >
      Copy caption
    </button>
  );
}
