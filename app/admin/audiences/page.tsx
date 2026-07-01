import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import {
  createAudienceAction,
  deleteAudienceAction,
  updateAudienceAction,
} from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAudiencesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const audiences = await prisma.audience.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { articles: true, books: true } } },
  });

  return (
    <AdminShell title="Đối tượng" description="CRUD audience để lọc nội dung theo nhóm người đọc.">
      <AdminNotice error={params.error} success={params.success} />
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Tạo đối tượng</h2>
        <form action={createAudienceAction} className="mt-5 grid gap-4 lg:grid-cols-2">
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
              Tạo đối tượng
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 space-y-4">
        {audiences.map((audience) => (
          <div key={audience.id} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <form action={updateAudienceAction} className="grid gap-4 lg:grid-cols-2">
              <input type="hidden" name="id" value={audience.id} />
              <TextInput name="name" label="Tên" defaultValue={audience.name} required />
              <TextInput name="slug" label="Slug" defaultValue={audience.slug} />
              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-stone-700">Mô tả</span>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={audience.description || ""}
                  className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3 lg:col-span-2">
                <p className="text-xs text-stone-500">
                  {audience._count.articles} bài viết · {audience._count.books} sách
                </p>
                <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900">
                  Lưu
                </button>
              </div>
            </form>
            <form action={deleteAudienceAction} className="mt-3 flex justify-end">
              <input type="hidden" name="id" value={audience.id} />
              <button className="rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50">
                Xóa đối tượng
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
