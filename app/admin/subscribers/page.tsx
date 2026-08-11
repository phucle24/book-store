import Link from "next/link";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminSubscribersPage() {
  await requireAdmin();
  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { painPoint: true },
  });

  return (
    <AdminShell
      title="Subscribers"
      description="Danh sách email đã lưu. MVP chỉ thu thập và export CSV, chưa gửi email tự động."
      actions={
        <Link
          href="/admin/subscribers/export"
          className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900"
        >
          Export CSV
        </Link>
      }
    >
      <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-[0.14em] text-stone-500">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Pain point</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {subscribers.map((subscriber) => (
              <tr key={subscriber.id}>
                <td className="px-4 py-3 font-medium text-stone-950">{subscriber.email}</td>
                <td className="px-4 py-3 text-stone-600">{subscriber.source || "-"}</td>
                <td className="px-4 py-3 text-stone-600">
                  {subscriber.painPoint?.name || "-"}
                </td>
                <td className="px-4 py-3 text-stone-500">
                  {subscriber.createdAt.toLocaleDateString("vi-VN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
