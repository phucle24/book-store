"use client";

import { useActionState } from "react";
import { subscribeAction } from "@/lib/subscriber-actions";

type SubscribeFormProps = {
  source: string;
  painPointId?: string | null;
  title?: string;
  description?: string;
};

const initialState = { ok: false, message: "" };

export function SubscribeForm({
  source,
  painPointId,
  title = "Nhận 1 gợi ý sách mỗi tuần",
  description = "Một email nhẹ, tập trung vào một vấn đề đọc. Chưa có hệ thống gửi tự động trong MVP này; email chỉ được lưu để vận hành sau.",
}: SubscribeFormProps) {
  const [state, action, pending] = useActionState(subscribeAction, initialState);

  return (
    <section className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-5 shadow-sm sm:p-6">
      <h2 className="text-xl font-semibold text-stone-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-700">{description}</p>
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="source" value={source} />
        {painPointId ? <input type="hidden" name="painPointId" value={painPointId} /> : null}
        <input
          name="email"
          type="email"
          required
          placeholder="Email của bạn"
          className="min-w-0 rounded-full border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
        />
        <button
          disabled={pending}
          className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Đang lưu..." : "Lưu email"}
        </button>
      </form>
      {state.message ? (
        <p className={`mt-3 text-sm ${state.ok ? "text-emerald-800" : "text-rose-700"}`}>
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
