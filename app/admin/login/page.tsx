import { loginAction } from "@/lib/admin-actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fffaf2] px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
          Admin
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-950">Đăng nhập</h1>
        <p className="mt-2 text-sm leading-6 text-stone-600">
          Dùng email và mật khẩu trong biến môi trường để quản trị nội dung MVP.
        </p>

        {params.error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {params.error}
          </div>
        ) : null}

        <form action={loginAction} className="mt-6 space-y-4">
          <input type="hidden" name="next" value={params.next || "/admin"} />
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Mật khẩu</span>
            <input
              name="password"
              type="password"
              required
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            />
          </label>
          <button className="w-full rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900">
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
}
