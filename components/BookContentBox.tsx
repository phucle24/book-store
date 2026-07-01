import type { Book } from "@prisma/client";
import { HighlightText } from "@/components/HighlightText";

export function BookContentBox({
  book,
  highlightKeywords = [],
}: {
  book: Book;
  highlightKeywords?: string[];
}) {
  const keyLessons = book.keyLessons.slice(0, 3);
  const suitableFor = book.suitableFor.slice(0, 3);
  const pros = book.pros.slice(0, 3);
  const hasContent =
    book.description || keyLessons.length || suitableFor.length || pros.length;

  if (!hasContent) return null;

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-amber-100 bg-[#fffaf2] p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Một chút về nội dung sách
      </p>
      <h2 className="mt-2 text-xl font-semibold text-stone-950">
        {book.title} nói về điều gì?
      </h2>
      {book.description ? (
        <p className="mt-3 text-sm leading-7 text-stone-700">
          <HighlightText text={book.description} keywords={highlightKeywords} />
        </p>
      ) : null}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/80 p-4">
          <p className="text-sm font-semibold text-stone-900">Thông tin nhanh</p>
          <dl className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
            <div>
              <dt className="inline text-stone-500">Tác giả: </dt>
              <dd className="inline font-medium text-stone-800">{book.author}</dd>
            </div>
            {book.publisher ? (
              <div>
                <dt className="inline text-stone-500">Nhà xuất bản: </dt>
                <dd className="inline font-medium text-stone-800">{book.publisher}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <InfoMiniList
          title="Phù hợp nếu bạn..."
          items={suitableFor}
          highlightKeywords={highlightKeywords}
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <InfoMiniList
          title="Một vài ý chính"
          items={keyLessons}
          highlightKeywords={highlightKeywords}
        />
        <InfoMiniList
          title="Điểm đáng chú ý"
          items={pros}
          highlightKeywords={highlightKeywords}
        />
      </div>
    </section>
  );
}

export function BookReadingPrelude({
  book,
  highlightKeywords = [],
}: {
  book: Book;
  highlightKeywords?: string[];
}) {
  const reflectiveNotes = bookReflectionNotes(book);
  if (!reflectiveNotes.length) return null;

  return (
    <section className="article-content mb-8 border-b border-amber-100 pb-7">
      <h2 className="article-prelude-title">Góc đọc gợi mở</h2>
      <p className="text-stone-600">
        Trước khi đi vào phần review chi tiết, hãy thử đọc cuốn sách này từ một
        điểm chạm gần hơn.
      </p>
      <div className="space-y-3">
        {reflectiveNotes.map((note) => (
          <p key={note}>
            <HighlightText text={note} keywords={highlightKeywords} />
          </p>
        ))}
      </div>
    </section>
  );
}

export function BookReadingQuestions({
  book,
  highlightKeywords = [],
}: {
  book: Book;
  highlightKeywords?: string[];
}) {
  const questions = readingQuestions(book);
  if (!questions.length) return null;

  return (
    <section className="article-content mt-8 border-t border-stone-200 pt-6">
      <h3>Trước khi đọc, thử giữ lại vài câu hỏi</h3>
      <ul>
        {questions.map((question) => (
          <li key={question}>
            <HighlightText text={question} keywords={highlightKeywords} />
          </li>
        ))}
      </ul>
      <p className="text-stone-600">
        Đây là vài câu hỏi để đọc chậm hơn, không phải kết luận thay bạn. Một
        cuốn sách hay chỉ thật sự có ích khi nó gặp đúng câu hỏi mà bạn đang
        mang theo.
      </p>
    </section>
  );
}

function bookReflectionNotes(book: Book) {
  const title = book.title.toLocaleLowerCase("vi");

  if (title.includes("đắc nhân tâm")) {
    return [
      "Điều đáng đọc ở Đắc Nhân Tâm không nằm ở vài mẹo nói chuyện cho khéo, mà ở cách cuốn sách buộc ta nhìn lại sự chân thành trong giao tiếp.",
      "Nếu từng thấy mình nói đúng nhưng vẫn làm người khác xa ra, cuốn sách này có vài đoạn khiến bạn chậm lại trước khi phản ứng.",
    ];
  }
  if (title.includes("đời ngắn")) {
    return [
      "Cuốn này hợp để đọc trong những ngày bạn biết mình cần nhúc nhích, nhưng lại chưa đủ lực cho một kế hoạch quá lớn.",
      "Nó không đào sâu như một giáo trình, nhưng có những đoạn ngắn đủ làm người đọc tự hỏi: hôm nay mình đang trì hoãn điều gì?",
    ];
  }
  if (title.includes("atomic habits")) {
    return [
      "Atomic Habits đáng chú ý vì chuyển câu chuyện kỷ luật từ ý chí sang hệ thống: làm sao để việc tốt trở nên dễ bắt đầu hơn.",
      "Nếu bạn hay trách mình thiếu động lực, cuốn sách này gợi ý một cách nhìn bớt nặng nề hơn: sửa môi trường trước khi trách bản thân.",
    ];
  }
  if (title.includes("nhà giả kim")) {
    return [
      "Nhà Giả Kim nên được đọc như một câu chuyện biểu tượng hơn là một cuốn sách chỉ đường cụ thể.",
      "Điều còn lại sau khi đọc thường không phải một công thức, mà là cảm giác muốn lắng nghe kỹ hơn điều mình đang theo đuổi.",
    ];
  }
  if (title.includes("dám bị ghét")) {
    return [
      "Dám Bị Ghét không phải cuốn dễ đồng ý ngay, nhưng chính sự gai góc đó làm nó đáng đọc với người hay sống theo ánh nhìn của người khác.",
      "Có những đoạn nên đọc chậm, vì nó chạm vào câu hỏi khá khó: phần nào trong cuộc đời là nhiệm vụ của mình, phần nào không phải?",
    ];
  }

  return [
    `${book.title} đáng được đọc như một cuộc trò chuyện mở, nơi bạn thử đối chiếu từng ý với giai đoạn hiện tại của mình.`,
    "Đừng vội tìm một câu trả lời hoàn hảo. Đôi khi giá trị của một cuốn sách nằm ở việc nó giúp bạn gọi tên vấn đề rõ hơn.",
  ];
}

function readingQuestions(book: Book) {
  const title = book.title.toLocaleLowerCase("vi");

  if (title.includes("đắc nhân tâm")) {
    return [
      "Mình đang muốn được hiểu, hay chỉ đang muốn thắng trong cuộc trò chuyện?",
      "Có mối quan hệ nào sẽ tốt hơn nếu mình lắng nghe chậm lại một chút?",
      "Mình có đang dùng kỹ năng giao tiếp để kết nối, hay để kiểm soát người khác?",
    ];
  }
  if (title.includes("đời ngắn")) {
    return [
      "Việc nhỏ nào mình biết nên làm nhưng cứ để sang ngày khác?",
      "Mình đang chờ hoàn hảo, hay chỉ cần bắt đầu đủ nhỏ?",
      "Nếu hôm nay chỉ sửa một thói quen dùng thời gian, mình sẽ sửa điều gì?",
    ];
  }
  if (title.includes("atomic habits")) {
    return [
      "Thói quen nào đang khó không phải vì mình lười, mà vì môi trường quá bất lợi?",
      "Có hành động tốt nào có thể làm dễ hơn trong 2 phút đầu tiên?",
      "Mình đang theo đuổi mục tiêu, hay đang xây một hệ thống sống được lâu dài?",
    ];
  }
  if (title.includes("dám bị ghét")) {
    return [
      "Mình có đang gánh kỳ vọng không thật sự thuộc về mình?",
      "Nỗi sợ bị đánh giá đang khiến mình trì hoãn lựa chọn nào?",
      "Nếu bớt cần được công nhận, mình sẽ sống khác đi ở điểm nào?",
    ];
  }

  return [
    "Vấn đề nào trong giai đoạn hiện tại khiến mình tìm đến cuốn sách này?",
    "Ý nào trong sách có thể thử ngay bằng một hành động nhỏ?",
    "Điểm nào mình nên cân nhắc, thay vì tin tuyệt đối?",
  ];
}

function InfoMiniList({
  title,
  items,
  highlightKeywords,
}: {
  title: string;
  items: Array<string | { title: string; description?: string }>;
  highlightKeywords: string[];
}) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl bg-white/80 p-4">
      <p className="text-sm font-semibold text-stone-900">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
        {items.map((item) => (
          <li key={typeof item === "string" ? item : item.title}>
            <span>
              •{" "}
              <span className="font-medium text-stone-800">
                <HighlightText
                  text={typeof item === "string" ? item : item.title}
                  keywords={highlightKeywords}
                />
              </span>
            </span>
            {typeof item !== "string" && item.description ? (
              <span className="mt-1 block pl-4 text-xs leading-5 text-stone-600">
                <HighlightText text={item.description} keywords={highlightKeywords} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
