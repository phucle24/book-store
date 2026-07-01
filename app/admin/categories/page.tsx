import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryAction,
} from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: true, books: true } } },
  });

  return (
    <AdminShell title="Chủ đề" description="CRUD category/topic cho bài viết và sách.">
      <AdminNotice error={params.error} success={params.success} />
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Tạo chủ đề</h2>
        <form action={createCategoryAction} className="mt-5 grid gap-4 lg:grid-cols-2">
          <TextInput name="name" label="Tên" required />
          <TextInput name="slug" label="Slug" />
          <TextInput name="seoTitle" label="SEO title" />
          <TextInput name="seoDescription" label="SEO description" />
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
              Tạo chủ đề
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 space-y-4">
        {categories.map((category) => (
          <div key={category.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <form action={updateCategoryAction} className="grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="id" value={category.id} />
              <TextInput name="name" label="Tên" defaultValue={category.name} required />
              <TextInput name="slug" label="Slug" defaultValue={category.slug} />
              <TextInput name="seoTitle" label="SEO title" defaultValue={category.seoTitle} />
              <TextInput
                name="seoDescription"
                label="SEO description"
                defaultValue={category.seoDescription}
              />
              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-stone-700">Mô tả</span>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={category.description || ""}
                  className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
                <p className="text-xs text-stone-500">
                  {category._count.articles} bài viết · {category._count.books} sách
                </p>
                <div className="flex gap-2">
                  <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900">
                    Lưu
                  </button>
                </div>
              </div>
            </form>
            <form action={deleteCategoryAction} className="mt-3 flex justify-end">
              <input type="hidden" name="id" value={category.id} />
              <button className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
                Xóa chủ đề
              </button>
            </form>
          </div>
        ))}
      </section>
    </AdminShell>
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
