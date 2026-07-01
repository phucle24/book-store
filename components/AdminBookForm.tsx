import type { Audience, Book, Category, PainPoint } from "@prisma/client";

type BookWithRelations = Partial<Book> & {
  categories?: Category[];
  painPoints?: PainPoint[];
  audiences?: Audience[];
};

export function AdminBookForm({
  action,
  book,
  categories,
  painPoints,
  audiences,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  book?: BookWithRelations;
  categories: Category[];
  painPoints: PainPoint[];
  audiences: Audience[];
  submitLabel: string;
}) {
  const categoryIds = new Set(book?.categories?.map((item) => item.id) || []);
  const painPointIds = new Set(book?.painPoints?.map((item) => item.id) || []);
  const audienceIds = new Set(book?.audiences?.map((item) => item.id) || []);

  return (
    <form action={action} className="space-y-6">
      {book?.id ? <input type="hidden" name="id" value={book.id} /> : null}

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Thông tin chính</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField label="Tên sách" name="title" defaultValue={book?.title} required />
          <TextField label="Slug" name="slug" defaultValue={book?.slug} />
          <TextField label="Tác giả" name="author" defaultValue={book?.author} required />
          <TextField label="Nhà xuất bản" name="publisher" defaultValue={book?.publisher} />
          <TextField label="Cover image URL" name="coverImage" defaultValue={book?.coverImage} />
          <TextField
            label="Shopee affiliate URL"
            name="shopeeAffiliateUrl"
            defaultValue={book?.shopeeAffiliateUrl}
          />
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Trạng thái</span>
            <select
              name="status"
              defaultValue={book?.status || "ACTIVE"}
              className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700">Mô tả</span>
          <textarea
            name="description"
            required
            rows={5}
            defaultValue={book?.description}
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

      <section className="grid gap-6 md:grid-cols-2">
        <TextareaList label="Điểm mạnh" name="pros" value={book?.pros} />
        <TextareaList label="Điểm hạn chế" name="cons" value={book?.cons} />
        <TextareaList label="Bài học chính" name="keyLessons" value={book?.keyLessons} />
        <TextareaList label="Phù hợp nếu..." name="suitableFor" value={book?.suitableFor} />
        <TextareaList
          label="Không phù hợp nếu..."
          name="notSuitableFor"
          value={book?.notSuitableFor}
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

function TextField({
  label,
  name,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue || ""}
        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function TextareaList({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value?: string[];
}) {
  return (
    <label className="block rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <span className="text-sm font-semibold text-stone-950">{label}</span>
      <textarea
        name={name}
        rows={7}
        defaultValue={(value || []).join("\n")}
        placeholder="Mỗi dòng một ý"
        className="mt-3 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
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
