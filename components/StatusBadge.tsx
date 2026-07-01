const styles: Record<string, string> = {
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  DRAFT: "bg-stone-100 text-stone-700",
  REVIEW: "bg-amber-100 text-amber-800",
  SCHEDULED: "bg-sky-100 text-sky-800",
  ARCHIVED: "bg-rose-100 text-rose-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-stone-100 text-stone-700",
  draft: "bg-stone-100 text-stone-700",
  analyzed: "bg-amber-100 text-amber-800",
  article_generated: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || "bg-stone-100 text-stone-700"
      }`}
    >
      {status}
    </span>
  );
}
