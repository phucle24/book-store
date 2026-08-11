import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Cách chúng tôi đánh giá sách",
  description:
    "Quy trình biên tập review sách của Trạm Đọc Một Chút: tổng hợp nguồn, viết lại bằng giọng riêng, không copy review người mua và minh bạch affiliate.",
  path: "/cach-chung-toi-danh-gia",
});

export default function ReviewMethodPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
        Phương pháp biên tập
      </p>
      <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
        Chúng tôi đánh giá sách như thế nào?
      </h1>
      <p className="mt-5 text-lg leading-8 text-stone-700">
        Trạm Đọc Một Chút không cố biến review sách thành lời hứa thay đổi cuộc đời.
        Chúng tôi đọc dữ liệu, tổng hợp nguồn, rồi biên tập lại theo một câu hỏi
        chính: cuốn sách này có thật sự hợp với vấn đề người đọc đang gặp không?
      </p>

      <div className="mt-10 grid gap-5">
        <MethodStep
          title="1. Tổng hợp nguồn có thể kiểm tra"
          description="Nguồn có thể gồm thông tin nhà xuất bản, bài giới thiệu sách, dữ liệu tác giả, ghi chú admin tự nhập và review người mua được paste thủ công. Chúng tôi không tự động scrape Shopee review."
        />
        <MethodStep
          title="2. Viết lại bằng giọng riêng"
          description="Review người mua chỉ dùng để rút insight: điều người đọc thích, điểm còn lăn tăn, nỗi đau trước khi mua. Bài public không trích nguyên văn review và không copy mô tả sản phẩm."
        />
        <MethodStep
          title="3. Chấm điểm biên tập thang 5"
          description="Điểm biên tập là đánh giá first-party của Trạm Đọc, dựa trên độ dễ thực hành, độ sâu, độ dễ đọc và giá trị so với giá. Điểm này không phải rating Shopee."
        />
        <MethodStep
          title="4. Minh bạch affiliate"
          description="Một số liên kết là affiliate. Nếu bạn mua qua liên kết đó, website có thể nhận hoa hồng nhưng giá bạn trả không đổi. CTA luôn đặt như một gợi ý cân nhắc, không phải lời ép mua."
        />
      </div>

      <section className="mt-10 rounded-[2rem] border border-amber-200 bg-amber-50 p-5">
        <h2 className="text-xl font-semibold text-stone-950">
          Điều chúng tôi không làm
        </h2>
        <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-700">
          <li>• Không bịa rằng người viết đã đọc hết sách nếu dữ liệu không chứng minh.</li>
          <li>• Không dùng rating người mua làm rating biên tập của website.</li>
          <li>• Không hứa rằng một cuốn sách sẽ thay đổi cuộc đời bạn.</li>
          <li>• Không bypass captcha, login, paywall hoặc scraping trái phép.</li>
        </ul>
      </section>

      <div className="mt-8">
        <Link
          href="/bai-viet"
          className="inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900"
        >
          Đọc các bài review
        </Link>
      </div>
    </main>
  );
}

function MethodStep({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
      <p className="mt-3 leading-7 text-stone-700">{description}</p>
    </section>
  );
}
