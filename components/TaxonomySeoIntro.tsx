type TaxonomySeoIntroProps = {
  kind: "category" | "pain" | "audience";
  name: string;
  description?: string | null;
};

export function TaxonomySeoIntro({ kind, name, description }: TaxonomySeoIntroProps) {
  const copy = taxonomyCopy(kind, name, description);

  return (
    <div className="mt-5 max-w-3xl space-y-4 text-lg leading-8 text-stone-700">
      {copy.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function taxonomyCopy(kind: TaxonomySeoIntroProps["kind"], name: string, description?: string | null) {
  const base = description?.trim();

  if (kind === "pain") {
    return [
      base ||
        `${name} thường không chỉ là một vấn đề đọc sách, mà là một giai đoạn khiến người ta khó bắt đầu, khó tập trung hoặc khó tin vào lựa chọn của mình.`,
      `Ở trang này, Trạm Đọc Một Chút gom các bài review và gợi ý sách theo đúng nỗi đau "${name.toLowerCase()}". Mục tiêu không phải là bảo rằng một cuốn sách sẽ giải quyết mọi thứ, mà giúp bạn có thêm vài góc nhìn đủ gần với điều mình đang trải qua.`,
      "Bạn có thể bắt đầu bằng bài pillar nếu có, sau đó xem các cuốn sách phù hợp nhất và những bài đọc tiếp theo. Cách chọn sách ở đây ưu tiên sự phù hợp với bối cảnh, nhịp đọc và nhu cầu thật của người đọc.",
    ];
  }

  if (kind === "audience") {
    return [
      base ||
        `${name} thường cần những cuốn sách khác nhau ở từng giai đoạn: có lúc cần một cú hích nhỏ, có lúc cần một hệ thống rõ ràng, cũng có lúc chỉ cần một câu chuyện khiến mình dịu lại.`,
      `Trang này tập hợp các bài viết và sách được chọn cho nhóm người đọc "${name.toLowerCase()}". Nội dung được sắp theo vấn đề, cảm xúc và tình huống sử dụng, thay vì chỉ xếp theo thể loại sách chung chung.`,
      "Hãy đọc phần gợi ý như một bản đồ nhỏ. Bạn có thể chọn bài gần với vấn đề hiện tại trước, rồi mới cân nhắc cuốn sách phù hợp với thời gian, ngân sách và kiểu đọc của mình.",
    ];
  }

  return [
    base ||
      `${name} là một chủ đề rộng, nhưng mỗi người đọc thường tìm đến nó vì một nhu cầu rất cụ thể: muốn hiểu mình hơn, xử lý một vấn đề trước mắt hoặc tìm lại nhịp sống rõ ràng hơn.`,
    `Ở trang chủ đề này, các bài viết và sách được gom theo mạch "${name.toLowerCase()}" để bạn dễ đi từ bài tổng quan đến review chi tiết. Mỗi gợi ý đều cố gắng trả lời câu hỏi: cuốn sách này hợp với ai, trong bối cảnh nào, và nên cân nhắc điều gì trước khi mua.`,
    "Bạn không cần đọc tất cả cùng lúc. Hãy bắt đầu từ bài pillar hoặc một cuốn sách khiến bạn thấy gần với giai đoạn hiện tại, rồi mở rộng dần sang các bài đọc tiếp theo.",
  ];
}
