import type { AffiliateLink, Book, PainPoint } from "@prisma/client";
import { AffiliateButton } from "@/components/AffiliateButton";
import { BookCover } from "@/components/BookCover";
import { DisclosureBox } from "@/components/DisclosureBox";
import { HighlightText } from "@/components/HighlightText";

type TopListBook = Book & {
  painPoints: PainPoint[];
  affiliateLinks: AffiliateLink[];
};

export function TopListQuickGuide({
  books,
  highlightKeywords = [],
}: {
  books: TopListBook[];
  highlightKeywords?: string[];
}) {
  if (!books.length) return null;

  return (
    <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-amber-100 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Bảng chọn nhanh
      </p>
      <h2 className="mt-2 text-xl font-semibold text-stone-950">
        Nếu bạn đang mất phương hướng, bắt đầu từ trạng thái của mình
      </h2>
      <div className="mt-5 hidden overflow-hidden rounded-2xl border border-stone-200 md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
            <tr>
              <th className="px-4 py-3">Sách</th>
              <th className="px-4 py-3">Hợp khi bạn...</th>
              <th className="px-4 py-3">Nên đọc khi</th>
              <th className="px-4 py-3">Cân nhắc</th>
              <th className="px-4 py-3">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {books.map((book) => (
              <tr key={book.id} className="align-top">
                <td className="px-4 py-4 font-semibold text-stone-950">
                  <div className="flex items-center gap-3">
                    <BookCover
                      title={book.title}
                      coverImage={book.coverImage}
                      className="relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 via-stone-100 to-emerald-100 px-2 text-center text-[0.62rem] font-semibold text-stone-700"
                    />
                    <span>{book.title}</span>
                  </div>
                </td>
                <td className="px-4 py-4 leading-6 text-stone-700">
                  <HighlightText text={choiceLine(book).fit} keywords={highlightKeywords} />
                </td>
                <td className="px-4 py-4 leading-6 text-stone-700">
                  <HighlightText text={choiceLine(book).when} keywords={highlightKeywords} />
                </td>
                <td className="px-4 py-4 leading-6 text-stone-600">
                  <HighlightText text={book.cons[0] || "Cần đọc chọn lọc."} keywords={highlightKeywords} />
                </td>
                <td className="px-4 py-4">
                  <AffiliateButton
                    trackingSlug={book.affiliateLinks[0]?.trackingSlug}
                    label="Xem"
                    size="sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-5 grid gap-3 md:hidden">
        {books.map((book) => (
          <article key={book.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex gap-3">
              <BookCover
                title={book.title}
                coverImage={book.coverImage}
                className="relative flex h-20 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-100 via-stone-100 to-emerald-100 px-2 text-center text-[0.62rem] font-semibold text-stone-700"
              />
              <div>
                <h3 className="font-semibold text-stone-950">{book.title}</h3>
                <p className="mt-1 text-xs text-stone-500">{book.author}</p>
              </div>
            </div>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              <HighlightText text={choiceLine(book).fit} keywords={highlightKeywords} />
            </p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              <span className="font-medium text-stone-800">Nên đọc khi: </span>
              <HighlightText text={choiceLine(book).when} keywords={highlightKeywords} />
            </p>
            <div className="mt-3">
              <AffiliateButton
                trackingSlug={book.affiliateLinks[0]?.trackingSlug}
                label="Xem sách"
                size="sm"
              />
            </div>
          </article>
        ))}
      </div>
      <div className="mt-5">
        <DisclosureBox />
      </div>
    </section>
  );
}

export function TopListFinalCta({
  books,
  highlightKeywords = [],
}: {
  books: TopListBook[];
  highlightKeywords?: string[];
}) {
  if (!books.length) return null;

  const firstBook = books[0];

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="text-lg font-semibold text-stone-950">
        Nếu bạn chỉ chọn một cuốn để bắt đầu
      </h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">
        <HighlightText
          text={`Hãy chọn ${firstBook.title} nếu bạn cần một điểm tựa nhẹ trước. Sau đó, quay lại danh sách này và chọn cuốn tiếp theo theo đúng vấn đề đang nổi lên rõ nhất.`}
          keywords={highlightKeywords}
        />
      </p>
      <div className="mt-4">
        <AffiliateButton
          trackingSlug={firstBook.affiliateLinks[0]?.trackingSlug}
          label={`Xem ${firstBook.title}`}
          sublabel="Một điểm bắt đầu nhẹ để tự cân nhắc"
          size="lg"
          fullWidth
        />
      </div>
      <div className="mt-4">
        <DisclosureBox />
      </div>
    </section>
  );
}

export function TopListSituationPicker({
  books,
}: {
  books: TopListBook[];
}) {
  if (!books.length) return null;

  const situations = [
    {
      title: "Cần hành động ngay",
      description: "Bạn muốn có một cú hích nhỏ để bắt đầu việc đã trì hoãn.",
      book: findBook(books, ["đời ngắn", "atomic"]) || books[0],
    },
    {
      title: "Cần chữa lành",
      description: "Bạn cần một câu chuyện làm mình dịu lại trước khi lập kế hoạch.",
      book: findBook(books, ["nhà giả kim", "dám bị ghét"]) || books[0],
    },
    {
      title: "Cần kỷ luật",
      description: "Bạn muốn biến cảm hứng thành một hệ thống nhỏ có thể lặp lại.",
      book: findBook(books, ["atomic habits", "atomic"]) || books[0],
    },
    {
      title: "Cần giao tiếp tốt hơn",
      description: "Bạn muốn bớt lạc lõng trong cách nói chuyện và kết nối.",
      book: findBook(books, ["đắc nhân tâm"]) || books[0],
    },
  ];

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Chọn theo tình huống
      </p>
      <h2 className="mt-2 text-xl font-semibold text-stone-950">
        Nếu bạn chỉ chọn một cuốn theo điều đang cần nhất
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {situations.map((situation) => (
          <div key={situation.title} className="rounded-2xl bg-stone-50 p-4">
            <h3 className="text-sm font-semibold text-stone-950">{situation.title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              {situation.description}
            </p>
            <p className="mt-3 text-sm font-semibold text-stone-900">
              Gợi ý: {situation.book.title}
            </p>
            <div className="mt-3">
              <AffiliateButton
                trackingSlug={situation.book.affiliateLinks[0]?.trackingSlug}
                label="Xem sách này"
                size="sm"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <DisclosureBox />
      </div>
    </section>
  );
}

function choiceLine(book: TopListBook) {
  const title = book.title.toLocaleLowerCase("vi");

  if (title.includes("nhà giả kim")) {
    return {
      fit: "Bạn đang mất phương hướng và cần một câu chuyện để lắng nghe lại điều mình thật sự muốn.",
      when: "Bạn cần dịu lại trước khi lập kế hoạch.",
    };
  }
  if (title.includes("đời ngắn")) {
    return {
      fit: "Bạn đang lười bắt đầu, thiếu một cú hích nhỏ và muốn đọc nhanh.",
      when: "Bạn cần đứng dậy làm một việc nhỏ hôm nay.",
    };
  }
  if (title.includes("atomic habits")) {
    return {
      fit: "Bạn thấy mình thiếu kỷ luật vì đời sống đang thiếu hệ thống.",
      when: "Bạn muốn biến cảm hứng thành hành động lặp lại được.",
    };
  }
  if (title.includes("dám bị ghét")) {
    return {
      fit: "Bạn overthinking vì ánh nhìn người khác và mệt vì luôn cần được công nhận.",
      when: "Bạn cần tách kỳ vọng của người khác khỏi lựa chọn của mình.",
    };
  }
  if (title.includes("đắc nhân tâm")) {
    return {
      fit: "Bạn muốn cải thiện giao tiếp và bớt cảm giác lạc lõng trong công việc.",
      when: "Bạn cần nhìn lại cách mình kết nối với người xung quanh.",
    };
  }

  return {
    fit: book.suitableFor[0] || "Bạn muốn tìm một góc nhìn vừa đủ gần với vấn đề hiện tại.",
    when: book.keyLessons[0] || "Bạn cần một điểm tựa để đọc chậm và tự đối thoại.",
  };
}

function findBook(books: TopListBook[], needles: string[]) {
  return books.find((book) => {
    const title = book.title.toLocaleLowerCase("vi");
    return needles.some((needle) => title.includes(needle));
  });
}
