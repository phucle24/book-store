import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Về chúng tôi",
  description: "Trạm Đọc Một Chút giúp bạn chọn sách theo vấn đề, cảm xúc và bối cảnh sống.",
  path: "/ve-chung-toi",
});

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
        Về chúng tôi
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-950">
        Chọn sách theo vấn đề và cảm xúc
      </h1>
      <div className="mt-6 space-y-5 text-lg leading-9 text-stone-700">
        <p>
          Trạm Đọc Một Chút giúp người đọc tìm sách theo giai đoạn đang đi qua:
          mất phương hướng, trì hoãn, overthinking, burnout, áp lực công việc
          hoặc những câu hỏi rất đời thường.
        </p>
        <p>
          Một số bài dùng bút danh biên tập như Linh An, Minh Quân, An Nhiên
          hoặc Hà My để giữ giọng viết nhất quán theo từng nhóm nội dung. Đây
          là bút danh của hệ biên tập Trạm Đọc Một Chút, không phải hồ sơ cá
          nhân ngoài đời.
        </p>
        <p>
          Chúng tôi không cam kết một cuốn sách sẽ thay đổi cuộc đời người đọc.
          Một cuốn sách tốt chỉ nên là điểm tựa để bạn suy nghĩ rõ hơn và hành
          động tỉnh táo hơn.
        </p>
      </div>
    </div>
  );
}
