import Link from "next/link";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { createReviewInsightAction } from "@/lib/review-insight-actions";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewReviewInsightPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;

  return (
    <AdminShell
      title="New review insight"
      description="Paste review thủ công cho một sản phẩm sách. Hệ thống chỉ xử lý text đã nhập, không scrape Shopee."
      actions={
        <Link
          href="/admin/review-insights"
          className="rounded-full border border-stone-300 px-4 py-2 text-sm"
        >
          Back
        </Link>
      }
    >
      <AdminNotice error={params.error} success={params.success} />
      <form action={createReviewInsightAction} className="space-y-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Book & product</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField label="Tên sách" name="bookTitle" required />
            <TextField label="Tác giả" name="author" />
            <TextField label="Shopee product URL" name="shopeeProductUrl" required />
            <TextField label="Affiliate URL" name="affiliateUrl" required />
            <TextField label="Giá sản phẩm" name="productPrice" type="number" />
            <TextField label="Rating" name="productRating" type="number" step="0.1" />
            <TextField label="Sold count" name="soldCount" type="number" />
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Manual pasted reviews</h2>
          <p className="mt-1 text-sm text-stone-500">
            Paste review công khai đã collect thủ công. Mỗi review nên cách nhau bằng một dòng trống.
          </p>
          <textarea
            name="rawReviews"
            required
            rows={18}
            className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-7 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Notes</h2>
          <textarea
            name="notes"
            rows={5}
            placeholder="Ghi chú nội bộ: góc bài muốn viết, điều cần tránh, keyword..."
            className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-7 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </section>

        <div className="flex justify-end">
          <button className="rounded-full bg-stone-950 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-900">
            Save review insight
          </button>
        </div>
      </form>
    </AdminShell>
  );
}

function TextField({
  label,
  name,
  required,
  type = "text",
  step,
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        required={required}
        type={type}
        step={step}
        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}
