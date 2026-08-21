import Link from "next/link";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/books", label: "Sách" },
  { href: "/admin/articles", label: "Bài viết" },
  { href: "/admin/content-planner", label: "Content planner" },
  { href: "/admin/content-audit", label: "Content audit" },
  { href: "/admin/system-status", label: "Trạng thái hệ thống" },
  { href: "/admin/comments", label: "Bình luận độc giả" },
  { href: "/admin/review-insights", label: "Review collector" },
  { href: "/admin/subscribers", label: "Subscribers" },
  { href: "/admin/categories", label: "Chủ đề" },
  { href: "/admin/pain-points", label: "Nỗi đau" },
  { href: "/admin/audiences", label: "Đối tượng" },
  { href: "/admin/ai", label: "AI Autopilot" },
  { href: "/admin/ai-planner", label: "🤖 AI Content Planner" },
  { href: "/admin/quotes", label: "💬 Trích dẫn & Quotes" },
];

export function AdminSidebar() {
  return (
    <aside className="border-b border-stone-200 bg-stone-950 text-stone-100 lg:min-h-screen lg:w-64 lg:border-b-0">
      <div className="px-5 py-5">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-200">Admin</p>
        <p className="mt-2 text-lg font-semibold">Trạm Đọc Một Chút</p>
      </div>
      <nav className="flex gap-2 overflow-x-auto px-3 pb-4 lg:flex-col lg:overflow-visible">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-2xl px-3 py-2 text-sm font-medium text-stone-300 hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
