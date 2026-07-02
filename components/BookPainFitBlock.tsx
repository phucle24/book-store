import Link from "next/link";
import type { Audience, Book, PainPoint } from "@prisma/client";

type BookPainFit = Book & {
  painPoints: PainPoint[];
  audiences: Audience[];
};

export function BookPainFitBlock({ book }: { book: BookPainFit }) {
  const situations = uniqueList([
    ...book.suitableFor,
    ...book.painPoints.map((painPoint) => `Đang chạm tới ${painPoint.name.toLowerCase()}`),
    ...book.audiences.map((audience) => `Phù hợp với ${audience.name.toLowerCase()}`),
  ]).slice(0, 5);
  const objections = uniqueList([...book.notSuitableFor, ...book.cons]).slice(0, 4);
  const readerFit = uniqueList([...book.pros, ...book.keyLessons]).slice(0, 4);

  if (!situations.length && !objections.length && !readerFit.length) return null;

  return (
    <section className="mt-12 rounded-3xl border border-emerald-100 bg-[#f8fbf6] p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
        Đúng vấn đề nào?
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">
        Sách này giải quyết đúng vấn đề nào?
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-700">
        Đừng xem một cuốn sách như lời hứa thay đổi nhanh. Hãy xem nó như một công cụ
        cho đúng tình huống, đúng nhịp đọc và đúng nỗi băn khoăn của bạn lúc này.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <FitList title="Hợp nhất khi bạn..." items={situations} tone="green" />
        <FitList title="Điều sách có thể giúp" items={readerFit} tone="amber" />
        <FitList title="Cần cân nhắc nếu..." items={objections} tone="stone" />
      </div>

      {book.painPoints.length ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {book.painPoints.map((painPoint) => (
            <Link
              key={painPoint.id}
              href={`/noi-dau/${painPoint.slug}`}
              className="rounded-full border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-900 hover:border-amber-300 hover:text-amber-900"
            >
              Đọc thêm về {painPoint.name.toLowerCase()}
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FitList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "green" | "amber" | "stone";
}) {
  if (!items.length) return null;

  const toneClass = {
    green: "border-emerald-100 bg-emerald-50",
    amber: "border-amber-100 bg-amber-50",
    stone: "border-stone-200 bg-white",
  }[tone];

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function uniqueList(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}
