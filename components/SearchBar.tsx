export function SearchBar({
  defaultValue,
  compact = false,
}: {
  defaultValue?: string;
  compact?: boolean;
}) {
  return (
    <form action="/tim-kiem" className="flex w-full gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Tìm theo tên sách, nỗi đau, chủ đề..."
        className="min-w-0 flex-1 rounded-full border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
      <button
        className={`rounded-full bg-stone-950 px-5 font-medium text-white transition hover:bg-amber-900 ${
          compact ? "py-2 text-sm" : "py-3 text-sm"
        }`}
      >
        Tìm
      </button>
    </form>
  );
}
