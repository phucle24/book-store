import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";

export default function NotFoundPage() {
  return (
    <main className="bg-[#fbf7ef] px-4 py-16 text-stone-900">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
          Không tìm thấy trang
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Có thể bài viết đã được đổi đường dẫn.
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-stone-600">
          Bạn có thể tìm theo tên sách, nỗi đau đang gặp hoặc quay lại danh sách bài viết mới
          nhất.
        </p>

        <div className="mt-8">
          <SearchBar />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-900"
          >
            Về trang chủ
          </Link>
          <Link
            href="/bai-viet"
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-amber-800 hover:text-amber-900"
          >
            Xem bài viết
          </Link>
        </div>
      </section>
    </main>
  );
}
