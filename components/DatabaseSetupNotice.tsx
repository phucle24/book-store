export function DatabaseSetupNotice() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-amber-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-800">
          Cần cấu hình database
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-950">
          Next dev server đã chạy, nhưng chưa có DATABASE_URL
        </h1>
        <p className="mt-4 leading-7 text-stone-700">
          Website này dùng Prisma + PostgreSQL. Tạo file <code>.env</code> hoặc{" "}
          <code>.env.local</code> từ <code>.env.example</code>, sau đó chạy migrate
          và seed để có dữ liệu mẫu.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-sm leading-7 text-stone-100">
{`cp .env.example .env
# sửa DATABASE_URL cho đúng PostgreSQL local của bạn
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev`}
        </pre>
        <p className="mt-4 text-sm leading-6 text-stone-500">
          Máy hiện tại chưa có PostgreSQL/Docker trong PATH, nên tôi không thể tự
          tạo database local thay bạn từ terminal này.
        </p>
      </div>
    </div>
  );
}
