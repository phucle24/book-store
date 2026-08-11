import type { Book, PainPoint } from "@prisma/client";
import Link from "next/link";
import { BookCover } from "@/components/BookCover";

type BookCardData = Book & {
  painPoints?: PainPoint[];
};

export function BookCard({ book }: { book: BookCardData }) {
  return (
    <article className="flex gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
      <BookCover
        title={book.title}
        coverImage={book.coverImage}
        className="relative flex h-28 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 via-stone-100 to-emerald-100 px-3 text-center text-xs font-semibold text-stone-700"
      />
      <div className="min-w-0">
        <p className="text-xs font-medium text-amber-800">{book.author}</p>
        <h3 className="mt-1 text-lg font-semibold leading-snug text-stone-950">
          <Link href={`/sach/${book.slug}`} className="hover:text-amber-900">
            {book.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-stone-600">
          {book.description}
        </p>
        {book.painPoints?.[0] ? (
          <Link
            href={`/noi-dau/${book.painPoints[0].slug}`}
            className="mt-3 inline-flex text-xs font-medium text-emerald-800"
          >
            {book.painPoints[0].name}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
