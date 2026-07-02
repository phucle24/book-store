import { slugify } from "@/lib/slugify";

export type TaxonomyRef = {
  id?: string;
  name: string;
  slug: string;
};

export type JourneyArticleRef = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
};

export type JourneyBookRef = {
  id: string;
  title: string;
  slug: string;
  description: string;
  pros?: string[];
  cons?: string[];
  keyLessons?: string[];
  suitableFor?: string[];
  notSuitableFor?: string[];
  painPoints?: TaxonomyRef[];
};

export type PainJourneyState = {
  id: string;
  label: string;
  readerLine: string;
  nudge: string;
  articleKeywords: string[];
  bookKeywords: string[];
};

export function getPainJourney(
  painPoint?: { name?: string | null; slug?: string | null } | null,
) {
  const slug = painPoint?.slug || slugify(painPoint?.name || "");
  const template = journeyTemplates[slug] || fallbackJourney(painPoint?.name || "vấn đề này");

  return {
    slug,
    name: painPoint?.name || template.name,
    intro: template.intro,
    stuckReason: template.stuckReason,
    states: template.states,
  };
}

export function selectJourneyArticle(
  state: PainJourneyState,
  articles: JourneyArticleRef[],
) {
  return bestMatch(articles, state.articleKeywords, (article) =>
    [article.title, article.excerpt].join(" "),
  );
}

export function selectJourneyBook(state: PainJourneyState, books: JourneyBookRef[]) {
  return bestMatch(books, state.bookKeywords, (book) =>
    [
      book.title,
      book.description,
      ...(book.pros || []),
      ...(book.cons || []),
      ...(book.keyLessons || []),
      ...(book.suitableFor || []),
      ...(book.notSuitableFor || []),
      ...(book.painPoints || []).map((painPoint) => painPoint.name),
    ].join(" "),
  );
}

export function scoreByKeywords(text: string, keywords: string[]) {
  const normalizedText = normalizeVietnameseText(text);
  const normalizedSlug = slugify(text);

  return keywords.reduce((score, keyword) => {
    const normalizedKeyword = normalizeVietnameseText(keyword);
    const keywordSlug = slugify(keyword);
    if (!normalizedKeyword && !keywordSlug) return score;

    if (normalizedText.includes(normalizedKeyword)) return score + 4;
    if (keywordSlug && normalizedSlug.includes(keywordSlug)) return score + 3;

    return score;
  }, 0);
}

export function normalizeVietnameseText(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bestMatch<T>(items: T[], keywords: string[], getText: (item: T) => string) {
  if (!items.length) return null;

  const scored = items
    .map((item, index) => ({
      item,
      index,
      score: scoreByKeywords(getText(item), keywords),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return scored[0]?.item || null;
}

function fallbackJourney(name: string) {
  return {
    name,
    intro: `Có những lúc ${name.toLocaleLowerCase("vi")} không hiện ra như một vấn đề lớn. Nó chỉ lặp lại trong vài lựa chọn nhỏ: né một việc, bỏ dở một kế hoạch, hoặc không chắc mình nên bắt đầu từ đâu.`,
    stuckReason:
      "Điều khiến người đọc mắc kẹt thường không phải là thiếu sách, mà là chưa gọi đúng trạng thái của mình trước khi chọn sách.",
    states: [
      {
        id: "name-the-problem",
        label: "Chưa gọi đúng vấn đề",
        readerLine: "Bạn thấy mình mắc kẹt, nhưng chưa chắc đó là thiếu động lực, thiếu hệ thống hay đang quá mệt.",
        nudge: "Đọc một bài giúp gọi tên vấn đề trước khi mua sách.",
        articleKeywords: ["vấn đề", "gọi tên", "mắc kẹt", name],
        bookKeywords: ["phù hợp", "bắt đầu", name],
      },
      {
        id: "need-gentle-start",
        label: "Cần một điểm bắt đầu nhỏ",
        readerLine: "Bạn không muốn thêm áp lực. Bạn chỉ cần một cuốn đủ gần để mở ra vài câu hỏi đúng.",
        nudge: "Chọn cuốn dễ đọc trước, rồi quay lại đọc sâu hơn sau.",
        articleKeywords: ["bắt đầu", "nhẹ", "cú hích", "hành động"],
        bookKeywords: ["dễ đọc", "bắt đầu", "cú hích", "nhẹ"],
      },
      {
        id: "need-clear-system",
        label: "Cần hệ thống rõ hơn",
        readerLine: "Bạn đã đọc nhiều lời khuyên, nhưng chưa biến nó thành một cách làm lặp lại được.",
        nudge: "Tìm sách có cấu trúc rõ và điểm hạn chế minh bạch.",
        articleKeywords: ["hệ thống", "thói quen", "kỷ luật", "hành động"],
        bookKeywords: ["hệ thống", "thói quen", "kỷ luật", "áp dụng"],
      },
    ],
  };
}

const journeyTemplates: Record<
  string,
  {
    name: string;
    intro: string;
    stuckReason: string;
    states: PainJourneyState[];
  }
> = {
  "tri-hoan": {
    name: "Trì hoãn",
    intro:
      "Trì hoãn thường không bắt đầu bằng sự lười biếng. Nó bắt đầu từ một cảm giác rất nhỏ: biết mình nên làm, nhưng cứ né thêm một chút vì chưa đủ rõ, chưa đủ tin hoặc sợ bắt đầu rồi lại bỏ dở.",
    stuckReason:
      "Bạn có thể mắc kẹt vì thiếu hệ thống, vì kỳ vọng quá lớn, hoặc vì tự trách bản thân đến mức không còn năng lượng để bắt đầu.",
    states: [
      {
        id: "avoid-starting",
        label: "Biết cần làm nhưng né",
        readerLine: "Bạn biết việc cần làm, nhưng cứ mở điện thoại, dọn bàn, đọc thêm một chút rồi vẫn không bắt đầu.",
        nudge: "Hãy đọc một bài giúp thu nhỏ bước đầu tiên.",
        articleKeywords: ["trì hoãn", "lười bắt đầu", "bắt đầu", "cú hích"],
        bookKeywords: ["thói quen", "hành động", "bắt đầu", "atomic"],
      },
      {
        id: "start-then-stop",
        label: "Bắt đầu rồi bỏ",
        readerLine: "Bạn từng có động lực rất mạnh, nhưng chỉ vài ngày sau nhịp đó lại rơi xuống.",
        nudge: "Bạn cần một hệ thống nhỏ hơn là một lời hứa kỷ luật lớn.",
        articleKeywords: ["thiếu kỷ luật", "thói quen", "hệ thống", "bỏ dở"],
        bookKeywords: ["hệ thống", "thói quen", "kỷ luật", "atomic"],
      },
      {
        id: "self-blame",
        label: "Tự trách vì thiếu kỷ luật",
        readerLine: "Bạn không chỉ trì hoãn, bạn còn thấy mình kém cỏi vì đã trì hoãn quá lâu.",
        nudge: "Đọc một góc nhìn dịu hơn trước khi ép mình thay đổi.",
        articleKeywords: ["tự trách", "thiếu kỷ luật", "áp lực", "nhẹ nhàng"],
        bookKeywords: ["nhẹ", "cú hích", "đời ngắn", "thói quen"],
      },
    ],
  },
  "mat-phuong-huong": {
    name: "Mất phương hướng",
    intro:
      "Mất phương hướng không phải lúc nào cũng là không biết mình muốn gì. Đôi khi bạn biết quá nhiều lựa chọn, nghe quá nhiều lời khuyên, rồi vẫn không tìm được một điểm tựa đủ gần để đi tiếp.",
    stuckReason:
      "Cái khó nằm ở chỗ bạn vừa cần được lắng lại, vừa cần một bước nhỏ đủ rõ để không tiếp tục đứng yên.",
    states: [
      {
        id: "too-many-options",
        label: "Quá nhiều lựa chọn",
        readerLine: "Bạn mở rất nhiều hướng, nhưng càng đọc càng thấy mình phân tán.",
        nudge: "Bắt đầu bằng bài giúp gọi tên điều đang thiếu.",
        articleKeywords: ["mất phương hướng", "lựa chọn", "giai đoạn", "bắt đầu"],
        bookKeywords: ["nhà giả kim", "hành trình", "bắt đầu", "ý nghĩa"],
      },
      {
        id: "need-comfort",
        label: "Cần được dịu lại trước",
        readerLine: "Bạn chưa muốn lập kế hoạch. Bạn chỉ muốn có một câu chuyện làm mình thấy nhẹ hơn.",
        nudge: "Chọn một cuốn thiên về câu chuyện và suy ngẫm.",
        articleKeywords: ["chữa lành", "câu chuyện", "dịu", "giai đoạn"],
        bookKeywords: ["nhà giả kim", "văn học", "câu chuyện", "dịu"],
      },
      {
        id: "need-action",
        label: "Cần một cú hích nhỏ",
        readerLine: "Bạn không thiếu suy nghĩ, bạn thiếu một việc nhỏ để làm ngay hôm nay.",
        nudge: "Đọc bài ngắn có tính khởi động trước.",
        articleKeywords: ["cú hích", "bắt đầu", "hành động", "đời ngắn"],
        bookKeywords: ["đời ngắn", "cú hích", "hành động", "bắt đầu"],
      },
    ],
  },
  overthinking: {
    name: "Overthinking",
    intro:
      "Overthinking khiến một chuyện nhỏ có thể biến thành rất nhiều kịch bản trong đầu. Bạn không chỉ suy nghĩ nhiều, bạn còn mệt vì phải đoán phản ứng của người khác trước cả khi mình sống thật với lựa chọn của mình.",
    stuckReason:
      "Người đọc thường mắc kẹt giữa nhu cầu được công nhận và mong muốn được nhẹ đầu hơn.",
    states: [
      {
        id: "fear-judgment",
        label: "Sợ bị đánh giá",
        readerLine: "Bạn hay tự hỏi người khác sẽ nghĩ gì, rồi trì hoãn cả những việc mình muốn làm.",
        nudge: "Đọc một bài tách kỳ vọng của người khác khỏi lựa chọn của bạn.",
        articleKeywords: ["bị đánh giá", "công nhận", "dám bị ghét", "overthinking"],
        bookKeywords: ["dám bị ghét", "công nhận", "tự do", "kỳ vọng"],
      },
      {
        id: "looping-thoughts",
        label: "Nghĩ mãi không dừng",
        readerLine: "Một câu nói, một tin nhắn hoặc một quyết định nhỏ cũng kéo bạn vào vòng lặp suy nghĩ.",
        nudge: "Chọn bài giúp bạn nhìn vấn đề bằng một khung đơn giản hơn.",
        articleKeywords: ["overthinking", "vòng lặp", "suy nghĩ", "mệt"],
        bookKeywords: ["tâm lý", "nhẹ đầu", "góc nhìn", "dám bị ghét"],
      },
      {
        id: "need-boundaries",
        label: "Cần ranh giới rõ hơn",
        readerLine: "Bạn muốn tử tế với người khác, nhưng không muốn đánh mất mình trong kỳ vọng của họ.",
        nudge: "Đọc trước phần ai nên và không nên đọc.",
        articleKeywords: ["ranh giới", "kỳ vọng", "công nhận", "người khác"],
        bookKeywords: ["ranh giới", "tự do", "công nhận", "dám bị ghét"],
      },
    ],
  },
  burnout: {
    name: "Burnout",
    intro:
      "Burnout thường đến sau một thời gian dài cố gắng. Bạn vẫn làm được việc, vẫn trả lời tin nhắn, vẫn hoàn thành trách nhiệm, nhưng bên trong đã cạn năng lượng để thấy mọi thứ có ý nghĩa.",
    stuckReason:
      "Bạn cần phân biệt giữa cần nghỉ, cần đổi cách làm, và cần một góc nhìn mới về kỳ vọng của mình.",
    states: [
      {
        id: "exhausted",
        label: "Cạn năng lượng",
        readerLine: "Bạn vẫn đang chạy, nhưng không còn thấy mình thật sự ở trong nhịp sống đó.",
        nudge: "Chọn bài có nhịp đọc dịu trước.",
        articleKeywords: ["burnout", "mệt", "cạn năng lượng", "áp lực"],
        bookKeywords: ["dịu", "chữa lành", "nghỉ", "ý nghĩa"],
      },
      {
        id: "pressure",
        label: "Áp lực phải giỏi hơn",
        readerLine: "Bạn nghỉ cũng thấy có lỗi, làm tiếp thì mệt, dừng lại thì sợ tụt lại.",
        nudge: "Đọc phần điểm hạn chế để không biến sách thành thêm một áp lực.",
        articleKeywords: ["áp lực", "công việc", "kỳ vọng", "mệt"],
        bookKeywords: ["áp lực", "kỳ vọng", "tỉnh táo", "nhẹ"],
      },
      {
        id: "reset-rhythm",
        label: "Muốn lấy lại nhịp",
        readerLine: "Bạn không cần thay đổi lớn, chỉ cần một nhịp nhỏ để quay lại với mình.",
        nudge: "Chọn sách có thể đọc từng đoạn ngắn.",
        articleKeywords: ["bắt đầu lại", "nhịp", "cú hích", "nhẹ"],
        bookKeywords: ["cú hích", "thói quen", "bắt đầu", "đời ngắn"],
      },
    ],
  },
  "sau-chia-tay": {
    name: "Sau chia tay",
    intro:
      "Sau chia tay, điều khó nhất không chỉ là nhớ một người. Đó còn là việc phải học lại cách ở một mình, không tự trách quá nhiều và không vội dùng một cuốn sách để lấp khoảng trống.",
    stuckReason:
      "Người đọc thường cần một nhịp đọc dịu, có khoảng lặng, trước khi bước sang các cuốn thiên về hành động.",
    states: [
      {
        id: "still-hurts",
        label: "Vẫn còn đau",
        readerLine: "Bạn hiểu chuyện đã qua, nhưng cảm xúc chưa đi cùng tốc độ với lý trí.",
        nudge: "Đọc một bài dịu trước, chưa cần ép mình mạnh mẽ.",
        articleKeywords: ["sau chia tay", "cô đơn", "chữa lành", "dịu"],
        bookKeywords: ["chữa lành", "câu chuyện", "văn học", "dịu"],
      },
      {
        id: "self-blame-love",
        label: "Tự trách mình",
        readerLine: "Bạn cứ quay lại hỏi nếu mình khác đi thì mọi chuyện có khác không.",
        nudge: "Chọn bài giúp nhìn lại mà không tự nghiền nát mình.",
        articleKeywords: ["tự trách", "công nhận", "ranh giới", "mối quan hệ"],
        bookKeywords: ["dám bị ghét", "tự do", "ranh giới", "công nhận"],
      },
      {
        id: "start-again",
        label: "Muốn bắt đầu lại",
        readerLine: "Bạn chưa cần một kế hoạch lớn, chỉ muốn một việc nhỏ để thấy mình vẫn đi tiếp được.",
        nudge: "Đọc một cuốn ngắn, dễ mở ra hành động.",
        articleKeywords: ["bắt đầu lại", "cú hích", "đời ngắn", "nhẹ"],
        bookKeywords: ["đời ngắn", "cú hích", "bắt đầu", "hành động"],
      },
    ],
  },
  "thieu-ky-luat": {
    name: "Thiếu kỷ luật",
    intro:
      "Thiếu kỷ luật đôi khi không phải vì bạn yếu. Có thể hệ thống quanh bạn đang quá khó lặp lại, mục tiêu quá lớn, hoặc bạn chỉ biết tự trách mà chưa biết thiết kế lại môi trường của mình.",
    stuckReason:
      "Muốn bền hơn, người đọc cần chuyển từ cảm hứng sang hệ thống nhỏ, nhưng vẫn đủ nhẹ để không bỏ cuộc.",
    states: [
      {
        id: "all-or-nothing",
        label: "Hay làm theo hứng",
        readerLine: "Bạn làm rất mạnh khi có động lực, rồi mất nhịp khi đời sống bận lên.",
        nudge: "Đọc một bài về hệ thống nhỏ trước.",
        articleKeywords: ["thiếu kỷ luật", "động lực", "hệ thống", "thói quen"],
        bookKeywords: ["atomic", "thói quen", "hệ thống", "kỷ luật"],
      },
      {
        id: "too-big",
        label: "Đặt mục tiêu quá lớn",
        readerLine: "Bạn bắt đầu bằng kế hoạch rất đẹp, nhưng nó quá nặng để sống cùng mỗi ngày.",
        nudge: "Chọn sách giúp thu nhỏ hành động.",
        articleKeywords: ["mục tiêu", "bắt đầu", "thói quen", "nhỏ"],
        bookKeywords: ["atomic", "nhỏ", "thói quen", "hành động"],
      },
      {
        id: "needs-nudge",
        label: "Cần cú hích nhẹ",
        readerLine: "Bạn chưa muốn xây hệ thống dài, chỉ cần một cú đẩy để đứng dậy làm việc trước mắt.",
        nudge: "Đọc một bài story ngắn trước khi mua sách sâu hơn.",
        articleKeywords: ["cú hích", "đời ngắn", "bắt đầu", "trì hoãn"],
        bookKeywords: ["đời ngắn", "cú hích", "bắt đầu", "hành động"],
      },
    ],
  },
  "giao-tiep-kem": {
    name: "Giao tiếp kém",
    intro:
      "Giao tiếp kém không chỉ là nói chưa khéo. Nhiều khi đó là cảm giác ngại mở lời, sợ làm người khác khó chịu, hoặc không biết làm sao để chân thành mà vẫn rõ ràng trong công việc.",
    stuckReason:
      "Điều cần đọc không phải mẹo thao túng, mà là cách nhìn tỉnh táo hơn về sự chú ý, lắng nghe và kết nối.",
    states: [
      {
        id: "afraid-to-speak",
        label: "Ngại mở lời",
        readerLine: "Bạn có ý kiến, nhưng thường im lặng vì sợ nói ra không hay hoặc bị đánh giá.",
        nudge: "Đọc bài giúp nhìn giao tiếp như một kỹ năng có thể luyện chậm.",
        articleKeywords: ["giao tiếp", "ngại giao tiếp", "thiếu tự tin", "mới đi làm"],
        bookKeywords: ["đắc nhân tâm", "giao tiếp", "lắng nghe", "quan hệ"],
      },
      {
        id: "workplace-awkward",
        label: "Lúng túng ở công sở",
        readerLine: "Bạn không muốn lấy lòng, nhưng cũng không muốn bị hiểu lầm là lạnh lùng hoặc khó gần.",
        nudge: "Đọc phần chân thành vs kỹ thuật trước khi mua sách.",
        articleKeywords: ["công sở", "mới đi làm", "giao tiếp", "chân thành"],
        bookKeywords: ["đắc nhân tâm", "công việc", "quan hệ", "chân thành"],
      },
      {
        id: "want-better-relationships",
        label: "Muốn kết nối tốt hơn",
        readerLine: "Bạn muốn các cuộc trò chuyện bớt gượng và có nhiều sự quan tâm thật hơn.",
        nudge: "Chọn sách có điểm mạnh về lắng nghe, nhưng đọc với tinh thần chọn lọc.",
        articleKeywords: ["quan hệ", "lắng nghe", "kết nối", "đắc nhân tâm"],
        bookKeywords: ["đắc nhân tâm", "lắng nghe", "quan tâm", "kết nối"],
      },
    ],
  },
  "tai-chinh-ca-nhan": {
    name: "Tài chính cá nhân",
    intro:
      "Tài chính cá nhân dễ làm người ta ngại nhìn thẳng, vì nó chạm vào cảm giác thiếu an toàn, so sánh và những quyết định nhỏ lặp lại mỗi tháng.",
    stuckReason:
      "Bạn cần một cách đọc thực tế: hiểu thói quen tiền bạc, nhận diện nỗi sợ, rồi chọn một bước nhỏ có thể làm ngay.",
    states: [
      {
        id: "money-anxiety",
        label: "Lo lắng về tiền",
        readerLine: "Bạn không hẳn thiếu hiểu biết, nhưng mỗi lần nghĩ đến tiền lại thấy căng.",
        nudge: "Bắt đầu bằng bài giúp giảm cảm giác né tránh.",
        articleKeywords: ["tài chính", "lo lắng", "áp lực", "tiền"],
        bookKeywords: ["tài chính", "thói quen", "an toàn", "tiền"],
      },
      {
        id: "spending-loop",
        label: "Chi tiêu theo cảm xúc",
        readerLine: "Bạn muốn kiểm soát hơn, nhưng nhiều quyết định mua sắm vẫn đến từ cảm xúc nhất thời.",
        nudge: "Chọn sách giúp nhìn lại hành vi trước khi lập kế hoạch lớn.",
        articleKeywords: ["chi tiêu", "cảm xúc", "thói quen", "tiền"],
        bookKeywords: ["thói quen", "tài chính", "hành vi", "kiểm soát"],
      },
      {
        id: "need-system-money",
        label: "Cần hệ thống rõ",
        readerLine: "Bạn muốn một cách theo dõi đơn giản, không phải thêm một kế hoạch quá nặng.",
        nudge: "Đọc bài thiên về hành động nhỏ và kiểm tra điểm hạn chế.",
        articleKeywords: ["hệ thống", "kế hoạch", "tài chính", "hành động"],
        bookKeywords: ["hệ thống", "tài chính", "kế hoạch", "áp dụng"],
      },
    ],
  },
};
