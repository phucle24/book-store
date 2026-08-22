import Link from "next/link";

const adminActionItems = [
  { href: "/admin", label: "📊 Dashboard" },
  { href: "/admin/books", label: "📦 Sách (Shopee & Ảnh)" },
  { href: "/admin/comments", label: "💬 Bình luận độc giả" },
];

const aiAutomationItems = [
  { href: "/admin/ai-planner", label: "🤖 AI Content Planner" },
  { href: "/admin/content-audit", label: "✅ Content Audit" },
  { href: "/admin/articles", label: "📝 Danh sách bài viết" },
  { href: "/admin/quotes", label: "💬 Trích dẫn & Quotes" },
  { href: "/admin/system-status", label: "🔧 Trạng thái hệ thống" },
];

export function AdminSidebar() {
  return (
    <aside className="border-b border-stone-800 bg-stone-950 text-stone-100 lg:min-h-screen lg:w-64 lg:border-b-0">
      <div className="px-5 py-5 border-b border-stone-800/80">
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400 font-semibold">100% AI Automated</p>
        <p className="mt-1 text-lg font-bold">Trạm Đọc Một Chút</p>
        <Link href="/" target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs text-stone-400 hover:text-amber-200">
          ↗ Xem website chính
        </Link>
      </div>

      <nav className="p-3 space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-amber-300/70">
            Nhiệm vụ Admin
          </p>
          <div className="mt-2 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {adminActionItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-stone-300 hover:bg-amber-900/30 hover:text-amber-200 transition"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
            Giám sát AI & Tự động
          </p>
          <div className="mt-2 flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {aiAutomationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-xl px-3 py-2 text-sm font-medium text-stone-400 hover:bg-white/5 hover:text-stone-100 transition"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}

