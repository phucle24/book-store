import { ArticleType } from "@prisma/client";

export function ArticleIntentBox({
  type,
  painPointName,
}: {
  type: ArticleType;
  painPointName?: string;
}) {
  const copy = intentCopy(type, painPointName);

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Cách đọc bài này
      </p>
      <h2 className="mt-2 text-xl font-semibold text-stone-950">{copy.title}</h2>
      <p className="mt-3 text-sm leading-7 text-stone-700">{copy.description}</p>
    </section>
  );
}

function intentCopy(type: ArticleType, painPointName?: string) {
  const pain = painPointName?.toLowerCase();

  if (type === ArticleType.TOP_LIST) {
    return {
      title: "Đừng cố chọn cuốn hay nhất, hãy chọn cuốn hợp với giai đoạn này",
      description:
        "Top-list này được viết để bạn so sánh nhanh theo nhu cầu đọc, điểm mạnh và điểm cần cân nhắc của từng cuốn.",
    };
  }

  if (type === ArticleType.STORY) {
    return {
      title: "Hãy đọc như một câu chuyện mở đầu, không phải một checklist",
      description: pain
        ? `Bài này đi từ một tình huống đời thường liên quan đến ${pain}, rồi mới nối vào cuốn sách và cách đọc chậm hơn.`
        : "Bài này đi từ một tình huống đời thường, rồi mới nối vào cuốn sách và cách đọc chậm hơn.",
    };
  }

  if (type === ArticleType.COMPARISON) {
    return {
      title: "So sánh để chọn theo nhu cầu, không chọn theo độ nổi tiếng",
      description:
        "Bài comparison nên được đọc như một bản đối chiếu: cuốn nào hợp với bối cảnh nào, đâu là điểm đổi lại trước khi mua.",
    };
  }

  if (type === ArticleType.GUIDE) {
    return {
      title: "Đọc như một bản đồ nhỏ để tự chọn hướng tiếp theo",
      description: pain
        ? `Bài guide này giúp bạn đi từ việc gọi tên ${pain} đến lựa chọn bài viết hoặc cuốn sách phù hợp hơn.`
        : "Bài guide này giúp bạn đi từ việc gọi tên vấn đề đến lựa chọn bài viết hoặc cuốn sách phù hợp hơn.",
    };
  }

  return {
    title: "Đọc chậm để xem cuốn sách có thật sự hợp với mình không",
    description:
      "Bài review không cố thuyết phục bạn mua ngay. Hãy dùng nó để kiểm tra nội dung sách, điểm mạnh, điểm hạn chế và hoàn cảnh nào nên đọc.",
  };
}
