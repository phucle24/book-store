import type { Metadata } from "next";
import Link from "next/link";
import { QUOTE_THEMES } from "@/lib/quote-themes";
import { getQuoteCountsByTheme } from "@/lib/quote-actions";
import { siteUrl } from "@/lib/seo";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Trích dẫn sách hay & Caption ý nghĩa | Trạm Đọc Một Chút",
  description:
    "Tổng hợp những câu trích dẫn hay nhất từ sách — dùng ngay làm caption Facebook, TikTok. Phân theo chủ đề: tình yêu, tuổi trẻ, động lực, chữa lành.",
  alternates: { canonical: siteUrl("/trich-dan") },
  openGraph: {
    title: "Trích dẫn sách hay & Caption ý nghĩa",
    description: "Câu trích dẫn từ sách theo chủ đề — dùng ngay cho mạng xã hội.",
    url: siteUrl("/trich-dan"),
  },
};

export default async function TrichDanIndexPage() {
  const counts = await getQuoteCountsByTheme();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Trích dẫn sách hay & Caption ý nghĩa",
    description: "Câu trích dẫn từ sách phân theo chủ đề",
    url: siteUrl("/trich-dan"),
    hasPart: QUOTE_THEMES.map((theme) => ({
      "@type": "WebPage",
      name: theme.name,
      url: siteUrl(`/trich-dan/${theme.slug}`),
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
            Trích dẫn & Caption
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
            Caption từ sách — Ý nghĩa thật sự
          </h1>
          <p className="mt-5 text-lg leading-8 text-stone-600">
            Không phải câu nói ngẫu nhiên. Là những đoạn từ sách đã chạm vào hàng triệu người —
            dùng được ngay cho Facebook, TikTok hay Instagram.
          </p>
        </div>

        {/* Theme Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {QUOTE_THEMES.map((theme) => {
            const count = counts[theme.slug] || 0;
            return (
              <Link
                key={theme.slug}
                href={`/trich-dan/${theme.slug}`}
                className="group relative overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-md"
              >
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{theme.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold text-stone-950 group-hover:text-amber-900">
                      {theme.name}
                    </h2>
                    {count > 0 && (
                      <p className="mt-1 text-sm text-stone-500">{count} câu trích dẫn</p>
                    )}
                    <p className="mt-3 text-sm leading-6 text-stone-600 line-clamp-2">
                      {theme.description}
                    </p>
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-2 text-sm font-medium text-amber-800 group-hover:text-amber-900">
                  Xem tất cả
                  <svg className="h-4 w-4 transition group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-3xl border border-amber-100 bg-amber-50 p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
            Tìm sách phù hợp
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">
            Những câu hay nhất đều đến từ sách hay
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Đọc review chi tiết trước khi mua — để biết cuốn sách có thật sự hợp với bạn không.
          </p>
          <Link
            href="/sach"
            className="mt-6 inline-flex rounded-full bg-amber-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-950"
          >
            Xem danh sách sách
          </Link>
        </div>
      </main>
    </>
  );
}
