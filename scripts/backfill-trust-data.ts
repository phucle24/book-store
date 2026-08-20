import { ArticleSourceKind, ArticleStatus, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const bookScores: Record<
  string,
  {
    editorialScore: number;
    scoreBreakdown: Record<string, number>;
  }
> = {
  "atomic-habits": {
    editorialScore: 4.6,
    scoreBreakdown: { practical: 4.9, depth: 4.1, readability: 4.4, value: 4.7 },
  },
  "doi-ngan-dung-ngu-dai": {
    editorialScore: 4.0,
    scoreBreakdown: { practical: 3.8, depth: 3.4, readability: 4.6, value: 4.0 },
  },
  "nha-gia-kim": {
    editorialScore: 4.2,
    scoreBreakdown: { practical: 3.4, depth: 4.0, readability: 4.7, value: 4.2 },
  },
  "dac-nhan-tam": {
    editorialScore: 4.1,
    scoreBreakdown: { practical: 4.2, depth: 3.6, readability: 4.1, value: 4.3 },
  },
  "dam-bi-ghet": {
    editorialScore: 4.3,
    scoreBreakdown: { practical: 3.8, depth: 4.6, readability: 4.0, value: 4.4 },
  },
};

async function main() {
  for (const [slug, data] of Object.entries(bookScores)) {
    await prisma.book.updateMany({
      where: { slug },
      data,
    });
  }

  const articles = await prisma.article.findMany({
    where: { status: ArticleStatus.PUBLISHED },
    include: {
      books: {
        orderBy: { order: "asc" },
        include: { book: true },
      },
      sources: true,
    },
  });

  for (const article of articles) {
    const mainBook =
      article.books.find((item) => item.role === "MAIN")?.book || article.books[0]?.book;
    const score = article.verdictScore || mainBook?.editorialScore || 4;

    await prisma.article.update({
      where: { id: article.id },
      data: {
        verdictScore: score,
        verdictSummary:
          article.verdictSummary ||
          verdictSummary(article.title, mainBook?.title, score),
      },
    });
  }

  console.log(`Backfilled trust data for ${articles.length} published articles.`);
}

function verdictSummary(title: string, bookTitle?: string, score?: number) {
  if (title.toLocaleLowerCase("vi").includes("5 cuốn sách")) {
    return "Một top-list nên dùng như bản đồ chọn điểm bắt đầu, không phải danh sách phải mua hết.";
  }

  if (!bookTitle) {
    return "Bài viết đáng đọc nếu bạn muốn có thêm một góc nhìn trước khi chọn sách.";
  }

  return `${bookTitle} đáng cân nhắc nếu vấn đề trong bài đang gần với bạn; điểm ${score?.toFixed(1)}/5 phản ánh đánh giá biên tập, không phải rating sàn.`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
