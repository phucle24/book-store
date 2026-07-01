import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Disclosure tiếp thị liên kết",
  description: "Thông tin minh bạch về liên kết affiliate trên Trạm Đọc Một Chút.",
  path: "/tiep-thi-lien-ket",
});

export default function AffiliateDisclosurePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-4xl font-semibold text-stone-950">Tiếp thị liên kết</h1>
      <p className="mt-6 text-lg leading-9 text-stone-700">
        Trạm Đọc Một Chút có thể nhận hoa hồng khi bạn mua sách qua một số liên
        kết trên website. Điều này không làm thay đổi giá bạn phải trả. Chúng tôi
        ưu tiên giới thiệu sách dựa trên mức độ phù hợp với nhu cầu người đọc.
      </p>
    </div>
  );
}
