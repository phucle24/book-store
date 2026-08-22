"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SearchBar } from "@/components/SearchBar";

const navItems = [
  { href: "/bat-dau", label: "Bắt đầu" },
  { href: "/bai-viet", label: "Bài viết" },
  { href: "/sach", label: "Sách" },
  { href: "/trich-dan", label: "Trích dẫn" },
  { href: "/cach-chung-toi-danh-gia", label: "Cách đánh giá" },
  { href: "/bai-viet-da-luu", label: "Đã lưu" },
  { href: "/ve-chung-toi", label: "Về chúng tôi" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-900 md:hidden"
          >
            <span className="sr-only">Mở menu</span>
            <span className="text-xl leading-none">{open ? "×" : "☰"}</span>
          </button>
        </div>
        {open ? (
          <nav
            id="mobile-navigation"
            className="grid gap-2 rounded-3xl border border-stone-200 bg-white p-3 text-sm font-medium text-stone-800 shadow-sm md:hidden"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl px-3 py-2 hover:bg-amber-50 hover:text-amber-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div className="md:hidden">
          <SearchBar compact />
        </div>
      </div>
    </header>
  );
}
