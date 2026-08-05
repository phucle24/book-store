"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  console.error(error);

  return (
    <main className="min-h-[70vh] bg-[#fbf7ef] px-4 py-16 text-stone-900">
      <section className="mx-auto max-w-2xl rounded-[2rem] border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
          Có lỗi xảy ra
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Trang này đang gặp lỗi tạm thời.
        </h1>
        <p className="mt-4 leading-7 text-stone-600">
          Bạn có thể thử tải lại trang. Nếu lỗi vẫn còn, hãy quay về trang chủ và đọc tiếp từ
          một bài khác.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-900"
          >
            Thử lại
          </button>
          <Link
            href="/"
            className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-800 transition hover:border-amber-800 hover:text-amber-900"
          >
            Về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
