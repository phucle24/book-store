"use client";

import type { Audience, Book, Category, PainPoint } from "@prisma/client";
import { ImageUploadField } from "@/components/ImageUploadField";

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

      {/* 🌟 KHU VỰC TRỌNG TÂM DÀNH CHO ADMIN: SHOPEE & COVER IMAGE */}
      <section className="rounded-3xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-800 px-3 py-1 text-xs font-semibold text-white">
              ⚡ Nhiệm vụ Admin chính
            </span>
            <h2 className="mt-2 text-lg font-bold text-stone-950">
              Affiliate Link & Ảnh Bìa Sách
            </h2>
            <p className="mt-0.5 text-xs text-stone-600">
              Website vận hành 100% tự động bằng AI. Bạn chỉ cần cập nhật link Shopee thực tế và link ảnh bìa nếu muốn.
            </p>
          </div>
          <button
            type="submit"
            className="rounded-full bg-stone-950 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-900 transition"
          >
            Lưu nhanh
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <TextField
            label="Shopee affiliate URL"
            name="shopeeAffiliateUrl"
            defaultValue={book?.shopeeAffiliateUrl}
            placeholder="https://shope.ee/... hoặc https://shopee.vn/..."
          />
          <ImageUploadField
            label="Ảnh bìa sách"
            name="coverImage"
            currentValue={book?.coverImage}
            placeholder="https://example.com/cover.jpg"
          />
        </div>
      </section>

      {/* THÔNG TIN CHUNG (AI ĐÃ ĐIỀN TỰ ĐỘNG, CÓ THỂ ĐIỀU CHỈNH KHI CẦN) */}
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-stone-950">Thông tin cơ bản (AI Tự động)</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <TextField label="Tên sách" name="title" defaultValue={book?.title} required />
          <TextField label="Slug" name="slug" defaultValue={book?.slug} />
          <TextField label="Tác giả" name="author" defaultValue={book?.author} required />
          <TextField label="Nhà xuất bản" name="publisher" defaultValue={book?.publisher} />
          <TextField
            label="Điểm biên tập tổng (1-5)"
            name="editorialScore"
            type="number"
            step="0.1"
            min="0"
            max="5"
            defaultValue={book?.editorialScore?.toString()}
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
            rows={4}
            defaultValue={book?.description}
            className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </label>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Breakdown điểm biên tập</h2>
        <p className="mt-1 text-sm text-stone-500">
          Thang 1-5. Đây là điểm của Trạm Đọc, không phải rating Shopee.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <ScoreField label="Dễ thực hành" name="practicalScore" value={scoreValue(book?.scoreBreakdown, "practical")} />
          <ScoreField label="Độ sâu" name="depthScore" value={scoreValue(book?.scoreBreakdown, "depth")} />
          <ScoreField label="Dễ đọc" name="readabilityScore" value={scoreValue(book?.scoreBreakdown, "readability")} />
          <ScoreField label="Giá trị so với giá" name="valueScore" value={scoreValue(book?.scoreBreakdown, "value")} />
        </div>
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
  type = "text",
  step,
  min,
  max,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  required?: boolean;
  type?: string;
  step?: string;
  min?: string;
  max?: string;
  placeholder?: string;
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
        placeholder={placeholder}
        defaultValue={defaultValue || ""}
        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function ScoreField({ label, name, value }: { label: string; name: string; value?: number }) {
  return (
    <TextField
      label={label}
      name={name}
      type="number"
      step="0.1"
      min="0"
      max="5"
      defaultValue={value?.toString()}
    />
  );
}

function scoreValue(value: unknown, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const score = (value as Record<string, unknown>)[key];
  return typeof score === "number" ? score : undefined;
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
