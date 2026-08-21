import Link from "next/link";
import { ArticleType, BookStatus, ArticleStatus } from "@prisma/client";
import { ArticleCard } from "@/components/ArticleCard";
import { BookCard } from "@/components/BookCard";
import { DatabaseSetupNotice } from "@/components/DatabaseSetupNotice";
import { PainPointCard } from "@/components/PainPointCard";
import { SearchBar } from "@/components/SearchBar";
import { SubscribeForm } from "@/components/SubscribeForm";
import { isDatabaseConfigured } from "@/lib/db-ready";
import { prisma } from "@/lib/prisma";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 600;

export const metadata = pageMetadata({
  title: "Tìm đúng cuốn sách cho giai đoạn bạn đang đi qua",
  description: "Review sách theo cảm xúc, nỗi đau và những câu chuyện đời thường.",
  path: "/",
});

export default async function HomePage() {
  if (!isDatabaseConfigured()) {
    return <DatabaseSetupNotice />;
  }

  const [painPoints, latestArticles, suggestedBooks, topLists] = await Promise.all([
    prisma.painPoint.findMany({
      where: {
        slug: {
          in: [
            "mat-phuong-huong",
            "tri-hoan",
            "overthinking",
            "burnout",
            "sau-chia-tay",
            "thieu-ky-luat",
            "giao-tiep-kem",
            "tai-chinh-ca-nhan",
          ],
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      include: { categories: true, painPoints: true },
    }),
    prisma.book.findMany({
      where: { status: BookStatus.ACTIVE },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { painPoints: true },
    }),
    prisma.article.findMany({
      where: { status: ArticleStatus.PUBLISHED, type: ArticleType.TOP_LIST },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 3,
      include: { categories: true, painPoints: true },
    }),
  ]);

  return (
    <div>
      <section className="bg-[#fffaf2]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-20 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
              Blog review sách
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
              Tìm đúng cuốn sách cho giai đoạn bạn đang đi qua
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-700">
              Review sách theo cảm xúc, nỗi đau và những câu chuyện đời thường.
            </p>
            <div className="mt-8 hidden max-w-2xl md:block">
              <SearchBar />
            </div>
            <form action="/tim-kiem" className="mt-4 max-w-2xl rounded-3xl border border-amber-100 bg-white p-3 shadow-sm">
              <input type="hidden" name="mode" value="pain" />
              <label className="block px-2 pb-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
                Mô tả tình trạng của bạn
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  name="q"
                  placeholder="VD: tôi hay trì hoãn, biết phải làm nhưng không bắt đầu"
                  className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
                />
                <button className="rounded-2xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-stone-950">
                  Gợi ý hướng đọc
                </button>
              </div>
            </form>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/bat-dau"
                className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900"
              >
                Làm quiz chọn sách
              </Link>
              <Link
                href="/bai-viet-da-luu"
                className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 hover:border-amber-300 hover:text-amber-900"
              >
                Xem bài đã lưu
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-stone-500">Gợi ý hôm nay</p>
            <div className="mt-5 space-y-4">
              {suggestedBooks.slice(0, 2).map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
                Nếu bạn chỉ có 10 phút
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-stone-950">
                Đừng chọn sách theo độ nổi tiếng, hãy chọn theo trạng thái
              </h2>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Quiz ngắn sẽ gợi ý một bài nên đọc trước, hai cuốn sách phù hợp
                và một cụm nội dung để bạn quay lại khi cần đọc sâu hơn.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                "Đang mất phương hướng",
                "Đang trì hoãn quá lâu",
                "Đang overthinking",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-stone-50 p-4 text-sm font-medium text-stone-800">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <Link
            href="/bat-dau"
            className="mt-5 inline-flex rounded-full bg-amber-800 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-950"
          >
            Bắt đầu chọn sách
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
              Bạn đang cần gì?
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-stone-950">
              Chọn theo nỗi đau đang gặp
            </h2>
          </div>
          <Link href="/bai-viet" className="hidden text-sm font-medium text-amber-900 sm:block">
            Xem tất cả
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {painPoints.map((painPoint) => (
            <PainPointCard key={painPoint.id} {...painPoint} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-800">
            Lộ trình đọc theo giai đoạn
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ReadingPathStep
              title="1. Gọi tên vấn đề"
              description="Bắt đầu bằng bài viết chạm đúng nỗi đau, để biết mình đang tìm gì."
            />
            <ReadingPathStep
              title="2. Chọn một cuốn gần nhất"
              description="Đọc phần điểm mạnh, điểm hạn chế và ai không nên đọc trước khi mua."
            />
            <ReadingPathStep
              title="3. Quay lại đọc tiếp"
              description="Lưu bài hoặc đi theo cụm nỗi đau để không bị lạc giữa quá nhiều sách."
            />
          </div>
        </div>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-3xl font-semibold text-stone-950">Bài mới nhất</h2>
          <Link href="/bai-viet" className="text-sm font-medium text-amber-900">
            Xem thêm
          </Link>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {latestArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      <section className="bg-white/70">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold text-stone-950">
              Sách được gợi ý nhiều
            </h2>
            <div className="mt-6 grid gap-4">
              {suggestedBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-stone-950">
              Top list nổi bật
            </h2>
            <div className="mt-6 grid gap-4">
              {topLists.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <SubscribeForm source="homepage" />
      </section>
    </div>
  );
}

function ReadingPathStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <h3 className="font-semibold text-stone-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
    </div>
  );
}
