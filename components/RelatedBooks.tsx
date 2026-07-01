import { BookCard } from "@/components/BookCard";
import type { Book, PainPoint } from "@prisma/client";

export function RelatedBooks({
  books,
}: {
  books: (Book & { painPoints: PainPoint[] })[];
}) {
  if (!books.length) return null;

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-semibold text-stone-950">Sách liên quan</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {books.map((book) => (
          <BookCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
