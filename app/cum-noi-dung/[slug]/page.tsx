import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleStatus, BookStatus } from "@prisma/client";
import { ArticleCard } from "@/components/ArticleCard";
import { BookCard } from "@/components/BookCard";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cluster = await prisma.contentCluster.findUnique({ where: { slug } });

  return pageMetadata({
    title: cluster?.name || "Cụm nội dung đọc sách",
    description:
      cluster?.description ||
      "Lộ trình bài viết và sách được gom theo một nỗi đau, đối tượng hoặc chủ đề cụ thể.",
    path: `/cum-noi-dung/${slug}`,
  });
}

export default async function ContentClusterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cluster = await prisma.contentCluster.findUnique({
    where: { slug },
    include: {
      category: true,
      painPoint: true,
      audience: true,
      pillarArticle: { include: { categories: true, painPoints: true } },
      articles: {
        where: { status: ArticleStatus.PUBLISHED },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        include: { categories: true, painPoints: true },
      },
    },
  });

  if (!cluster) notFound();

  const relatedBookOr: Prisma.BookWhereInput[] = [];
  if (cluster.categoryId) {
    relatedBookOr.push({ categories: { some: { id: cluster.categoryId } } });
  }
  if (cluster.painPointId) {
    relatedBookOr.push({ painPoints: { some: { id: cluster.painPointId } } });
  }
  if (cluster.audienceId) {
    relatedBookOr.push({ audiences: { some: { id: cluster.audienceId } } });
  }
  const relatedBooks = await prisma.book.findMany({
    where: {
      status: BookStatus.ACTIVE,
      ...(relatedBookOr.length ? { OR: relatedBookOr } : {}),
    },
    include: { painPoints: true },
    take: 8,
  });
  const articles = cluster.articles.filter((article) => article.id !== cluster.pillarArticleId);
  const guideTags = [cluster.painPoint, cluster.audience, cluster.category].filter(Boolean);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="text-sm text-stone-500">
        <Link href="/" className="hover:text-amber-900">
          Trang chủ
        </Link>{" "}
        / Cụm nội dung
      </nav>
      <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
        Content cluster
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
        {cluster.name}
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
        {cluster.description ||
          "Một mạch đọc được gom lại để bạn đi từ nhận diện vấn đề, đọc review sâu, rồi chọn sách phù hợp hơn."}
      </p>
      {guideTags.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {guideTags.map((tag) =>
            tag ? (
              <span
                key={tag.id}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-stone-700"
              >
                {tag.name}
              </span>
            ) : null,
          )}
        </div>
      ) : null}

      {cluster.pillarArticle ? (
        <section className="mt-10 rounded-3xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            Nên đọc đầu tiên
          </p>
          <div className="mt-4 max-w-2xl">
            <ArticleCard article={cluster.pillarArticle} />
          </div>
        </section>
      ) : null}

      <section className="mt-12">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Lộ trình đọc
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">
          Đi từ bài nền đến review cụ thể
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
        {!articles.length ? (
          <p className="mt-5 rounded-3xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            Cụm này chưa có bài published ngoài pillar. Hãy thêm bài từ admin
            content planner.
          </p>
        ) : null}
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-stone-950">Sách liên quan</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {relatedBooks.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      </section>
    </div>
  );
}
