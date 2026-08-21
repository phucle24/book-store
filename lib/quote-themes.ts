export type QuoteTheme = {
  slug: string;
  name: string;
  emoji: string;
  seoTitle: string;
  seoDescription: string;
  description: string;
};

export const QUOTE_THEMES: QuoteTheme[] = [
  {
    slug: "tinh-yeu",
    name: "Tình yêu",
    emoji: "💌",
    seoTitle: "Caption tình yêu hay từ sách — Dùng ngay cho Facebook, TikTok",
    seoDescription:
      "Tổng hợp những câu trích dẫn về tình yêu hay nhất từ sách. Caption tình yêu ý nghĩa, sâu sắc dùng được ngay.",
    description:
      "Những câu trích dẫn về tình yêu được chọn lọc từ sách — không phải câu nói ngẫu nhiên, mà là góc nhìn sâu sắc từ những cuốn sách đã chạm vào hàng triệu người.",
  },
  {
    slug: "tuoi-tre",
    name: "Tuổi trẻ",
    emoji: "🌱",
    seoTitle: "Caption tuổi trẻ hay & ý nghĩa từ sách — Facebook, TikTok",
    seoDescription:
      "Những câu trích dẫn về tuổi trẻ từ sách nổi tiếng. Caption tuổi trẻ ý nghĩa, sâu sắc cho mạng xã hội.",
    description:
      "Tuổi trẻ không dài, nhưng đủ để thay đổi hướng đi. Những câu từ sách nhắc bạn sống chủ động hơn, ít hối tiếc hơn.",
  },
  {
    slug: "dong-luc",
    name: "Động lực",
    emoji: "⚡",
    seoTitle: "Caption động lực sống hay nhất từ sách — Dùng ngay",
    seoDescription:
      "Tổng hợp câu nói động lực từ sách self-help nổi tiếng. Caption động lực sâu sắc, không sáo rỗng.",
    description:
      "Không phải động lực hô hào, mà là những câu từ sách giúp bạn bắt đầu khi chưa sẵn sàng.",
  },
  {
    slug: "song-co-y-nghia",
    name: "Sống có ý nghĩa",
    emoji: "✨",
    seoTitle: "Caption sống có ý nghĩa — Trích dẫn sách sâu sắc",
    seoDescription:
      "Những câu trích dẫn về ý nghĩa cuộc sống từ sách. Caption sống ý nghĩa, triết lý nhẹ nhàng.",
    description:
      "Những câu từ sách về cách sống — không hoàn hảo, nhưng tỉnh thức và có hướng.",
  },
  {
    slug: "tac-phong-lam-viec",
    name: "Tác phong làm việc",
    emoji: "📌",
    seoTitle: "Caption làm việc & thói quen tốt từ sách — Trích dẫn hay",
    seoDescription:
      "Trích dẫn về thói quen, làm việc hiệu quả từ sách Atomic Habits và các cuốn sách self-help. Caption công việc ý nghĩa.",
    description:
      "Những câu từ sách về cách làm việc, xây dựng thói quen và hệ thống — không cần động lực, chỉ cần hệ thống đúng.",
  },
  {
    slug: "noi-dau-va-chua-lanh",
    name: "Chữa lành",
    emoji: "🌿",
    seoTitle: "Caption chữa lành & vượt qua nỗi đau — Trích dẫn từ sách",
    seoDescription:
      "Những câu trích dẫn chữa lành từ sách tâm lý học. Caption vượt qua khó khăn, chấp nhận bản thân.",
    description:
      "Những câu từ sách giúp bạn gọi tên được cảm xúc, và nhẹ nhàng hơn với chính mình.",
  },
];

export function getThemeBySlug(slug: string): QuoteTheme | undefined {
  return QUOTE_THEMES.find((t) => t.slug === slug);
}

export const ALL_THEME_SLUGS = QUOTE_THEMES.map((t) => t.slug);
