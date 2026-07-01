import type { FAQ } from "@prisma/client";

export function FAQBlock({ faqs }: { faqs: FAQ[] }) {
  if (!faqs.length) return null;

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-semibold text-stone-950">Câu hỏi thường gặp</h2>
      <div className="mt-5 space-y-3">
        {faqs.map((faq) => (
          <details key={faq.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <summary className="cursor-pointer font-semibold text-stone-950">
              {faq.question}
            </summary>
            <p className="mt-3 leading-7 text-stone-600">{faq.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
