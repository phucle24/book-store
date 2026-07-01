import {
  ArticleBookRole,
  ArticleStatus,
  ArticleType,
  BookStatus,
  type Book,
  PrismaClient,
} from "@prisma/client";
import { readingTimeFromMarkdown } from "../lib/markdown";
import { slugify } from "../lib/slugify";

const prisma = new PrismaClient();

const categories = [
  "Phát triển bản thân",
  "Tâm lý học",
  "Kỹ năng sống",
  "Tài chính cá nhân",
  "Văn học chữa lành",
  "Giao tiếp",
  "Nuôi dạy con",
  "Kinh doanh",
];

const painPoints = [
  "Mất phương hướng",
  "Trì hoãn",
  "Overthinking",
  "Burnout",
  "Cô đơn",
  "Sau chia tay",
  "Thiếu kỷ luật",
  "Thiếu tự tin",
  "Áp lực công việc",
  "Giao tiếp kém",
  "Tài chính cá nhân",
];

const painPointLabels = Object.fromEntries(
  painPoints.map((name) => [slugify(name), name]),
);

const audiences = [
  "Sinh viên",
  "Người mới đi làm",
  "Dân văn phòng",
  "Người hướng nội",
  "Cha mẹ",
  "Giáo viên",
  "Người kinh doanh",
  "Người tuổi 25-35",
];

const bookSeeds = [
  {
    title: "Atomic Habits",
    author: "James Clear",
    publisher: "NXB Thế Giới",
    categorySlugs: ["phat-trien-ban-than", "ky-nang-song"],
    painSlugs: ["tri-hoan", "thieu-ky-luat"],
    audienceSlugs: ["sinh-vien", "nguoi-moi-di-lam", "dan-van-phong"],
    description:
      "Một cuốn sách thực tế về cách xây thói quen nhỏ, giảm phụ thuộc vào động lực và thiết kế môi trường để hành động dễ hơn.",
    pros: ["Dễ áp dụng", "Nhiều ví dụ đời thường", "Phù hợp người hay bỏ cuộc giữa chừng"],
    cons: ["Không đi sâu vào sang chấn tâm lý", "Cần tự thực hành đều mới thấy hiệu quả"],
    keyLessons: ["Tập trung vào hệ thống", "Làm hành vi tốt trở nên dễ", "Theo dõi tiến bộ nhỏ"],
    suitableFor: ["Bạn hay trì hoãn", "Bạn muốn kỷ luật nhẹ nhàng hơn", "Bạn cần một hệ thống bắt đầu lại"],
    notSuitableFor: ["Bạn muốn lời khuyên chữa lành cảm xúc sâu", "Bạn không muốn thử nghiệm thói quen"],
  },
  {
    title: "Đời Ngắn Đừng Ngủ Dài",
    author: "Robin Sharma",
    publisher: "NXB Trẻ",
    categorySlugs: ["phat-trien-ban-than", "ky-nang-song"],
    painSlugs: ["mat-phuong-huong", "thieu-tu-tin"],
    audienceSlugs: ["sinh-vien", "nguoi-moi-di-lam"],
    description:
      "Những đoạn ngắn về sống chủ động, bớt trì hoãn và nhìn lại cách mình đang dùng thời gian.",
    pros: ["Dễ đọc từng đoạn ngắn", "Giọng truyền cảm hứng vừa phải", "Hợp lúc cần được kéo dậy nhẹ"],
    cons: ["Không phải sách hướng dẫn chi tiết", "Một số ý quen với người đọc nhiều self-help"],
    keyLessons: ["Bắt đầu từ điều nhỏ", "Đừng chờ hoàn hảo", "Sống có chủ đích hơn"],
    suitableFor: ["Bạn đang lười bắt đầu", "Bạn cần một cuốn đọc nhanh", "Bạn muốn tự nhắc mình sống tỉnh táo"],
    notSuitableFor: ["Bạn cần nghiên cứu khoa học sâu", "Bạn không thích văn phong truyền cảm hứng"],
  },
  {
    title: "Nhà Giả Kim",
    author: "Paulo Coelho",
    publisher: "NXB Hội Nhà Văn",
    categorySlugs: ["van-hoc-chua-lanh"],
    painSlugs: ["mat-phuong-huong", "co-don"],
    audienceSlugs: ["sinh-vien", "nguoi-tuoi-25-35", "nguoi-huong-noi"],
    description:
      "Một câu chuyện ngụ ngôn về hành trình đi tìm kho báu, lắng nghe dấu hiệu và hiểu điều mình thật sự theo đuổi.",
    pros: ["Văn phong nhẹ", "Dễ tạo cảm giác được đồng hành", "Hợp khi cần một câu chuyện hơn là lời khuyên"],
    cons: ["Tính biểu tượng cao, không hợp người thích thực dụng", "Thông điệp có thể hơi quen"],
    keyLessons: ["Lắng nghe trực giác", "Hành trình cũng là câu trả lời", "Ước mơ cần hành động"],
    suitableFor: ["Bạn đang mất phương hướng", "Bạn thích văn học ngụ ngôn", "Bạn cần một câu chuyện dịu lại"],
    notSuitableFor: ["Bạn muốn sách kỹ năng cụ thể", "Bạn không thích lối kể giàu biểu tượng"],
  },
  {
    title: "Đắc Nhân Tâm",
    author: "Dale Carnegie",
    publisher: "NXB Tổng Hợp TP.HCM",
    categorySlugs: ["giao-tiep", "ky-nang-song"],
    painSlugs: ["giao-tiep-kem", "thieu-tu-tin"],
    audienceSlugs: ["dan-van-phong", "nguoi-kinh-doanh", "nguoi-moi-di-lam"],
    description:
      "Một cuốn kinh điển về cách lắng nghe, ứng xử và xây dựng thiện cảm trong các mối quan hệ.",
    pros: ["Nhiều nguyên tắc dễ nhớ", "Hợp môi trường công việc", "Giúp nhìn giao tiếp bớt đối đầu"],
    cons: ["Một số ví dụ cũ", "Cần đọc với tinh thần chân thành, không thao túng"],
    keyLessons: ["Quan tâm thật lòng", "Tránh chỉ trích vội", "Khen cụ thể và đúng lúc"],
    suitableFor: ["Bạn ngại giao tiếp", "Bạn mới đi làm", "Bạn muốn cải thiện quan hệ công việc"],
    notSuitableFor: ["Bạn tìm sách giao tiếp hiện đại, nhiều nghiên cứu mới", "Bạn không thích ví dụ cổ điển"],
  },
  {
    title: "Dám Bị Ghét",
    author: "Ichiro Kishimi, Fumitake Koga",
    publisher: "NXB Lao Động",
    categorySlugs: ["tam-ly-hoc", "phat-trien-ban-than"],
    painSlugs: ["overthinking", "thieu-tu-tin", "co-don"],
    audienceSlugs: ["nguoi-huong-noi", "nguoi-tuoi-25-35", "dan-van-phong"],
    description:
      "Một cuộc đối thoại dựa trên tâm lý học Adler, xoay quanh tự do cá nhân, mặc cảm và nhu cầu được công nhận.",
    pros: ["Góc nhìn khác về tự do", "Hợp người hay sống theo kỳ vọng", "Dạng đối thoại dễ theo dõi"],
    cons: ["Có luận điểm gây tranh luận", "Không nên đọc như lời khuyên tuyệt đối"],
    keyLessons: ["Tách nhiệm vụ của mình và người khác", "Bớt lệ thuộc vào công nhận", "Can đảm sống theo lựa chọn"],
    suitableFor: ["Bạn hay overthinking vì ánh nhìn người khác", "Bạn muốn hiểu bản thân", "Bạn đang thiếu tự tin"],
    notSuitableFor: ["Bạn cần hỗ trợ trị liệu chuyên sâu", "Bạn không thích sách dạng đối thoại triết lý"],
  },
];

function sampleContent(bookTitle: string, pain: string, articleTitle = "") {
  if (articleTitle.includes("5 cuốn sách")) return topListContent();
  if (bookTitle === "Atomic Habits") return atomicHabitsContent();
  if (bookTitle === "Dám Bị Ghét") return courageToBeDislikedContent();
  if (bookTitle === "Đắc Nhân Tâm") return dacNhanTamContent();
  if (bookTitle === "Đời Ngắn Đừng Ngủ Dài") return doiNganContent();

  return `## Khi một vấn đề nhỏ cứ lặp lại

Có những giai đoạn ta không thật sự cần thêm một khẩu hiệu mạnh mẽ. Ta cần một cách gọi tên vấn đề đủ rõ để biết mình nên bắt đầu từ đâu. Với ${pain.toLowerCase()}, cảm giác khó nhất thường không phải là thiếu thông tin, mà là biết quá nhiều nhưng vẫn đứng yên.

${bookTitle} đáng cân nhắc vì cuốn sách đặt vấn đề vào những lát cắt gần đời sống. Nó không nên được đọc như một phép màu, mà như một cuộc trò chuyện giúp bạn nhìn lại thói quen, kỳ vọng và cách mình phản ứng với áp lực.

${sampleDetailedReview(bookTitle, pain)}

## Ai nên đọc

- Người đang mắc kẹt trong một vòng lặp quen thuộc.
- Người muốn có một góc nhìn mềm hơn thay vì tự trách mình.
- Người thích sách có thể đọc chậm, ghi chú và quay lại khi cần.

## Ai không nên đọc

- Người đang cần tư vấn chuyên môn ngay cho vấn đề sức khỏe tinh thần nghiêm trọng.
- Người muốn một công thức chắc chắn đúng với mọi hoàn cảnh.
- Người không muốn dành thời gian tự đối thoại sau khi đọc.

## Điểm hạn chế

Không có cuốn sách nào thay thế được trải nghiệm sống, sự hỗ trợ từ người thân hoặc chuyên gia khi cần. Một số phần có thể rất hợp với người này nhưng lại hơi xa với người khác. Vì vậy, cách đọc tốt hơn là chọn điều phù hợp để thử, thay vì ép bản thân tin toàn bộ.

## Nên đọc cuốn này như thế nào

Hãy đọc cùng một câu hỏi nhỏ: "Mình đang né điều gì, và một bước đủ nhỏ hôm nay là gì?" Nếu câu trả lời chưa rõ, chỉ cần đánh dấu một đoạn khiến bạn dừng lại. Đôi khi một cuốn sách hữu ích không phải vì nó nói điều mới, mà vì nó nói đúng lúc.`;
}

function atomicHabitsContent() {
  return `Có những ngày bạn biết rất rõ mình nên làm gì: mở tài liệu ra học, gửi một email đã trì hoãn, đi ngủ sớm hơn, hoặc chỉ đơn giản là dọn lại bàn làm việc. Nhưng rồi mọi thứ vẫn bị đẩy sang ngày mai. Cảm giác khó chịu nhất không phải là lười một lần, mà là thấy mình cứ lặp lại cùng một vòng: hứa, bắt đầu, bỏ dở, tự trách.

Với người hay trì hoãn, Atomic Habits đáng đọc không phải vì nó hô hào bạn phải kỷ luật hơn. Điểm đáng giá của sách là nó kéo câu chuyện xuống rất đời thường: nếu một việc tốt quá khó bắt đầu, có thể vấn đề không chỉ nằm ở ý chí, mà nằm ở cách bạn thiết kế môi trường, tín hiệu và bước đầu tiên.

## Khi trì hoãn không chỉ là lười

Nhiều người tìm sách về thói quen khi đã quá mệt với bản thân. Họ nghĩ mình cần thêm động lực, thêm một cú sốc, thêm một lịch trình nghiêm khắc. Nhưng càng ép, họ càng dễ bỏ cuộc vì hệ thống sống cũ vẫn giữ nguyên.

Atomic Habits gợi một hướng đọc mềm hơn: đừng bắt đầu bằng câu hỏi "làm sao để mình trở thành người siêu kỷ luật?". Hãy bắt đầu bằng câu hỏi nhỏ hơn: "việc này có thể dễ hơn 2% không?". Chỉ riêng cách đổi câu hỏi đó đã làm người đọc bớt cảm giác bị phán xét.

## Review chi tiết: cuốn sách này đáng ở điểm nào?

Điểm mạnh nhất của Atomic Habits là tính hệ thống. James Clear không chỉ nói hãy cố gắng, mà phân rã thói quen thành những phần nhỏ: tín hiệu, ham muốn, phản hồi, phần thưởng. Khi hiểu một hành vi vận hành theo chuỗi như vậy, người đọc có thêm chỗ để can thiệp.

Ví dụ, nếu bạn muốn đọc sách mỗi tối nhưng điện thoại luôn nằm ngay cạnh gối, vấn đề không chỉ là bạn thiếu quyết tâm. Môi trường đang làm việc xấu trở nên dễ hơn việc tốt. Sách nhắc bạn đổi vị trí đồ vật, giảm ma sát cho hành vi tốt, tăng ma sát cho hành vi xấu. Nghe nhỏ, nhưng đây là kiểu nhỏ có thể sống được lâu.

### Điểm hữu ích thật sự

Cuốn sách hợp với người từng bắt đầu rất nhiều lần nhưng không duy trì được. Nó giúp bạn nhìn thói quen như một hệ thống có thể chỉnh sửa, thay vì một bài kiểm tra đạo đức về việc mình có đủ giỏi hay không.

Một ý đáng giữ lại là: kết quả lớn thường không đến từ một ngày bùng nổ, mà từ nhiều hành động nhỏ được lặp lại. Nếu đọc vội, câu này nghe như khẩu hiệu. Nhưng nếu đặt vào đời sống thật, nó khá thực tế. Một người đang trì hoãn không cần xây lại toàn bộ cuộc đời trong một tối; họ cần một đường trượt đủ nhẹ để quay lại.

### Điểm nên tự kiểm tra trước khi mua

Trước khi mua, nên đọc thử mô tả, mục lục và vài phản hồi người mua về bản dịch, chất lượng in, độ dễ đọc. Atomic Habits là sách thiên về phương pháp, nên nếu bạn đang cần một cuốn chữa lành cảm xúc sâu, sách có thể hơi khô. Nó hợp hơn với người muốn sửa hành vi cụ thể.

## Đọc sao để không biến kỷ luật thành áp lực mới

Một lỗi phổ biến khi đọc sách thói quen là biến nó thành một bản án khác dành cho bản thân. Đọc xong, bạn thấy mình phải dậy sớm, tập thể dục, đọc sách, học thêm, ăn lành mạnh và làm việc sâu cùng một lúc. Kết quả là chỉ vài ngày sau, mọi thứ vỡ ra vì quá nhiều thay đổi cùng lúc.

Atomic Habits nên được đọc theo hướng ngược lại. Đừng hỏi "mình có thể thêm bao nhiêu thói quen tốt?". Hãy hỏi "một hành vi nào nếu dễ hơn một chút sẽ kéo theo các hành vi khác?". Với người hay trì hoãn, đó có thể là đặt sách lên bàn thay vì cất trong kệ, mở sẵn tài liệu trước khi ngủ, hoặc viết một dòng đầu tiên thay vì bắt mình hoàn thành cả bài.

Điểm hay của sách là nó cho phép bạn bắt đầu từ nơi rất nhỏ mà vẫn không thấy mình tầm thường. Một bước nhỏ không phải vì mục tiêu nhỏ, mà vì bạn đang thiết kế một đường quay lại bền hơn.

## Ai nên đọc

- Người hay trì hoãn dù biết việc đó quan trọng.
- Người từng thử nhiều kế hoạch nhưng bỏ dở sau vài ngày.
- Người muốn xây kỷ luật nhẹ nhàng hơn, ít tự trách hơn.
- Người mới đi làm hoặc dân văn phòng muốn thiết kế lại nhịp sống.

## Ai không nên đọc

- Người đang cần hỗ trợ tâm lý chuyên sâu ngay lập tức.
- Người muốn một cuốn sách thuần cảm xúc, đọc để được an ủi.
- Người không muốn thử nghiệm hành vi nhỏ trong đời sống thật.

## Điểm hạn chế

Atomic Habits không giải quyết mọi nguyên nhân khiến một người trì hoãn. Có những lúc trì hoãn đến từ kiệt sức, lo âu, môi trường làm việc độc hại hoặc vấn đề sức khỏe tinh thần. Khi đó, chỉ sửa thói quen là chưa đủ.

Một số ví dụ trong sách cũng có thể quen với người đã đọc nhiều self-help. Giá trị của sách không nằm ở việc ý nào cũng mới, mà ở cách nó gom các ý thành một hệ thống dễ nhớ và dễ thực hành.

## Nên đọc cuốn này như thế nào

Đừng đọc Atomic Habits với tâm thế phải thay đổi toàn bộ bản thân. Hãy chọn một hành vi duy nhất: đọc 2 trang, đi bộ 5 phút, chuẩn bị bàn làm việc, tắt một thông báo. Sau đó thử làm hành vi đó dễ hơn đến mức khó từ chối.

Nếu bạn đang tìm thêm các bài cùng mạch, có thể đọc tiếp nhóm bài về [trì hoãn](/noi-dau/tri-hoan) hoặc xem trang sách [Atomic Habits](/sach/atomic-habits).`;
}

function courageToBeDislikedContent() {
  return `Có những kiểu mệt không đến từ việc làm quá nhiều, mà đến từ việc sống quá lâu trong ánh nhìn của người khác. Bạn đăng một dòng trạng thái rồi xóa. Bạn muốn từ chối nhưng lại sợ bị đánh giá. Bạn biết mình không vui, nhưng vẫn cố làm người dễ chịu để không ai thất vọng.

Dám Bị Ghét chạm vào đúng vùng đó. Đây không phải cuốn sách dễ đồng ý ngay, và cũng không nên đọc như một chân lý tuyệt đối. Nhưng nếu bạn thường overthinking vì câu hỏi "người khác nghĩ gì về mình?", cuốn sách này đáng để đọc chậm.

## Khi nhu cầu được công nhận trở thành cái lồng

Nhiều người không thật sự muốn làm hài lòng tất cả. Họ chỉ sợ cảm giác bị ghét, bị bỏ lại, bị xem là ích kỷ. Vì vậy họ chọn im lặng, chọn chiều ý, chọn đi đường vòng. Lâu dần, cuộc đời trở thành một bản nháp được sửa theo tay người khác.

Dám Bị Ghét không dỗ dành người đọc quá nhiều. Cuốn sách đặt câu hỏi thẳng: nếu cứ sống để được công nhận, bạn có thật sự đang sống đời mình không?

## Review chi tiết: cuốn sách này đáng ở điểm nào?

Điểm đặc biệt của sách là hình thức đối thoại. Một thanh niên chất vấn một triết gia, và qua cuộc trò chuyện đó, các ý tưởng của tâm lý học Adler được mở ra. Cách viết này giúp sách dễ theo dõi hơn sách lý thuyết thuần túy, nhưng cũng khiến một số đoạn có cảm giác tranh luận khá mạnh.

Điều đáng đọc nhất là khái niệm tách nhiệm vụ. Có những việc thuộc về bạn: lựa chọn, hành động, thái độ. Có những việc thuộc về người khác: họ nghĩ gì, họ phản ứng ra sao, họ có công nhận bạn hay không. Khi hai vùng này bị trộn lẫn, người đọc rất dễ kiệt sức.

### Điểm hữu ích thật sự

Với người hay overthinking, chỉ riêng câu hỏi "đây có phải nhiệm vụ của mình không?" đã là một điểm dừng cần thiết. Nó không làm vấn đề biến mất, nhưng giúp bạn bớt ôm mọi phản ứng của người khác vào người.

Cuốn sách cũng đáng ở chỗ nó không tô hồng tự do. Tự do luôn đi kèm khả năng bị hiểu lầm. Dám bị ghét, theo tinh thần của sách, không phải cố tình làm người khác tổn thương. Nó là can đảm sống thật hơn, kể cả khi không được tất cả mọi người tán thành.

### Điểm nên tự kiểm tra trước khi mua

Trước khi mua, nên đọc thử vài trang để xem bạn có hợp với dạng đối thoại triết lý không. Một số người thích vì sách tạo cảm giác đang nghe tranh luận trực tiếp. Một số người sẽ thấy cách lập luận hơi cứng hoặc gây phản kháng.

## Đọc để bớt sợ bị đánh giá, không phải để trở nên bất cần

Một điểm dễ hiểu lầm của Dám Bị Ghét là cái tên có vẻ rất mạnh. Nhưng đọc kỹ, tinh thần của sách không phải là sống bất chấp cảm xúc người khác. Nó nghiêng về việc thôi trao toàn bộ quyền định nghĩa bản thân cho người ngoài.

Người hay overthinking thường không thiếu sự tinh tế. Vấn đề là sự tinh tế đó bị kéo quá xa, thành thói quen đoán ý, phòng thủ, tự sửa mình trước cả khi ai đó góp ý. Cuốn sách có ích ở chỗ nó tạo ra một khoảng dừng. Trước khi lao vào vòng suy nghĩ, bạn có thể hỏi: mình đang chịu trách nhiệm cho lựa chọn của mình, hay đang cố chịu trách nhiệm cho cảm xúc của tất cả mọi người?

Nếu chỉ lấy một điều từ cuốn sách, hãy lấy quyền được sống rõ hơn với lựa chọn của mình. Không cần cố làm người gai góc. Chỉ cần bớt tự xóa mình mỗi khi sợ bị ai đó không thích.

## Ai nên đọc

- Người thường tự đo giá trị bản thân qua đánh giá của người khác.
- Người hướng nội hay suy nghĩ quá lâu sau một cuộc trò chuyện.
- Dân văn phòng mệt vì luôn phải vừa lòng mọi phía.
- Người muốn học cách đặt ranh giới mà không biến mình thành người lạnh lùng.

## Ai không nên đọc

- Người đang cần trị liệu hoặc hỗ trợ chuyên môn cho tổn thương sâu.
- Người muốn sách tâm lý dễ chịu, chữa lành nhẹ nhàng từ đầu đến cuối.
- Người không thích sách dạng đối thoại triết lý.

## Điểm hạn chế

Một số luận điểm trong Dám Bị Ghét dễ gây tranh luận nếu đọc quá nhanh. Nếu tách khỏi bối cảnh sống thật, vài ý có thể bị hiểu thành "mọi đau khổ đều do mình chọn", điều này không công bằng với những người từng trải qua tổn thương phức tạp.

Vì vậy, nên đọc sách như một lời mời đối thoại, không phải phán quyết cuối cùng về tâm lý con người.

## Nên đọc cuốn này như thế nào

Hãy đọc chậm và ghi lại những câu khiến bạn khó chịu. Đôi khi chỗ khó chịu chính là nơi cuốn sách chạm vào một niềm tin cũ. Sau mỗi chương, thử hỏi: phần nào là việc của mình, phần nào mình đang cố kiểm soát thay người khác?`;
}

function dacNhanTamContent() {
  return `Người mới đi làm thường sợ nhất những khoảnh khắc rất nhỏ: nói một câu trong meeting rồi thấy phòng im lặng, góp ý với đồng nghiệp mà sợ bị ghét, muốn thân thiện nhưng lại thành gượng gạo. Giao tiếp kém không phải lúc nào cũng là không biết nói. Nhiều khi là nói xong vẫn thấy khoảng cách giữa mình và người khác xa hơn.

Đắc Nhân Tâm là một cuốn kinh điển, nhưng chính vì quá nổi tiếng nên cũng dễ bị hiểu sai. Nếu đọc nó như bộ mẹo để lấy lòng, cuốn sách sẽ trở nên nguy hiểm. Nếu đọc nó như lời nhắc về sự chân thành trong giao tiếp, nó vẫn còn nhiều điều đáng giữ.

## Vì sao người mới đi làm vẫn có thể đọc Đắc Nhân Tâm?

Môi trường công việc không chỉ vận hành bằng năng lực chuyên môn. Nó còn vận hành bằng cách người ta lắng nghe nhau, góp ý cho nhau, ghi nhận nhau và xử lý va chạm. Một người giỏi nhưng luôn khiến người khác phòng thủ sẽ rất khó đi xa trong tập thể.

Đắc Nhân Tâm nhắc lại những điều tưởng đơn giản: đừng chỉ trích vội, hãy quan tâm thật lòng, hãy khen cụ thể, hãy để người khác thấy họ được tôn trọng. Những ý này không mới, nhưng với người mới đi làm, chúng có thể là bộ khung ban đầu để bớt lúng túng.

## Review chi tiết: cuốn sách này đáng ở điểm nào?

Điểm đáng đọc của Đắc Nhân Tâm không nằm ở vài câu mẹo giao tiếp. Nó nằm ở một thái độ nền: con người muốn được nhìn nhận, được lắng nghe và được giữ thể diện. Khi hiểu điều này, cách ta nói chuyện sẽ bớt đối đầu hơn.

Cuốn sách có nhiều ví dụ cũ, nhưng nguyên tắc đằng sau vẫn còn dùng được. Trong công việc, một lời góp ý nếu bắt đầu bằng phán xét sẽ dễ khiến người khác đóng lại. Một lời khen nếu chung chung sẽ trôi qua rất nhanh. Một cuộc trò chuyện nếu chỉ chăm chăm chứng minh mình đúng thường sẽ thua ở tầng quan hệ.

### Điểm hữu ích thật sự

Với người thiếu tự tin, cuốn sách giúp họ có vài điểm tựa khi bước vào giao tiếp. Không cần trở thành người hoạt ngôn. Chỉ cần biết lắng nghe kỹ hơn, hỏi đúng hơn, và bớt phản ứng vội, nhiều cuộc trò chuyện đã nhẹ đi.

Đắc Nhân Tâm cũng hữu ích vì nó kéo sự chú ý khỏi cái tôi. Thay vì hỏi "mình nói sao cho hay?", sách gợi câu hỏi "người đối diện đang cần được hiểu ở điểm nào?".

### Điểm nên tự kiểm tra trước khi mua

Trước khi mua, nên xem bản dịch, nhà xuất bản và cách trình bày. Đây là sách kinh điển có nhiều bản, nên trải nghiệm đọc phụ thuộc khá nhiều vào bản in. Về nội dung, hãy chuẩn bị tinh thần rằng một số ví dụ sẽ cũ và cần được đọc chọn lọc.

## Đọc sao để không biến giao tiếp thành công thức lấy lòng

Với Đắc Nhân Tâm, cách đọc quan trọng hơn rất nhiều so với việc nhớ hết nguyên tắc. Nếu đọc với tâm thế "làm sao để ai cũng thích mình", bạn sẽ dễ biến giao tiếp thành biểu diễn. Nhưng nếu đọc với câu hỏi "làm sao để mình bớt làm người khác phòng thủ", cuốn sách trở nên thực tế hơn.

Người mới đi làm thường bị kẹt giữa hai cực: hoặc im lặng vì sợ sai, hoặc cố chứng minh mình đúng. Đắc Nhân Tâm giúp mở ra một cực thứ ba: nói chuyện để hiểu nhau hơn. Điều này không làm bạn yếu đi. Ngược lại, nó giúp bạn có thêm khoảng mềm trong những cuộc trao đổi căng.

Một ứng dụng nhỏ là trước khi góp ý, hãy thử gọi tên điểm bạn thật sự ghi nhận ở người kia. Không phải khen cho có, mà là tìm phần đúng, phần đáng trân trọng. Khi một người cảm thấy được nhìn nhận, họ thường bớt phải dựng hàng rào tự vệ.

## Ai nên đọc

- Người mới đi làm muốn giao tiếp bớt căng.
- Người thiếu tự tin khi nói chuyện với đồng nghiệp, khách hàng hoặc cấp trên.
- Người muốn cải thiện quan hệ công việc bằng sự chân thành.
- Người kinh doanh cần hiểu tâm lý giao tiếp cơ bản.

## Ai không nên đọc

- Người tìm sách giao tiếp hiện đại, nhiều nghiên cứu mới.
- Người muốn công thức nói chuyện để kiểm soát người khác.
- Người không muốn tự soi lại thái độ của mình trong giao tiếp.

## Điểm hạn chế

Điểm cần tỉnh táo là Đắc Nhân Tâm rất dễ bị đọc lệch thành kỹ thuật lấy lòng. Nếu thiếu sự chân thành, các nguyên tắc trong sách có thể biến thành thao túng mềm. Đây là lý do nên đọc chậm và luôn hỏi: mình đang muốn kết nối thật, hay đang muốn người khác phản ứng theo ý mình?

## Nên đọc cuốn này như thế nào

Đọc cuốn này tốt nhất là chọn một nguyên tắc để thử trong một tuần. Ví dụ: bớt chỉ trích vội, khen cụ thể hơn, hoặc lắng nghe lâu hơn trước khi phản hồi. Nếu muốn đọc tiếp theo mạch giao tiếp, bạn có thể xem thêm chủ đề [giao tiếp kém](/noi-dau/giao-tiep-kem).`;
}

function doiNganContent() {
  return `Có những buổi sáng bạn thức dậy và không có gì thật sự sụp đổ, nhưng bên trong lại rất ì. Công việc vẫn đó, tin nhắn vẫn đó, kế hoạch vẫn đó, chỉ có mình là chưa nhúc nhích. Cảm giác thiếu một cú hích nhỏ đôi khi không cần một bài học lớn. Nó cần một câu nhắc vừa đủ để mình ngồi dậy.

Đời Ngắn Đừng Ngủ Dài phù hợp với những ngày như vậy. Đây không phải cuốn sách có hệ thống phương pháp chặt chẽ. Nó giống một tập ghi chú ngắn, đọc nhanh, dễ gặp một câu khiến mình khựng lại.

## Một cuốn sách cho lúc bạn cần bắt đầu lại nhẹ

Người mất phương hướng thường không thiếu lời khuyên. Họ thiếu năng lượng để làm điều đầu tiên. Khi một mục tiêu quá lớn, chỉ nghĩ đến nó đã đủ mệt. Đời Ngắn Đừng Ngủ Dài không cố giải thích hết mọi nguyên nhân của sự trì hoãn. Nó tạo cảm giác có ai đó vỗ nhẹ vai và nói: làm một việc nhỏ thôi.

Đó là lý do cuốn sách này nên được đọc như một cú chạm, không phải giáo trình.

## Review chi tiết: cuốn sách này đáng ở điểm nào?

Điểm đáng đọc của Đời Ngắn Đừng Ngủ Dài là nhịp ngắn. Mỗi đoạn giống một mẩu suy nghĩ, dễ đọc trong lúc đi cà phê, trước khi làm việc, hoặc khi bạn không còn sức cho một cuốn sách dày. Với người đang lười bắt đầu, độ ngắn này lại là ưu điểm.

Cuốn sách nhắc nhiều đến thời gian, sự chủ động và cách sống tỉnh táo hơn. Không phải ý nào cũng mới, nhưng có những câu đúng lúc sẽ có tác dụng hơn một lý thuyết dài.

### Điểm hữu ích thật sự

Sách hữu ích khi bạn cần chuyển từ trạng thái nằm yên sang một hành động nhỏ. Nó không bắt bạn lập kế hoạch 90 ngày, không yêu cầu thay đổi toàn bộ cuộc đời. Nó chỉ tạo một lực đẩy ban đầu.

Nếu bạn đang trì hoãn vì mọi thứ quá nặng, cuốn này có thể giúp hạ kỳ vọng xuống: làm một việc nhỏ, trả lời một tin nhắn, mở lại một tài liệu, dọn một góc bàn, đi bộ mười phút.

### Điểm nên tự kiểm tra trước khi mua

Trước khi mua, nên xem thử văn phong có hợp không. Nếu bạn thích sách có nghiên cứu, hệ thống bài tập và dẫn chứng sâu, cuốn này có thể chưa đủ. Nếu bạn thích đọc ngắn, đọc từng đoạn và lấy một câu làm điểm tựa, nó sẽ hợp hơn.

## Cú hích nhỏ có giá trị khi nó kéo bạn về hành động

Điểm dễ thương của Đời Ngắn Đừng Ngủ Dài là nó không đòi người đọc phải suy ngẫm quá phức tạp. Có những lúc ta không thiếu phân tích. Ta thiếu một chuyển động. Một cuốn sách ngắn, nếu gặp đúng thời điểm, có thể làm nhiệm vụ đó: kéo mình ra khỏi trạng thái nằm yên.

Nhưng cú hích chỉ có giá trị khi nó dẫn tới hành động. Nếu đọc xong thấy hăng hái trong mười phút rồi lại quay về vòng cũ, cuốn sách chưa thật sự đi vào đời sống. Vì vậy, cách đọc tốt hơn là luôn đi kèm một hành động nhỏ. Đọc một đoạn về thời gian, hãy dọn một việc bị treo. Đọc một đoạn về chủ động, hãy nhắn một tin cần nhắn. Đọc một đoạn về sống tỉnh táo, hãy tắt một thứ đang kéo mình đi.

Cuốn này không cần được đọc một mạch. Nó hợp với kiểu đọc nhặt từng đoạn, giống như đặt vài tờ giấy nhắc nhỏ trong ngày.

Với người mới đi làm hoặc sinh viên, giá trị của cuốn sách còn nằm ở cảm giác "mình vẫn có thể bắt đầu lại". Không phải bắt đầu bằng một kế hoạch lớn, mà bằng một việc đủ nhỏ để lấy lại nhịp. Khi đang thiếu tự tin, một hành động nhỏ hoàn thành được đôi khi quan trọng hơn một lời hứa thật đẹp.

## Ai nên đọc

- Sinh viên hoặc người mới đi làm đang thiếu động lực.
- Người biết mình cần bắt đầu nhưng cứ để sang ngày khác.
- Người muốn một cuốn sách nhẹ, đọc được từng đoạn ngắn.
- Người đang cần tự nhắc mình sống chủ động hơn.

## Ai không nên đọc

- Người muốn một phương pháp thay đổi thói quen chi tiết.
- Người không thích văn phong truyền cảm hứng.
- Người đang cần hỗ trợ chuyên môn cho vấn đề sức khỏe tinh thần.

## Điểm hạn chế

Đời Ngắn Đừng Ngủ Dài không phải cuốn sách đi sâu vào nguyên nhân tâm lý. Một số ý khá quen nếu bạn đã đọc nhiều sách phát triển bản thân. Vì vậy, đừng kỳ vọng nó thay bạn giải quyết mọi thứ. Hãy xem nó như một nguồn nhắc nhẹ.

## Nên đọc cuốn này như thế nào

Đọc mỗi ngày vài trang là đủ. Khi gặp một câu khiến bạn muốn hành động, hãy dừng lại và làm ngay một việc nhỏ. Nếu đang ở giai đoạn mất phương hướng, bạn cũng có thể đọc thêm bài [5 cuốn sách nên đọc khi bạn đang mất phương hướng](/bai-viet/5-cuon-sach-nen-doc-khi-ban-dang-mat-phuong-huong) để chọn bước tiếp theo.`;
}

function topListContent() {
  return `Có những giai đoạn bạn không hẳn buồn, cũng không hẳn thất bại, nhưng cứ thấy mình đi không rõ hướng. Công việc vẫn chạy, lịch vẫn kín, tin nhắn vẫn trả lời, chỉ có cảm giác bên trong là lạc nhịp. Bạn không biết mình cần nghỉ ngơi, cần đổi việc, cần học thêm, hay chỉ cần ai đó giúp gọi tên điều đang rối.

Khi đang mất phương hướng, chọn sách cũng không nên bắt đầu bằng câu hỏi "cuốn nào hay nhất?". Câu hỏi đúng hơn là: mình đang lạc theo kiểu nào? Lạc vì không còn nghe thấy điều mình muốn? Lạc vì trì hoãn quá lâu? Lạc vì sống theo ánh nhìn người khác? Hay lạc vì giao tiếp và công việc làm mình thấy nhỏ lại?

Danh sách dưới đây không xếp hạng sách theo kiểu cuốn nào hơn cuốn nào. Mỗi cuốn giữ một vai trò khác nhau. Có cuốn để làm bạn dịu lại, có cuốn kéo bạn đứng dậy, có cuốn giúp xây lại hệ thống, có cuốn đặt lại ranh giới, có cuốn làm mềm cách bạn bước vào các mối quan hệ. Khi đọc, hãy chọn theo trạng thái hiện tại thay vì chọn theo độ nổi tiếng.

## 1. Nhà Giả Kim: khi bạn cần nghe lại điều mình thật sự muốn

Nhà Giả Kim hợp với những ngày bạn không cần thêm checklist. Bạn cần một câu chuyện. Cuốn sách kể về hành trình đi tìm kho báu, nhưng điều còn lại thường không phải kho báu theo nghĩa vật chất. Nó là cảm giác muốn nhìn lại điều mình đang theo đuổi.

Với người mất phương hướng, điểm đáng đọc của Nhà Giả Kim là sự dịu. Nó không ép bạn phải quyết định ngay. Nó chỉ đặt người đọc vào một hành trình biểu tượng, nơi mỗi bước đi bên ngoài cũng là một câu hỏi bên trong.

### Điểm nên cân nhắc

Nếu bạn thích sách thực dụng, có bài tập rõ ràng và hướng dẫn từng bước, Nhà Giả Kim có thể hơi mơ hồ. Cuốn này hợp hơn khi bạn đang cần một câu chuyện để mở lại cảm giác sống, không phải một bản kế hoạch.

## 2. Đời Ngắn Đừng Ngủ Dài: khi bạn cần một cú hích nhỏ

Có kiểu mất phương hướng đến từ việc nghĩ quá nhiều nhưng làm quá ít. Bạn biết mình nên bắt đầu, nhưng cứ chờ một ngày đủ hứng. Đời Ngắn Đừng Ngủ Dài hợp với trạng thái đó vì nó ngắn, dễ đọc, và có nhiều đoạn như một lời nhắc.

Cuốn này không sâu như một giáo trình phát triển bản thân, nhưng lại có lợi thế là dễ chạm. Khi năng lượng thấp, một đoạn ngắn đúng lúc có thể hữu ích hơn một chương dài đầy lý thuyết.

### Điểm nên cân nhắc

Nếu bạn đã đọc nhiều self-help, một số ý sẽ quen. Đừng mua cuốn này với kỳ vọng nó đưa ra hệ thống thay đổi toàn diện. Hãy mua nếu bạn cần một cuốn để đọc từng chút, tự nhắc mình đứng dậy làm điều nhỏ.

## 3. Atomic Habits: khi bạn cần hệ thống thay vì động lực

Không phải ai mất phương hướng cũng thiếu ước mơ. Có người biết khá rõ mình muốn gì, nhưng đời sống hằng ngày không nâng đỡ điều đó. Ngủ trễ, trì hoãn, làm việc theo cảm xúc, bắt đầu rồi bỏ dở. Khi đó, vấn đề không chỉ là cảm hứng mà là hệ thống.

Atomic Habits giúp người đọc nhìn thói quen như một chuỗi có thể thiết kế lại. Thay vì tự trách mình lười, bạn học cách làm hành vi tốt dễ bắt đầu hơn và hành vi xấu khó xảy ra hơn.

### Điểm nên cân nhắc

Sách thiên về phương pháp, nên có thể hơi khô nếu bạn đang cần được an ủi. Nó hợp nhất khi bạn đã sẵn sàng sửa một hành vi cụ thể: đọc đều hơn, ngủ đúng giờ hơn, học ngoại ngữ đều hơn, hoặc giảm thời gian lướt điện thoại.

## 4. Dám Bị Ghét: khi bạn lạc hướng vì sống theo ánh nhìn người khác

Một số người mất phương hướng không phải vì không có lựa chọn, mà vì lựa chọn nào cũng bị phủ bởi câu hỏi: người khác sẽ nghĩ gì? Gia đình có thất vọng không? Đồng nghiệp có đánh giá không? Bạn bè có thấy mình kỳ lạ không?

Dám Bị Ghét đáng đọc khi bạn mệt vì nhu cầu được công nhận. Cuốn sách không dễ chịu hoàn toàn, nhưng nó gợi một câu hỏi quan trọng: phần nào trong đời là nhiệm vụ của mình, phần nào mình đang ôm thay người khác?

### Điểm nên cân nhắc

Một số luận điểm trong sách gây tranh luận. Nếu đang có tổn thương sâu, đừng đọc nó như lời phán quyết rằng mọi vấn đề chỉ nằm ở lựa chọn cá nhân. Hãy đọc như một cuộc đối thoại để soi lại ranh giới.

## 5. Đắc Nhân Tâm: khi bạn thấy mình lạc lõng trong quan hệ và công việc

Mất phương hướng đôi khi xuất hiện trong môi trường làm việc: bạn không biết nói sao cho đúng, góp ý sao cho không làm người khác khó chịu, hay làm sao để được lắng nghe mà không phải gồng lên. Đắc Nhân Tâm có thể là điểm bắt đầu cơ bản cho kiểu lạc này.

Điểm đáng giữ của cuốn sách không phải là kỹ thuật lấy lòng. Nó là lời nhắc về sự quan tâm thật lòng, lắng nghe và tôn trọng cảm giác của người đối diện.

### Điểm nên cân nhắc

Sách có nhiều ví dụ cũ và rất dễ bị đọc lệch thành công thức thao túng. Nếu đọc, hãy giữ một nguyên tắc: mọi kỹ năng giao tiếp chỉ có giá trị khi nó đi cùng sự chân thành.

## Nên bắt đầu từ cuốn nào?

Nếu bạn đang rất mệt, hãy bắt đầu bằng Đời Ngắn Đừng Ngủ Dài vì nó nhẹ và dễ vào. Nếu bạn đang cần một câu chuyện để lắng nghe lại mình, chọn Nhà Giả Kim. Nếu bạn đã biết vấn đề nằm ở thói quen, chọn Atomic Habits. Nếu bạn đang mắc kẹt trong ánh nhìn người khác, Dám Bị Ghét sẽ đáng để đối thoại. Nếu vấn đề nằm ở giao tiếp và môi trường công việc, Đắc Nhân Tâm là một nền tảng cơ bản.

Điều quan trọng là đừng chọn sách vì nó nổi tiếng nhất. Hãy chọn cuốn gần với trạng thái hiện tại nhất.

## Một lộ trình đọc nhẹ trong 7 ngày

Nếu bạn không biết bắt đầu sao, hãy chia việc đọc thành một lộ trình rất nhẹ. Ngày đầu tiên, đọc vài trang Nhà Giả Kim để dịu lại và viết ra một câu hỏi: mình đang thật sự muốn điều gì? Ngày thứ hai, đọc Đời Ngắn Đừng Ngủ Dài và làm một việc nhỏ đã trì hoãn. Ngày thứ ba, mở Atomic Habits để chọn một thói quen cần thiết kế lại.

Ngày thứ tư và thứ năm, đọc Dám Bị Ghét chậm hơn. Đừng cố đồng ý ngay. Chỉ cần ghi lại chỗ nào khiến bạn thấy bị chạm. Ngày thứ sáu, đọc Đắc Nhân Tâm và thử áp dụng một điều trong giao tiếp: lắng nghe lâu hơn, khen cụ thể hơn, hoặc bớt phản ứng vội. Ngày thứ bảy, nhìn lại: cuốn nào khiến bạn muốn hành động thật nhất?

Lộ trình này không phải công thức. Nó chỉ giúp bạn thoát khỏi cảm giác đứng trước quá nhiều lựa chọn. Khi đang mất phương hướng, đôi khi điều cần nhất không phải là chọn đúng tuyệt đối, mà là chọn một điểm bắt đầu đủ gần.

## Điểm nên tự kiểm tra trước khi mua

Trước khi mua, hãy xem bản dịch, nhà xuất bản, mục lục và vài phản hồi về chất lượng in. Với sách affiliate, điều nên tránh là mua vì cảm xúc nhất thời. Một cuốn sách hợp không hứa thay đổi cuộc đời bạn, nhưng nó có thể giúp bạn gọi tên một vấn đề rõ hơn.

## Nếu bạn chỉ chọn một cuốn...

Hãy chọn Nhà Giả Kim nếu bạn chưa biết mình đang muốn gì. Hãy chọn Atomic Habits nếu bạn đã biết nhưng không làm được. Và nếu bạn chỉ còn đủ năng lượng cho một điều nhỏ hôm nay, hãy đọc vài trang Đời Ngắn Đừng Ngủ Dài rồi làm ngay một việc nhỏ.

Bạn cũng có thể đọc tiếp các bài cùng mạch như [Đời Ngắn Đừng Ngủ Dài cho những ngày thiếu một cú hích nhỏ](/bai-viet/doi-ngan-dung-ngu-dai-cho-nhung-ngay-thieu-mot-cu-hich-nho), [Dám Bị Ghét và nỗi mệt vì luôn cần được công nhận](/bai-viet/dam-bi-ghet-va-noi-met-vi-luon-can-duoc-cong-nhan), hoặc xem thêm chủ đề [mất phương hướng](/noi-dau/mat-phuong-huong).`;
}

function sampleDetailedReview(bookTitle: string, pain: string) {
  const normalizedPain = pain.toLocaleLowerCase("vi");
  const angle = detailedReviewAngle(bookTitle);

  return `## Review chi tiết: cuốn sách này đáng ở điểm nào?

Ở góc nhìn của một người đọc chậm và có ghi chú, ${bookTitle} không nên được đánh giá chỉ bằng câu hỏi "hay không?". Câu hỏi đúng hơn là: cuốn sách này có giúp người đang ${normalizedPain} nhìn vấn đề rõ hơn không, và sau khi gấp sách lại họ có giữ được một ý đủ cụ thể để thử không?

${angle.impression}

### Khi đối chiếu với phản hồi người mua

Với review từ Shopee hoặc các sàn sách, phần đáng lấy không phải là từng lời khen chê riêng lẻ. Điều hữu ích hơn là nhìn xem người mua thường phản hồi về điều gì: sách có dễ đọc không, bản in có ổn không, nội dung có thực tế với đời sống không, và điểm nào khiến họ thấy chưa thỏa mãn.

${angle.reviewSignal}

### Điểm làm cuốn sách đáng cân nhắc

${angle.strength}

### Điểm nên đọc tỉnh táo

${angle.caveat}`;
}

function detailedReviewAngle(bookTitle: string) {
  const title = bookTitle.toLocaleLowerCase("vi");

  if (title.includes("atomic habits")) {
    return {
      impression:
        "Điểm đáng giá của Atomic Habits là nó không đẩy người đọc vào cảm giác phải có ý chí phi thường. Sách kéo câu chuyện thói quen về những lựa chọn nhỏ: đặt đồ vật ở đâu, bắt đầu trong bao lâu, làm sao để hành vi tốt bớt khó và hành vi xấu bớt thuận tiện.",
      reviewSignal:
        "Khi tổng hợp review người mua cho cuốn này, nên chú ý các tín hiệu như: người đọc có thấy ví dụ dễ áp dụng không, có bắt đầu được một thói quen nhỏ không, hay chỉ thấy sách lặp lại những ý quen thuộc về kỷ luật.",
      strength:
        "Cuốn sách mạnh ở tính hệ thống. Nó giúp người đọc bớt tự trách mình lười, thay vào đó nhìn lại môi trường, nhịp sinh hoạt và cách mình thiết kế bước bắt đầu.",
      caveat:
        "Nếu bạn đang cần một cuốn sách chữa lành cảm xúc sâu, Atomic Habits có thể hơi khô. Nó hợp hơn khi bạn muốn sửa hành vi cụ thể và sẵn sàng thử nghiệm từng bước nhỏ.",
    };
  }

  if (title.includes("đời ngắn")) {
    return {
      impression:
        "Đời Ngắn Đừng Ngủ Dài có nhịp ngắn, dễ đọc, giống những mẩu nhắc nhở hơn là một hệ thống phương pháp đầy đủ. Giá trị của sách nằm ở cảm giác được kéo dậy vừa đủ trong những ngày mình biết cần làm gì đó nhưng vẫn cứ đứng yên.",
      reviewSignal:
        "Khi tổng hợp review người mua, nên để ý họ thích sự ngắn gọn, cảm hứng tức thì hay sự dễ đọc. Đồng thời cũng cần ghi nhận nếu có người thấy sách chưa đủ sâu hoặc các ý khá quen với người đọc nhiều self-help.",
      strength:
        "Sách hợp với người cần một cú chạm nhẹ. Nó không cố giải thích mọi thứ, nhưng có thể khiến bạn muốn đứng dậy làm một việc nhỏ ngay hôm nay.",
      caveat:
        "Điểm hạn chế là sách không đưa ra nhiều khung thực hành chi tiết. Nếu đọc với kỳ vọng có một lộ trình rõ từng bước, bạn có thể thấy chưa đủ.",
    };
  }

  if (title.includes("đắc nhân tâm")) {
    return {
      impression:
        "Đắc Nhân Tâm đáng đọc nhất khi không xem nó như bộ mẹo để khiến người khác thích mình. Nếu đọc chậm, cuốn sách đặt ra một câu hỏi khá khó: mình đang giao tiếp để kết nối thật, hay chỉ để thắng, để được công nhận, để điều khiển phản ứng của người khác?",
      reviewSignal:
        "Khi tổng hợp review người mua, nên chú ý hai lớp phản hồi: một bên thường khen sách dễ hiểu, kinh điển, ứng dụng được trong công việc; bên còn lại có thể băn khoăn vì ví dụ cũ hoặc sợ cách áp dụng bị công thức hóa.",
      strength:
        "Điểm mạnh là cuốn sách nhắc người đọc quay lại với sự quan tâm thật lòng. Trong môi trường làm việc, chỉ riêng việc bớt chỉ trích vội và biết lắng nghe đã có thể làm nhiều cuộc trò chuyện nhẹ hơn.",
      caveat:
        "Điểm cần tỉnh táo là không nên biến các nguyên tắc trong sách thành kỹ thuật lấy lòng. Nếu thiếu sự chân thành, những điều sách nói rất dễ trượt sang thao túng.",
    };
  }

  if (title.includes("nhà giả kim")) {
    return {
      impression:
        "Nhà Giả Kim không phải cuốn sách để tìm một kế hoạch hành động rõ ràng. Nó giống một câu chuyện biểu tượng, nơi hành trình bên ngoài phản chiếu câu hỏi bên trong: mình thật sự đang theo đuổi điều gì, và vì sao mình cứ trì hoãn tiếng gọi đó?",
      reviewSignal:
        "Khi tổng hợp review người mua, nên chú ý cảm giác sau khi đọc: người đọc thấy được an ủi, được truyền cảm hứng, hay thấy thông điệp quá mơ hồ. Cả hai phản hồi này đều quan trọng vì cuốn sách phụ thuộc nhiều vào thời điểm người đọc gặp nó.",
      strength:
        "Điểm mạnh của sách là tạo dư âm. Nó không ép người đọc phải thay đổi ngay, mà khơi lại cảm giác muốn lắng nghe trực giác và can đảm bước tiếp.",
      caveat:
        "Nếu bạn thích sách thực dụng, nhiều ví dụ công việc hoặc bài tập cụ thể, Nhà Giả Kim có thể khiến bạn thấy thiếu điểm bám.",
    };
  }

  if (title.includes("dám bị ghét")) {
    return {
      impression:
        "Dám Bị Ghét là kiểu sách dễ gây phản ứng trái chiều. Nó không vỗ về người đọc quá lâu, mà liên tục đặt lại ranh giới giữa điều thuộc về mình và điều thuộc về người khác.",
      reviewSignal:
        "Khi tổng hợp review người mua, nên chú ý phản hồi về mức độ 'khó nuốt' của lập luận, dạng đối thoại, và cảm giác được giải phóng khỏi nhu cầu làm vừa lòng mọi người. Những ý gây tranh luận chính là chất liệu cần phân tích kỹ.",
      strength:
        "Cuốn sách mạnh ở khả năng làm người hay overthinking dừng lại trước câu hỏi: mình có đang sống quá nhiều trong ánh nhìn của người khác không?",
      caveat:
        "Không nên đọc sách như một kết luận tâm lý tuyệt đối. Một số luận điểm cần được đặt cạnh bối cảnh sống thật, nhất là khi người đọc đang có tổn thương sâu.",
    };
  }

  return {
    impression:
      `${bookTitle} đáng chú ý khi được đọc như một cuộc đối thoại với vấn đề hiện tại, không phải như một đáp án có sẵn. Điều cần quan sát là sau mỗi chương, người đọc có gọi tên được một cảm giác, một thói quen hoặc một lựa chọn rõ hơn không.`,
    reviewSignal:
      "Khi tổng hợp review người mua, nên tìm các mẫu lặp: điều gì khiến họ thấy sách hữu ích, điều gì khiến họ băn khoăn, và nhóm người nào có vẻ nhận được nhiều giá trị nhất.",
    strength:
      "Điểm mạnh của sách nằm ở khả năng mở ra một cách nhìn mới đủ gần với đời sống, để người đọc có thể thử áp dụng mà không thấy bị thúc ép.",
    caveat:
      "Điểm cần cân nhắc là không cuốn sách nào hợp với mọi người. Càng đọc sách theo nhu cầu cá nhân, bạn càng cần giữ quyền nghi ngờ và chọn lọc.",
  };
}

async function main() {
  for (const name of categories) {
    const slug = slugify(name);
    await prisma.category.upsert({
      where: { slug },
      update: {
        name,
        description: `Các bài viết và sách thuộc nhóm ${name.toLowerCase()}, được nhìn từ nhu cầu thực tế của người đọc.`,
        seoTitle: `${name} - review sách theo nhu cầu`,
        seoDescription: `Gợi ý sách ${name.toLowerCase()} theo vấn đề, cảm xúc và đối tượng đọc.`,
      },
      create: {
        name,
        slug,
        description: `Các bài viết và sách thuộc nhóm ${name.toLowerCase()}, được nhìn từ nhu cầu thực tế của người đọc.`,
        seoTitle: `${name} - review sách theo nhu cầu`,
        seoDescription: `Gợi ý sách ${name.toLowerCase()} theo vấn đề, cảm xúc và đối tượng đọc.`,
      },
    });
  }

  for (const name of painPoints) {
    const slug = slugify(name);
    await prisma.painPoint.upsert({
      where: { slug },
      update: {
        name,
        description: `Gợi ý sách cho người đang trải qua ${name.toLowerCase()} và muốn tìm một điểm tựa vừa đủ.`,
      },
      create: {
        name,
        slug,
        description: `Gợi ý sách cho người đang trải qua ${name.toLowerCase()} và muốn tìm một điểm tựa vừa đủ.`,
      },
    });
  }

  for (const name of audiences) {
    const slug = slugify(name);
    await prisma.audience.upsert({
      where: { slug },
      update: {
        name,
        description: `Gợi ý sách được chọn theo bối cảnh của ${name.toLowerCase()}.`,
      },
      create: {
        name,
        slug,
        description: `Gợi ý sách được chọn theo bối cảnh của ${name.toLowerCase()}.`,
      },
    });
  }

  const books: Array<Book & { seed: (typeof bookSeeds)[number] }> = [];
  for (const seed of bookSeeds) {
    const slug = slugify(seed.title);
    const book = await prisma.book.upsert({
      where: { slug },
      update: {
        title: seed.title,
        author: seed.author,
        publisher: seed.publisher,
        description: seed.description,
        shopeeAffiliateUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(seed.title)}`,
        status: BookStatus.ACTIVE,
        pros: seed.pros,
        cons: seed.cons,
        keyLessons: seed.keyLessons,
        suitableFor: seed.suitableFor,
        notSuitableFor: seed.notSuitableFor,
        categories: { set: [], connect: seed.categorySlugs.map((item) => ({ slug: item })) },
        painPoints: { set: [], connect: seed.painSlugs.map((item) => ({ slug: item })) },
        audiences: { set: [], connect: seed.audienceSlugs.map((item) => ({ slug: item })) },
      },
      create: {
        title: seed.title,
        slug,
        author: seed.author,
        publisher: seed.publisher,
        description: seed.description,
        shopeeAffiliateUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(seed.title)}`,
        status: BookStatus.ACTIVE,
        pros: seed.pros,
        cons: seed.cons,
        keyLessons: seed.keyLessons,
        suitableFor: seed.suitableFor,
        notSuitableFor: seed.notSuitableFor,
        categories: { connect: seed.categorySlugs.map((item) => ({ slug: item })) },
        painPoints: { connect: seed.painSlugs.map((item) => ({ slug: item })) },
        audiences: { connect: seed.audienceSlugs.map((item) => ({ slug: item })) },
      },
    });
    books.push({ ...book, seed });

    await prisma.affiliateLink.upsert({
      where: { trackingSlug: `book-${slug}` },
      update: {
        bookId: book.id,
        label: `Xem giá ${seed.title}`,
        destinationUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(seed.title)}`,
        isActive: true,
      },
      create: {
        bookId: book.id,
        label: `Xem giá ${seed.title}`,
        destinationUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(seed.title)}`,
        trackingSlug: `book-${slug}`,
        isActive: true,
      },
    });
  }

  const articleSeeds = [
    {
      title: "Atomic Habits có hợp với người hay trì hoãn không?",
      type: ArticleType.REVIEW,
      book: "Atomic Habits",
      relatedBooks: [],
      categorySlugs: ["phat-trien-ban-than"],
      painSlugs: ["tri-hoan", "thieu-ky-luat"],
      audienceSlugs: ["nguoi-moi-di-lam", "dan-van-phong"],
      excerpt:
        "Một góc nhìn mềm hơn về kỷ luật: bắt đầu từ hệ thống nhỏ thay vì tự trách bản thân vì thiếu động lực.",
      seoTitle: "Atomic Habits có hợp với người hay trì hoãn?",
      seoDescription:
        "Review Atomic Habits cho người hay trì hoãn: vì sao sách hữu ích, điểm hạn chế và cách đọc để xây thói quen nhẹ nhàng hơn.",
      focusKeyword: "Atomic Habits cho người hay trì hoãn",
      faqs: [
        [
          "Atomic Habits có hợp với người mới bắt đầu xây thói quen không?",
          "Có. Sách phù hợp vì giải thích thói quen bằng các bước nhỏ, dễ thử trong đời sống hằng ngày.",
        ],
        [
          "Cuốn này có phù hợp nếu tôi đang kiệt sức không?",
          "Nếu bạn đang kiệt sức nặng, hãy ưu tiên nghỉ ngơi và hỗ trợ chuyên môn. Atomic Habits hợp hơn khi bạn đã sẵn sàng sửa một hành vi nhỏ.",
        ],
      ],
    },
    {
      title: "5 cuốn sách nên đọc khi bạn đang mất phương hướng",
      type: ArticleType.TOP_LIST,
      book: "Nhà Giả Kim",
      relatedBooks: [
        "Nhà Giả Kim",
        "Đời Ngắn Đừng Ngủ Dài",
        "Atomic Habits",
        "Dám Bị Ghét",
        "Đắc Nhân Tâm",
      ],
      categorySlugs: ["van-hoc-chua-lanh", "phat-trien-ban-than"],
      painSlugs: ["mat-phuong-huong"],
      audienceSlugs: ["sinh-vien", "nguoi-tuoi-25-35"],
      excerpt:
        "Không phải danh sách để ép bạn thay đổi ngay, mà là vài điểm tựa cho những ngày chưa biết mình nên đi đâu.",
      seoTitle: "5 cuốn sách nên đọc khi mất phương hướng",
      seoDescription:
        "Gợi ý 5 cuốn sách cho người đang mất phương hướng, chọn theo từng trạng thái: cần dịu lại, cần bắt đầu, cần hệ thống hoặc cần ranh giới.",
      focusKeyword: "sách nên đọc khi mất phương hướng",
      faqs: [
        [
          "Đang mất phương hướng nên bắt đầu với cuốn nào?",
          "Nếu bạn cần dịu lại, hãy bắt đầu với Nhà Giả Kim. Nếu bạn cần hành động nhỏ ngay, Đời Ngắn Đừng Ngủ Dài dễ vào hơn.",
        ],
        [
          "Có nên mua cả 5 cuốn cùng lúc không?",
          "Không cần. Nên chọn một cuốn gần nhất với trạng thái hiện tại, đọc xong rồi mới chọn cuốn tiếp theo.",
        ],
      ],
    },
    {
      title: "Dám Bị Ghét và nỗi mệt vì luôn cần được công nhận",
      type: ArticleType.REVIEW,
      book: "Dám Bị Ghét",
      relatedBooks: [],
      categorySlugs: ["tam-ly-hoc"],
      painSlugs: ["overthinking", "thieu-tu-tin"],
      audienceSlugs: ["nguoi-huong-noi", "dan-van-phong"],
      excerpt:
        "Cuốn sách không dễ đồng ý hoàn toàn, nhưng đáng đọc nếu bạn thường tự đo giá trị mình bằng ánh nhìn người khác.",
      seoTitle: "Dám Bị Ghét review cho người hay overthinking",
      seoDescription:
        "Review Dám Bị Ghét cho người mệt vì cần được công nhận: điểm đáng đọc, điểm gây tranh luận và cách đọc tỉnh táo.",
      focusKeyword: "Dám Bị Ghét review",
      faqs: [
        [
          "Dám Bị Ghét có dễ đọc không?",
          "Sách viết theo dạng đối thoại nên dễ theo dõi, nhưng một số luận điểm có thể gây phản ứng và cần đọc chậm.",
        ],
        [
          "Cuốn này có thay thế trị liệu tâm lý không?",
          "Không. Đây là sách gợi mở góc nhìn, không thay thế hỗ trợ chuyên môn khi bạn đang có vấn đề tâm lý nghiêm trọng.",
        ],
      ],
    },
    {
      title: "Đắc Nhân Tâm còn đáng đọc cho người mới đi làm?",
      type: ArticleType.REVIEW,
      book: "Đắc Nhân Tâm",
      relatedBooks: [],
      categorySlugs: ["giao-tiep", "ky-nang-song"],
      painSlugs: ["giao-tiep-kem", "thieu-tu-tin"],
      audienceSlugs: ["nguoi-moi-di-lam", "dan-van-phong"],
      excerpt:
        "Đọc lại một cuốn kinh điển giao tiếp với thái độ tỉnh táo: giữ phần chân thành, bỏ phần công thức hóa con người.",
      seoTitle: "Đắc Nhân Tâm có còn đáng đọc cho người mới đi làm?",
      seoDescription:
        "Review Đắc Nhân Tâm cho người mới đi làm: điểm còn hữu ích, điểm nên đọc tỉnh táo và cách tránh biến giao tiếp thành lấy lòng.",
      focusKeyword: "Đắc Nhân Tâm cho người mới đi làm",
      faqs: [
        [
          "Đắc Nhân Tâm có lỗi thời không?",
          "Một số ví dụ đã cũ, nhưng các nguyên tắc về lắng nghe, tôn trọng và quan tâm thật lòng vẫn có giá trị nếu đọc chọn lọc.",
        ],
        [
          "Có nên dùng Đắc Nhân Tâm để lấy lòng người khác không?",
          "Không. Cuốn sách chỉ nên được đọc như lời nhắc về giao tiếp chân thành, không phải kỹ thuật thao túng.",
        ],
      ],
    },
    {
      title: "Đời Ngắn Đừng Ngủ Dài cho những ngày thiếu một cú hích nhỏ",
      type: ArticleType.STORY,
      book: "Đời Ngắn Đừng Ngủ Dài",
      relatedBooks: [],
      categorySlugs: ["phat-trien-ban-than"],
      painSlugs: ["mat-phuong-huong", "thieu-tu-tin"],
      audienceSlugs: ["sinh-vien", "nguoi-moi-di-lam"],
      excerpt:
        "Một cuốn sách ngắn có thể không giải quyết mọi thứ, nhưng đôi khi đủ để bạn ngồi dậy và làm một việc nhỏ.",
      seoTitle: "Đời Ngắn Đừng Ngủ Dài review cho ngày thiếu động lực",
      seoDescription:
        "Review Đời Ngắn Đừng Ngủ Dài cho những ngày thiếu động lực: hợp với ai, điểm mạnh, điểm hạn chế và cách đọc hiệu quả.",
      focusKeyword: "Đời Ngắn Đừng Ngủ Dài review",
      faqs: [
        [
          "Đời Ngắn Đừng Ngủ Dài có phù hợp với người đang mất động lực không?",
          "Có, nếu bạn cần một cuốn ngắn, dễ đọc và tạo cú hích nhẹ. Sách không thay thế một phương pháp thay đổi sâu.",
        ],
        [
          "Nên đọc cuốn này như thế nào?",
          "Nên đọc từng đoạn ngắn, gặp ý nào chạm thì dừng lại và làm ngay một hành động nhỏ.",
        ],
      ],
    },
  ];

  for (const seed of articleSeeds) {
    const slug = slugify(seed.title);
    const book = seed.type === ArticleType.TOP_LIST
      ? null
      : books.find((item) => item.title === seed.book);
    if (!book && seed.type !== ArticleType.TOP_LIST) continue;
    const content = sampleContent(
      seed.book,
      painPointLabels[seed.painSlugs[0]] || seed.painSlugs[0].replace(/-/g, " "),
      seed.title,
    );
    const article = await prisma.article.upsert({
      where: { slug },
      update: {
        title: seed.title,
        excerpt: seed.excerpt,
        content,
        type: seed.type,
        status: ArticleStatus.PUBLISHED,
        seoTitle: seed.seoTitle,
        seoDescription: seed.seoDescription,
        focusKeyword: seed.focusKeyword,
        readingTime: readingTimeFromMarkdown(content),
        publishedAt: new Date(),
        categories: { set: [], connect: seed.categorySlugs.map((item) => ({ slug: item })) },
        painPoints: { set: [], connect: seed.painSlugs.map((item) => ({ slug: item })) },
        audiences: { set: [], connect: seed.audienceSlugs.map((item) => ({ slug: item })) },
      },
      create: {
        title: seed.title,
        slug,
        excerpt: seed.excerpt,
        content,
        type: seed.type,
        status: ArticleStatus.PUBLISHED,
        seoTitle: seed.seoTitle,
        seoDescription: seed.seoDescription,
        focusKeyword: seed.focusKeyword,
        readingTime: readingTimeFromMarkdown(content),
        publishedAt: new Date(),
        categories: { connect: seed.categorySlugs.map((item) => ({ slug: item })) },
        painPoints: { connect: seed.painSlugs.map((item) => ({ slug: item })) },
        audiences: { connect: seed.audienceSlugs.map((item) => ({ slug: item })) },
      },
    });

    await prisma.articleBook.deleteMany({ where: { articleId: article.id } });
    const articleBookRows = [
      ...(book
        ? [{ articleId: article.id, bookId: book.id, role: ArticleBookRole.MAIN, order: 0 }]
        : []),
      ...seed.relatedBooks
        .flatMap((bookTitle, index) => {
          const relatedBook = books.find((item) => item.title === bookTitle);
          if (!relatedBook) return [];
          return [{
            articleId: article.id,
            bookId: relatedBook.id,
            role: ArticleBookRole.RECOMMENDED,
            order: index + 1,
          }];
        }),
    ];
    if (articleBookRows.length) {
      await prisma.articleBook.createMany({
        data: articleBookRows,
        skipDuplicates: true,
      });
    }

    await prisma.fAQ.deleteMany({ where: { articleId: article.id } });
    await prisma.fAQ.createMany({
      data: seed.faqs.map(([question, answer], index) => ({
          articleId: article.id,
          question,
          answer,
          order: index + 1,
        })),
    });

    const existingArticleLink = await prisma.affiliateLink.findUnique({
      where: { trackingSlug: `article-${slug}` },
    });
    if (book) {
      await prisma.affiliateLink.upsert({
        where: { trackingSlug: `article-${slug}` },
        update: {
          articleId: article.id,
          bookId: book.id,
          label: `Xem sách gợi ý cho bài ${seed.title}`,
          destinationUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(seed.book)}`,
          isActive: true,
        },
        create: {
          articleId: article.id,
          bookId: book.id,
          label: `Xem sách gợi ý cho bài ${seed.title}`,
          destinationUrl: `https://shopee.vn/search?keyword=${encodeURIComponent(seed.book)}`,
          trackingSlug: `article-${slug}`,
          isActive: true,
        },
      });
    } else if (existingArticleLink) {
      await prisma.affiliateLink.update({
        where: { id: existingArticleLink.id },
        data: { isActive: false },
      });
    }
  }

  const clusterSeeds = [
    {
      name: "Mất phương hướng: đọc gì để bắt đầu lại nhẹ hơn",
      slug: "mat-phuong-huong-doc-gi-de-bat-dau-lai",
      description:
        "Một cụm bài dành cho người đang thấy mình đứng giữa nhiều lựa chọn, cần đọc chậm để gọi tên điều thật sự quan trọng.",
      painPointSlug: "mat-phuong-huong",
      categorySlug: "phat-trien-ban-than",
      pillarSlug: slugify("5 cuốn sách nên đọc khi bạn đang mất phương hướng"),
      articleSlugs: [
        slugify("5 cuốn sách nên đọc khi bạn đang mất phương hướng"),
        slugify("Đời Ngắn Đừng Ngủ Dài cho những ngày thiếu một cú hích nhỏ"),
        slugify("Dám Bị Ghét và nỗi mệt vì luôn cần được công nhận"),
      ],
    },
    {
      name: "Trì hoãn và thiếu kỷ luật: bắt đầu nhỏ để đi xa hơn",
      slug: "tri-hoan-thieu-ky-luat-bat-dau-nho",
      description:
        "Cụm nội dung cho người hay tự trách vì trì hoãn, nhưng cần một hệ thống nhẹ hơn thay vì thêm áp lực.",
      painPointSlug: "tri-hoan",
      categorySlug: "ky-nang-song",
      pillarSlug: slugify("Atomic Habits có hợp với người hay trì hoãn không?"),
      articleSlugs: [
        slugify("Atomic Habits có hợp với người hay trì hoãn không?"),
        slugify("Đời Ngắn Đừng Ngủ Dài cho những ngày thiếu một cú hích nhỏ"),
      ],
    },
    {
      name: "Overthinking và nhu cầu được công nhận",
      slug: "overthinking-nhu-cau-duoc-cong-nhan",
      description:
        "Một cụm đọc cho người mệt vì ánh nhìn người khác, cần phân biệt điều mình kiểm soát được và điều nên buông bớt.",
      painPointSlug: "overthinking",
      categorySlug: "tam-ly-hoc",
      pillarSlug: slugify("Dám Bị Ghét và nỗi mệt vì luôn cần được công nhận"),
      articleSlugs: [
        slugify("Dám Bị Ghét và nỗi mệt vì luôn cần được công nhận"),
        slugify("5 cuốn sách nên đọc khi bạn đang mất phương hướng"),
      ],
    },
  ];

  for (const clusterSeed of clusterSeeds) {
    const pillarArticle = await prisma.article.findUnique({
      where: { slug: clusterSeed.pillarSlug },
      select: { id: true },
    });
    const category = await prisma.category.findUnique({
      where: { slug: clusterSeed.categorySlug },
      select: { id: true },
    });
    const painPoint = await prisma.painPoint.findUnique({
      where: { slug: clusterSeed.painPointSlug },
      select: { id: true },
    });
    const cluster = await prisma.contentCluster.upsert({
      where: { slug: clusterSeed.slug },
      update: {
        name: clusterSeed.name,
        description: clusterSeed.description,
        pillarArticleId: pillarArticle?.id || null,
        categoryId: category?.id || null,
        painPointId: painPoint?.id || null,
      },
      create: {
        name: clusterSeed.name,
        slug: clusterSeed.slug,
        description: clusterSeed.description,
        pillarArticleId: pillarArticle?.id || null,
        categoryId: category?.id || null,
        painPointId: painPoint?.id || null,
      },
    });

    await prisma.article.updateMany({
      where: { slug: { in: clusterSeed.articleSlugs } },
      data: { clusterId: cluster.id },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
