import type {
  Article,
  ArticleBook,
  ArticleSource,
  Audience,
  Book,
  Category,
  ContentCluster,
  FAQ,
  PainPoint,
} from "@prisma/client";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { getArticleQualitySummary } from "@/lib/content-quality";
import { editorialPersonas } from "@/lib/editorial-personas";

type ArticleWithRelations = Partial<Article> & {
  categories?: Category[];
  painPoints?: PainPoint[];
  audiences?: Audience[];
  faqs?: FAQ[];
  books?: (ArticleBook & { book: Book })[];
  sources?: ArticleSource[];
};

export function AdminArticleForm({
  action,
  article,
  categories,
  painPoints,
  audiences,
  books,
  clusters,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  article?: ArticleWithRelations;
  categories: Category[];
  painPoints: PainPoint[];
  audiences: Audience[];
  books: Book[];
  clusters: ContentCluster[];
  submitLabel: string;
}) {
  const categoryIds = new Set(article?.categories?.map((item) => item.id) || []);
  const painPointIds = new Set(article?.painPoints?.map((item) => item.id) || []);
  const audienceIds = new Set(article?.audiences?.map((item) => item.id) || []);
  const mainBookId = article?.books?.find((item) => item.role === "MAIN")?.bookId || "";
  const relatedBooks = article?.books?.filter((item) => item.role !== "MAIN") || [];
  const relatedBookIds = new Set(relatedBooks.map((item) => item.bookId));
  const relatedBookOrder = new Map(
    relatedBooks.map((item, index) => [item.bookId, item.order || index + 1]),
  );
  const orderedBooks = [...books].sort((a, b) => {
    const aSelected = relatedBookIds.has(a.id);
    const bSelected = relatedBookIds.has(b.id);
    if (aSelected && bSelected) {
      return (relatedBookOrder.get(a.id) || 999) - (relatedBookOrder.get(b.id) || 999);
    }
    if (aSelected !== bSelected) return aSelected ? -1 : 1;
    return a.title.localeCompare(b.title, "vi");
  });
  const publishedDate = article?.publishedAt
    ? article.publishedAt.toISOString().slice(0, 10)
    : "";
  const scheduledDate = article?.scheduledAt
    ? toVietnamDatetimeLocal(article.scheduledAt)
    : "";

  return (
    <form action={action} className="space-y-6">
      {article?.id ? <input type="hidden" name="id" value={article.id} /> : null}

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Thông tin bài viết</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="Tiêu đề" name="title" defaultValue={article?.title} required />
          <TextField label="Slug" name="slug" defaultValue={article?.slug} />
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Loại bài</span>
            <select
              name="type"
              defaultValue={article?.type || "REVIEW"}
              className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            >
              <option value="REVIEW">REVIEW</option>
              <option value="TOP_LIST">TOP_LIST</option>
              <option value="STORY">STORY</option>
              <option value="COMPARISON">COMPARISON</option>
              <option value="GUIDE">GUIDE</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Trạng thái</span>
            <select
              name="status"
              defaultValue={article?.status || "DRAFT"}
              className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="REVIEW">REVIEW</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
          <TextField label="Cover image URL" name="coverImage" defaultValue={article?.coverImage} />
          <TextField
            label="Ngày publish"
            name="publishedAt"
            type="date"
            defaultValue={publishedDate}
          />
          <TextField
            label="Lịch đăng tự động"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={scheduledDate}
          />
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Bút danh hiển thị</span>
            <select
              name="authorSlug"
              defaultValue={article?.authorSlug || ""}
              className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            >
              <option value="">Tự chọn theo tone/nội dung</option>
              {editorialPersonas.map((persona) => (
                <option key={persona.slug} value={persona.slug}>
                  {persona.name} · {persona.label}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs leading-5 text-stone-500">
              Đây là bút danh biên tập của website, không phải hồ sơ cá nhân ngoài đời.
            </span>
          </label>
          <TextField
            label="Điểm verdict bài viết (1-5)"
            name="verdictScore"
            type="number"
            step="0.1"
            min="0"
            max="5"
            defaultValue={article?.verdictScore?.toString()}
          />
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-stone-700">
              Verdict summary
            </span>
            <textarea
              name="verdictSummary"
              rows={3}
              defaultValue={article?.verdictSummary || ""}
              placeholder="1-2 câu kết luận thẳng: sách này hợp với ai, nên cân nhắc điều gì."
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="text-sm font-medium text-stone-700">Content cluster</span>
            <select
              name="clusterId"
              defaultValue={article?.clusterId || ""}
              className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            >
              <option value="">Chưa gắn cluster</option>
              {clusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700">Excerpt</span>
          <textarea
            name="excerpt"
            required
            rows={4}
            defaultValue={article?.excerpt}
            className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </label>
        <SeoChecklist article={article} />
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">SEO</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="SEO title" name="seoTitle" defaultValue={article?.seoTitle} />
          <TextField
            label="Focus keyword"
            name="focusKeyword"
            defaultValue={article?.focusKeyword}
          />
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700">SEO description</span>
          <textarea
            name="seoDescription"
            rows={3}
            defaultValue={article?.seoDescription || ""}
            className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </label>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <CheckboxGroup
          title="Categories"
          name="categoryIds"
          items={categories}
          selectedIds={categoryIds}
        />
        <CheckboxGroup
          title="Pain points"
          name="painPointIds"
          items={painPoints}
          selectedIds={painPointIds}
        />
        <CheckboxGroup
          title="Audiences"
          name="audienceIds"
          items={audiences}
          selectedIds={audienceIds}
        />
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Sách liên quan</h2>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Sách chính</span>
            <select
              name="mainBookId"
              defaultValue={mainBookId}
              className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            >
              <option value="">Chưa chọn</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="text-sm font-medium text-stone-700">Sách gợi ý thêm</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              Với TOP_LIST, chọn ít nhất 3 sách và điền thứ tự hiển thị.
            </p>
            <div className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-stone-300 p-3">
              {orderedBooks.map((book, index) => (
                <div
                  key={book.id}
                  className="grid gap-2 rounded-2xl border border-stone-100 bg-stone-50 p-3 sm:grid-cols-[1fr_5.5rem]"
                >
                  <label className="flex items-center gap-2 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      name="relatedBookIds"
                      value={book.id}
                      defaultChecked={relatedBookIds.has(book.id)}
                      className="h-4 w-4 rounded border-stone-300 text-amber-800"
                    />
                    <span>{book.title}</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-stone-500">
                    <span>Thứ tự</span>
                    <input
                      name={`relatedBookOrder:${book.id}`}
                      type="number"
                      min={1}
                      defaultValue={relatedBookOrder.get(book.id) || index + 1}
                      className="w-16 rounded-xl border border-stone-300 bg-white px-2 py-1 text-sm text-stone-700 outline-none focus:border-amber-700 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Nội dung markdown</h2>
        <textarea
          name="content"
          required
          rows={26}
          defaultValue={article?.content || ""}
          className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 font-mono text-sm leading-7 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
        />
        {article?.content ? (
          <details className="mt-4 rounded-2xl border border-stone-200 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-stone-950">
              Preview nội dung hiện tại
            </summary>
            <div className="mt-4">
              <MarkdownRenderer content={article.content} />
            </div>
          </details>
        ) : null}
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">FAQ</h2>
        <p className="mt-1 text-sm text-stone-500">Mỗi dòng một FAQ theo dạng: câu hỏi | câu trả lời</p>
        <textarea
          name="faqs"
          rows={7}
          defaultValue={(article?.faqs || [])
            .sort((a, b) => a.order - b.order)
            .map((faq) => `${faq.question} | ${faq.answer}`)
            .join("\n")}
          className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
        />
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Nguồn tham khảo</h2>
        <p className="mt-1 text-sm text-stone-500">
          Mỗi dòng: title | url | kind | note. Kind có thể là REFERENCE, PUBLISHER,
          BUYER_REVIEWS, EDITORIAL_NOTE.
        </p>
        <textarea
          name="sources"
          rows={7}
          defaultValue={(article?.sources || [])
            .sort((a, b) => a.order - b.order)
            .map((source) =>
              [
                source.title,
                source.url || "",
                source.kind,
                source.note || "",
              ].join(" | "),
            )
            .join("\n")}
          className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
        />
      </section>

      <div className="flex justify-end">
        <button className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-900">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function SeoChecklist({ article }: { article?: ArticleWithRelations }) {
  const summary = getArticleQualitySummary(article);

  return (
    <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-950">
          Content quality checklist
        </h3>
        <p className="text-xs text-stone-500">
          Score {summary.score}/100 · {summary.wordCount} từ
        </p>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {summary.checks.map((check) => (
          <div key={check.label} className="flex items-center justify-between gap-3 text-sm">
            <span
              className={
                check.ok
                  ? "text-stone-700"
                  : check.severity === "required"
                    ? "text-rose-700"
                    : "text-amber-800"
              }
            >
              {check.ok ? "✓" : check.severity === "required" ? "!" : "○"}{" "}
              {check.label}
            </span>
            {check.meta ? (
              <span className="shrink-0 text-xs text-stone-500">{check.meta}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function toVietnamDatetimeLocal(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

function TextField({
  label,
  name,
  defaultValue,
  required = false,
  type = "text",
  step,
  min,
  max,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        min={min}
        max={max}
        required={required}
        defaultValue={defaultValue || ""}
        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function CheckboxGroup({
  title,
  name,
  items,
  selectedIds,
}: {
  title: string;
  name: string;
  items: { id: string; name: string }[];
  selectedIds: Set<string>;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-stone-950">{title}</h2>
      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <label key={item.id} className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              name={name}
              value={item.id}
              defaultChecked={selectedIds.has(item.id)}
              className="h-4 w-4 rounded border-stone-300 text-amber-800"
            />
            <span>{item.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
