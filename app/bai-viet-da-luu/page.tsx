import type { Metadata } from "next";
import { SavedArticlesClient } from "@/components/SavedArticlesClient";

export const metadata: Metadata = {
  title: "Bài viết đã lưu",
  description: "Những bài review sách bạn đã lưu để quay lại đọc sau.",
  robots: { index: false, follow: true },
};

export default function SavedArticlesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
        Góc đọc riêng
      </p>
      <h1 className="mt-3 text-4xl font-semibold text-stone-950">Bài viết đã lưu</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-700">
        Đây là danh sách lưu trên trình duyệt của bạn. Không cần đăng nhập, không
        đồng bộ lên server, chỉ để bạn dễ quay lại những bài đang chạm đúng giai
        đoạn của mình.
      </p>
      <div className="mt-8">
        <SavedArticlesClient />
      </div>
    </div>
  );
}
