import Link from "next/link";
import type { Book } from "@prisma/client";

type StepArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
};

type StepBook = Book & {
  painPoints?: { id: string; name: string; slug: string }[];
};

export function ReaderNextSteps({
  painPointName,
  audienceName,
  samePainArticles,
  sameAudienceArticles,
  sameBookArticles,
  books,
}: {
  painPointName?: string;
  audienceName?: string;
  samePainArticles: StepArticle[];
  sameAudienceArticles: StepArticle[];
  sameBookArticles: StepArticle[];
  books: StepBook[];
}) {
  const sections = [
    {
      title: painPointName
        ? `Nếu bạn muốn hiểu sâu hơn về ${painPointName.toLowerCase()}`
        : "Nếu bạn muốn gọi tên vấn đề rõ hơn",
      description:
        "Những bài này giúp bạn nhìn lại vấn đề từ nhiều góc hơn, trước khi vội chọn một cuốn sách.",
      items: samePainArticles,
    },
    {
      title: audienceName
        ? `Nếu bạn thấy mình thuộc nhóm ${audienceName.toLowerCase()}`
        : "Nếu bạn cần một bối cảnh gần với mình hơn",
      description:
        "Cùng một cuốn sách có thể khác đi rất nhiều khi đặt vào công việc, tuổi đời và nhịp sống cụ thể.",
      items: sameAudienceArticles,
    },
    {
      title: "Nếu bạn muốn đọc thêm quanh cuốn sách này",
      description:
        "Các góc nhìn khác giúp bạn kiểm tra xem cuốn sách có thật sự hợp với câu hỏi đang mang theo không.",
      items: sameBookArticles,
    },
  ].filter((section) => section.items.length);

  if (!sections.length && !books.length) return null;

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-emerald-100 bg-[#f8fff8] p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
        Đọc tiếp theo trạng thái của bạn
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">
        Lần sau quay lại, bạn có thể đọc tiếp từ đây
      </h2>
      <p className="mt-3 text-sm leading-6 text-stone-700">
        Nếu bài này chạm đúng một phần vấn đề của bạn, đừng cố đọc quá nhiều
        cùng lúc. Hãy chọn một nhánh gần nhất với điều bạn đang cần.
      </p>

      <div className="mt-5 space-y-4">
        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl bg-white p-4">
            <h3 className="text-sm font-semibold text-stone-950">{section.title}</h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">{section.description}</p>
            <div className="mt-3 space-y-3">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/bai-viet/${item.slug}`}
                  className="block rounded-2xl border border-stone-200 bg-stone-50 p-3 transition hover:border-amber-200 hover:bg-amber-50"
                >
                  <span className="text-sm font-semibold text-stone-950">
                    {item.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-600">
                    {item.excerpt}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {books.length ? (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-stone-950">
            Nếu muốn chuyển từ đọc bài sang chọn sách
          </h3>
          <div className="mt-3 grid gap-4">
            {books.slice(0, 2).map((book) => (
              <Link
                key={book.id}
                href={`/sach/${book.slug}`}
                className="block rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-amber-200 hover:bg-amber-50"
              >
                <span className="text-sm font-semibold text-stone-950">{book.title}</span>
                <span className="mt-1 block text-xs text-stone-500">{book.author}</span>
                <span className="mt-2 line-clamp-2 block text-sm leading-6 text-stone-600">
                  {book.description}
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
