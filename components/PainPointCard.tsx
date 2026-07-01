import Link from "next/link";

export function PainPointCard({
  name,
  slug,
  description,
}: {
  name: string;
  slug: string;
  description?: string | null;
}) {
  return (
    <Link
      href={`/noi-dau/${slug}`}
      className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
    >
      <h3 className="text-lg font-semibold text-stone-950">{name}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
        {description || "Gợi ý sách và bài viết cho giai đoạn này."}
      </p>
    </Link>
  );
}
