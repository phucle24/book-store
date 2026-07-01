import type { ReactNode } from "react";
import { logoutAction } from "@/lib/admin-actions";

export function AdminHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-stone-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-950">{title}</h1>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {actions}
          <form action={logoutAction}>
            <button className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
