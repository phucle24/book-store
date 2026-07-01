"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <footer className="mt-20 border-t border-stone-200 bg-stone-950 text-stone-100">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm sm:px-6 md:grid-cols-[1.4fr_1fr] lg:px-8">
        <div>
          <p className="font-semibold">Trạm Đọc Một Chút</p>
          <p className="mt-3 max-w-2xl leading-7 text-stone-300">
            Review sách theo cảm xúc, vấn đề và bối cảnh sống. Một vài liên kết
            trên website là liên kết tiếp thị liên kết; điều này không làm thay
            đổi giá bạn phải trả.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 md:justify-end">
          <Link href="/tiep-thi-lien-ket" className="hover:text-amber-200">
            Disclosure affiliate
          </Link>
          <Link href="/ve-chung-toi" className="hover:text-amber-200">
            Về chúng tôi
          </Link>
          <Link href="/bai-viet" className="hover:text-amber-200">
            Bài viết
          </Link>
        </div>
      </div>
    </footer>
  );
}
