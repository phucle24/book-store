import type { Prisma } from "@prisma/client";
import { ArticleStatus, BookStatus } from "@prisma/client";
import { ArticleCard } from "@/components/ArticleCard";
import { BookCard } from "@/components/BookCard";
import { SearchBar } from "@/components/SearchBar";
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
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
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

  const [articles, books] = query
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
      ])
    : [[], []];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold text-stone-950">Tìm kiếm</h1>
      <div className="mt-6 max-w-2xl">
        <SearchBar defaultValue={query} />
      </div>

      {query ? (
        <>
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
