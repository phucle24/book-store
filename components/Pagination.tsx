import Link from "next/link";

export function Pagination({
  page,
  totalPages,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const makeHref = (nextPage: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams || {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", String(nextPage));
    return `${basePath}?${params.toString()}`;
  };

  return (
    <nav className="mt-10 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm" href={makeHref(page - 1)}>
          Trước
        </Link>
      ) : null}
      <span className="text-sm text-stone-600">
        Trang {page}/{totalPages}
      </span>
      {page < totalPages ? (
        <Link className="rounded-full border border-stone-300 px-4 py-2 text-sm" href={makeHref(page + 1)}>
          Sau
        </Link>
      ) : null}
    </nav>
  );
}
