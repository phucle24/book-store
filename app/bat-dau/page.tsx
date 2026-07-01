import { ArticleStatus, BookStatus } from "@prisma/client";
import { BookQuiz } from "@/components/BookQuiz";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Bắt đầu chọn sách",
  description: "Quiz nhẹ giúp bạn chọn bài review và sách phù hợp với giai đoạn hiện tại.",
  path: "/bat-dau",
});

export default async function StartHerePage() {
  const [painPoints, audiences, articles, books] = await Promise.all([
    prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 24,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        readingTime: true,
        painPoints: { select: { id: true, name: true, slug: true, description: true } },
        audiences: { select: { id: true, name: true, slug: true, description: true } },
      },
    }),
    prisma.book.findMany({
      where: { status: BookStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: {
        id: true,
        title: true,
        slug: true,
        author: true,
        description: true,
        suitableFor: true,
        keyLessons: true,
        painPoints: { select: { id: true, name: true, slug: true, description: true } },
        audiences: { select: { id: true, name: true, slug: true, description: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
        Bắt đầu từ giai đoạn của bạn
      </p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
        Chọn một cuốn sách bằng vài tín hiệu thật gần
      </h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">
        Không phải lúc nào ta cũng biết mình cần đọc gì. Quiz này giúp bạn bắt
        đầu từ nỗi đau, bối cảnh và mục tiêu gần nhất, rồi gợi ý một mạch đọc
        đủ nhẹ để thử trước.
      </p>
      <div className="mt-8">
        <BookQuiz
          painPoints={painPoints}
          audiences={audiences}
          articles={articles}
          books={books}
        />
      </div>
    </div>
  );
}
