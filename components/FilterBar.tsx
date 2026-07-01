import Link from "next/link";
import type { Audience, Category, PainPoint } from "@prisma/client";

export function FilterBar({
  categories,
  painPoints,
  audiences,
}: {
  categories: Category[];
  painPoints: PainPoint[];
  audiences: Audience[];
}) {
  const groupClass = "flex gap-2 overflow-x-auto pb-2";
  const linkClass =
    "shrink-0 rounded-full border border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-700 hover:border-amber-400 hover:text-amber-900";

  return (
    <div className="space-y-3 rounded-3xl border border-stone-200 bg-[#fffaf2] p-4">
      <div className={groupClass}>
        <Link href="/bai-viet" className={linkClass}>
          Tất cả
        </Link>
        {categories.map((item) => (
          <Link key={item.id} href={`/bai-viet?category=${item.slug}`} className={linkClass}>
            {item.name}
          </Link>
        ))}
      </div>
      <div className={groupClass}>
        {painPoints.map((item) => (
          <Link key={item.id} href={`/bai-viet?painPoint=${item.slug}`} className={linkClass}>
            {item.name}
          </Link>
        ))}
      </div>
      <div className={groupClass}>
        {audiences.map((item) => (
          <Link key={item.id} href={`/bai-viet?audience=${item.slug}`} className={linkClass}>
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
