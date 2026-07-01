import Link from "next/link";

export function AudienceCard({
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
      href={`/doi-tuong/${slug}`}
      className="rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-sm font-medium text-emerald-950 hover:bg-emerald-100"
    >
      <span>{name}</span>
      {description ? <span className="sr-only"> - {description}</span> : null}
    </Link>
  );
}
