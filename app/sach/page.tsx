import type { Prisma } from "@prisma/client";
import { BookStatus } from "@prisma/client";
import { BookCard } from "@/components/BookCard";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { pageMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";

export const metadata = pageMetadata({
  title: "Thư viện sách",
  description:
    "Danh sách sách được Trạm Đọc Một Chút phân loại theo chủ đề, nỗi đau và đối tượng đọc.",
  path: "/sach",
});

const pageSize = 12;

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    painPoint?: string;
    audience?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page || 1));
  const where: Prisma.BookWhereInput = {
    status: BookStatus.ACTIVE,
    ...(params.category
      ? { categories: { some: { slug: params.category } } }
      : {}),
    ...(params.painPoint
      ? { painPoints: { some: { slug: params.painPoint } } }
      : {}),
    ...(params.audience
      ? { audiences: { some: { slug: params.audience } } }
      : {}),
  };

  const [books, total, categories, painPoints, audiences] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { painPoints: true },
    }),
    prisma.book.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
          Thư viện sách
        </p>
        <h1 className="mt-3 text-4xl font-semibold text-stone-950">
          Chọn sách theo vấn đề đang gặp
        </h1>
        <p className="mt-4 leading-7 text-stone-700">
          Đây không phải shop sách. Mỗi cuốn được đặt trong bối cảnh người đọc:
          đang mắc kẹt ở đâu, cần đọc để hiểu điều gì, và nên cân nhắc gì trước
          khi mua.
        </p>
      </section>

      <div className="mt-8">
        <FilterBar
          categories={categories}
          painPoints={painPoints}
          audiences={audiences}
          basePath="/sach"
        />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>

      {!books.length ? (
        <p className="mt-10 rounded-3xl border border-stone-200 bg-white p-8 text-stone-600">
          Chưa có sách phù hợp với bộ lọc này.
        </p>
      ) : null}

      <Pagination
        page={page}
        totalPages={Math.ceil(total / pageSize)}
        basePath="/sach"
        searchParams={params}
      />
    </main>
  );
}
