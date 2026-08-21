import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QUOTE_THEMES } from "@/lib/quote-themes";
import {
  adminGenerateAllQuotes,
  adminGenerateQuotesForBook,
  adminDeleteQuote,
} from "@/lib/admin-quote-actions";
import { BookStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ theme?: string; success?: string; error?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const [quotes, books] = await Promise.all([
    prisma.quote.findMany({
      where: params.theme ? { themes: { has: params.theme } } : undefined,
      include: { book: { select: { title: true, slug: true } } },
      orderBy: [{ bookId: "asc" }, { order: "asc" }],
      take: 300,
    }),
    prisma.book.findMany({
      where: { status: BookStatus.ACTIVE },
      select: { id: true, title: true, _count: { select: { quotes: true } } },
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <AdminShell
      title="Trích dẫn & Quotes"
      description="Quản lý các câu trích dẫn từ sách dùng cho trang /trich-dan"
    >
      {/* Notice */}
      {params.success && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          ✅ {params.success}
        </div>
      )}
      {params.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ❌ {params.error}
        </div>
      )}

      {/* AI Generate Section */}
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">🤖 AI tạo Quotes tự động</h2>
        <p className="mt-1 text-sm text-stone-600">
          AI sẽ đọc nội dung từng cuốn sách và chắt lọc đúng 10 câu trích dẫn đắt giá, tâm đắc nhất phân theo chủ đề.
        </p>

        {/* Generate all */}
        <form action={adminGenerateAllQuotes} className="mt-5">
          <button
            type="submit"
            className="rounded-2xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-950"
          >
            ✨ Tạo quotes tất cả sách ({books.length} cuốn)
          </button>
        </form>

        {/* Generate per book */}
        {books.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-stone-900">{book.title}</p>
                  <p className="text-xs text-stone-500">{book._count.quotes} quotes hiện có</p>
                </div>
                <form action={adminGenerateQuotesForBook.bind(null, book.id)}>
                  <button
                    type="submit"
                    className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    Tạo
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Filter by theme */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/quotes"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            !params.theme
              ? "border-amber-800 bg-amber-800 text-white"
              : "border-stone-300 bg-white text-stone-700 hover:border-amber-300"
          }`}
        >
          Tất cả ({quotes.length})
        </Link>
        {QUOTE_THEMES.map((t) => (
          <Link
            key={t.slug}
            href={`/admin/quotes?theme=${t.slug}`}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              params.theme === t.slug
                ? "border-amber-800 bg-amber-800 text-white"
                : "border-stone-300 bg-white text-stone-700 hover:border-amber-300"
            }`}
          >
            {t.emoji} {t.name}
          </Link>
        ))}
      </div>

      {/* Quotes list */}
      <section className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        {quotes.length === 0 ? (
          <div className="p-10 text-center text-stone-500">
            Chưa có quotes nào. Bấm &ldquo;Tạo quotes tất cả sách&rdquo; để bắt đầu.
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {quotes.map((quote) => (
              <div key={quote.id} className="flex items-start gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-stone-800">
                    &ldquo;{quote.content}&rdquo;
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="text-xs text-stone-500">
                      {quote.book?.title || "Không rõ sách"}
                    </span>
                    {quote.themes.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <form action={adminDeleteQuote.bind(null, quote.id)}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    Xóa
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
