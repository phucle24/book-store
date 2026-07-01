import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import {
  createPainPointAction,
  deletePainPointAction,
  updatePainPointAction,
} from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPainPointsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const painPoints = await prisma.painPoint.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: true, books: true } } },
  });

  return (
    <AdminShell title="Nỗi đau" description="CRUD pain points dùng để phân loại bài/sách.">
      <AdminNotice error={params.error} success={params.success} />
      <TaxonomyCreateForm action={createPainPointAction} submitLabel="Tạo nỗi đau" />
      <section className="mt-6 space-y-4">
        {painPoints.map((painPoint) => (
          <TaxonomyEditCard
            key={painPoint.id}
            item={painPoint}
            updateAction={updatePainPointAction}
            deleteAction={deletePainPointAction}
            deleteLabel="Xóa nỗi đau"
            countText={`${painPoint._count.articles} bài viết · ${painPoint._count.books} sách`}
          />
        ))}
      </section>
    </AdminShell>
  );
}

function TaxonomyCreateForm({
  action,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-950">{submitLabel}</h2>
      <form action={action} className="mt-5 grid gap-4 lg:grid-cols-2">
        <TextInput name="name" label="Tên" required />
        <TextInput name="slug" label="Slug" />
        <label className="block lg:col-span-2">
          <span className="text-sm font-medium text-stone-700">Mô tả</span>
          <textarea
            name="description"
            rows={3}
            className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </label>
        <div className="lg:col-span-2">
          <button className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900">
            {submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}

function TaxonomyEditCard({
  item,
  updateAction,
  deleteAction,
  deleteLabel,
  countText,
}: {
  item: { id: string; name: string; slug: string; description: string | null };
  updateAction: (formData: FormData) => void | Promise<void>;
  deleteAction: (formData: FormData) => void | Promise<void>;
  deleteLabel: string;
  countText: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <form action={updateAction} className="grid gap-4 lg:grid-cols-2">
        <input type="hidden" name="id" value={item.id} />
        <TextInput name="name" label="Tên" defaultValue={item.name} required />
        <TextInput name="slug" label="Slug" defaultValue={item.slug} />
        <label className="block lg:col-span-2">
          <span className="text-sm font-medium text-stone-700">Mô tả</span>
          <textarea
            name="description"
            rows={3}
            defaultValue={item.description || ""}
            className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
          <p className="text-xs text-stone-500">{countText}</p>
          <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900">
            Lưu
          </button>
        </div>
      </form>
      <form action={deleteAction} className="mt-3 flex justify-end">
        <input type="hidden" name="id" value={item.id} />
        <button className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
          {deleteLabel}
        </button>
      </form>
    </div>
  );
}

function TextInput({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
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
