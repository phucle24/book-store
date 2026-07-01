"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBar } from "@/components/SearchBar";

const navItems = [
  { href: "/bat-dau", label: "Bắt đầu" },
  { href: "/bai-viet", label: "Bài viết" },
  { href: "/chu-de/phat-trien-ban-than", label: "Chủ đề" },
  { href: "/noi-dau/overthinking", label: "Nỗi đau" },
  { href: "/bai-viet-da-luu", label: "Đã lưu" },
  { href: "/ve-chung-toi", label: "Về chúng tôi" },
];

export function Header() {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <header className="border-b border-stone-200 bg-[#fffaf2]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold text-stone-950">
            Trạm Đọc Một Chút
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium text-stone-700 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-amber-800">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="md:hidden">
          <SearchBar compact />
        </div>
      </div>
    </header>
  );
}
