import type { Prisma } from "@prisma/client";
import { ArticleStatus, BookStatus } from "@prisma/client";
import Link from "next/link";
import { ArticleCard } from "@/components/ArticleCard";
import { BookCard } from "@/components/BookCard";
import { SearchBar } from "@/components/SearchBar";
import { discoverByPainQuery } from "@/lib/pain-discovery";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return pageMetadata({
    title: q ? `Tìm kiếm: ${q}` : "Tìm kiếm",
    description: "Tìm bài viết và sách theo tên sách, chủ đề, nỗi đau hoặc đối tượng đọc.",
    path: q ? `/tim-kiem?q=${encodeURIComponent(q)}` : "/tim-kiem",
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: string }>;
}) {
  const { q = "", mode = "" } = await searchParams;
  const query = q.trim();

  const articleWhere: Prisma.ArticleWhereInput = query
    ? {
        status: ArticleStatus.PUBLISHED,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { content: { contains: query, mode: "insensitive" } },
          { focusKeyword: { contains: query, mode: "insensitive" } },
          { painPoints: { some: { name: { contains: query, mode: "insensitive" } } } },
          { categories: { some: { name: { contains: query, mode: "insensitive" } } } },
          { audiences: { some: { name: { contains: query, mode: "insensitive" } } } },
          { books: { some: { book: { title: { contains: query, mode: "insensitive" } } } } },
        ],
      }
    : { status: ArticleStatus.PUBLISHED };

  const bookWhere: Prisma.BookWhereInput = query
    ? {
        status: BookStatus.ACTIVE,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { author: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { painPoints: { some: { name: { contains: query, mode: "insensitive" } } } },
          { categories: { some: { name: { contains: query, mode: "insensitive" } } } },
        ],
      }
    : { status: BookStatus.ACTIVE };

  const [articles, books, painPoints, audiences, discoveryArticles, discoveryBooks] = query
    ? await Promise.all([
        prisma.article.findMany({
          where: articleWhere,
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: 12,
          include: { categories: true, painPoints: true },
        }),
        prisma.book.findMany({
          where: bookWhere,
          take: 8,
          include: { painPoints: true },
        }),
        prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
        prisma.audience.findMany({ orderBy: { name: "asc" } }),
        prisma.article.findMany({
          where: { status: ArticleStatus.PUBLISHED },
          orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
          take: 60,
          include: { categories: true, painPoints: true, audiences: true },
        }),
        prisma.book.findMany({
          where: { status: BookStatus.ACTIVE },
          take: 40,
          include: { painPoints: true, audiences: true },
        }),
      ])
    : [[], [], [], [], [], []];

  const discovery = query
    ? discoverByPainQuery({
        query,
        painPoints,
        audiences,
        articles: discoveryArticles,
        books: discoveryBooks,
      })
    : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold text-stone-950">Tìm kiếm</h1>
      <div className="mt-6 max-w-2xl">
        <SearchBar defaultValue={query} />
      </div>
      <form action="/tim-kiem" className="mt-4 max-w-3xl rounded-3xl border border-amber-100 bg-white p-4 shadow-sm">
        <input type="hidden" name="mode" value="pain" />
        <label className="text-sm font-semibold text-stone-950">
          Mô tả tình trạng của bạn
        </label>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            defaultValue={mode === "pain" ? query : ""}
            placeholder="VD: tôi hay trì hoãn, biết phải làm nhưng không bắt đầu"
            className="min-w-0 flex-1 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
          <button className="rounded-2xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-950">
            Tìm theo nỗi đau
          </button>
        </div>
      </form>

      {query ? (
        <>
          {discovery?.painPoint || discovery?.articles.length || discovery?.books.length ? (
            <section className="mt-10 rounded-3xl border border-emerald-100 bg-[#f8fbf6] p-5 shadow-sm sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                Gợi ý theo mô tả của bạn
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                {discovery.painPoint ? (
                  <>
                    Có vẻ bạn đang chạm tới:{" "}
                    <Link
                      href={`/noi-dau/${discovery.painPoint.slug}`}
                      className="text-emerald-900 underline decoration-emerald-300 underline-offset-4"
                    >
                      {discovery.painPoint.name}
                    </Link>
                  </>
                ) : (
                  "Một vài hướng đọc gần với câu bạn nhập"
                )}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
                Kết quả này được match bằng từ khóa, pain point, audience và dữ liệu sách hiện có.
                Nó giúp bạn bắt đầu từ vấn đề thật, rồi mới chọn bài hoặc sách phù hợp.
              </p>
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold text-stone-950">
                    2 bài nên đọc trước
                  </h3>
                  <div className="mt-3 grid gap-3">
                    {discovery.articles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                    {!discovery.articles.length ? (
                      <p className="rounded-2xl bg-white p-4 text-sm text-stone-600">
                        Chưa có bài đủ gần. Hãy thử mô tả cụ thể hơn một chút.
                      </p>
                    ) : null}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-stone-950">
                    2 sách nên cân nhắc
                  </h3>
                  <div className="mt-3 grid gap-3">
                    {discovery.books.map((book) => (
                      <BookCard key={book.id} book={book} />
                    ))}
                    {!discovery.books.length ? (
                      <p className="rounded-2xl bg-white p-4 text-sm text-stone-600">
                        Chưa có sách match đủ tốt. Bạn có thể xem danh sách kết quả bên dưới.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-2xl font-semibold text-stone-950">
              Bài viết phù hợp
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-2xl font-semibold text-stone-950">Sách phù hợp</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </section>
        </>
      ) : (
        <p className="mt-8 rounded-3xl border border-stone-200 bg-white p-6 text-stone-600">
          Nhập tên sách, vấn đề hoặc nhóm người đọc để bắt đầu.
        </p>
      )}
    </div>
  );
}
