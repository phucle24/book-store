import Link from "next/link";

type InternalLinkItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
};

type InternalLinkGroup = {
  title: string;
  description: string;
  items: InternalLinkItem[];
};

export function InternalLinkCluster({ groups }: { groups: InternalLinkGroup[] }) {
  const visibleGroups = groups.filter((group) => group.items.length);

  if (!visibleGroups.length) return null;

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
        Đọc tiếp theo mạch này
      </p>
      <h2 className="mt-2 text-xl font-semibold text-stone-950">
        Nếu bạn muốn đào sâu hơn
      </h2>
      <div className="mt-5 grid gap-4">
        {visibleGroups.map((group) => (
          <div key={group.title} className="rounded-2xl bg-stone-50 p-4">
            <h3 className="text-sm font-semibold text-stone-950">{group.title}</h3>
            <p className="mt-1 text-sm leading-6 text-stone-600">{group.description}</p>
            <div className="mt-3 space-y-3">
              {group.items.map((item) => (
                <Link
                  key={item.id}
                  href={`/bai-viet/${item.slug}`}
                  className="block rounded-2xl border border-stone-200 bg-white p-3 transition hover:border-amber-200 hover:bg-amber-50"
                >
                  <span className="text-sm font-semibold text-stone-950">
                    {item.title}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-stone-600">
                    {item.excerpt}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
