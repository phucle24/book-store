import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import {
  analyzeReviewInsightAction,
  generateArticleFromReviewInsightAction,
} from "@/lib/review-insight-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReviewInsightDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  await requireAdmin();
  const [{ id }, messages] = await Promise.all([params, searchParams]);
  const insight = await prisma.reviewInsight.findUnique({
    where: { id },
    include: {
      articles: {
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, status: true, scheduledAt: true, createdAt: true },
      },
    },
  });

  if (!insight) notFound();
  const defaultScheduledAt = toVietnamDatetimeLocal(defaultVietnamScheduledDate());

  return (
    <AdminShell
      title={insight.bookTitle}
      description="Review insight nội bộ từ review được paste thủ công."
      actions={
        <>
          <Link
            href="/admin/review-insights"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm"
          >
            Back
          </Link>
          <form action={analyzeReviewInsightAction}>
            <input type="hidden" name="id" value={insight.id} />
            <button className="rounded-full border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-50">
              Analyze Reviews
            </button>
          </form>
          <form action={generateArticleFromReviewInsightAction}>
            <input type="hidden" name="id" value={insight.id} />
            <input type="hidden" name="publishMode" value="draft" />
            <button className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
              Generate Draft
            </button>
          </form>
        </>
      }
    >
      <AdminNotice error={messages.error} success={messages.success} />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">Product info</h2>
              <StatusBadge status={insight.status} />
            </div>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              <InfoTerm label="Book" value={insight.bookTitle} />
              <InfoTerm label="Author" value={insight.author || "Không rõ"} />
              <InfoTerm label="Reviews pasted" value={String(insight.reviewCount)} />
              <InfoTerm
                label="Rating"
                value={insight.productRating ? String(insight.productRating) : "Chưa nhập"}
              />
              <InfoTerm
                label="Price"
                value={insight.productPrice ? `${insight.productPrice.toLocaleString("vi-VN")}đ` : "Chưa nhập"}
              />
              <InfoTerm
                label="Sold"
                value={insight.soldCount ? insight.soldCount.toLocaleString("vi-VN") : "Chưa nhập"}
              />
            </dl>
            <div className="mt-5 space-y-2 text-sm">
              <a
                href={insight.shopeeProductUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-amber-900 hover:underline"
              >
                Product: {insight.shopeeProductUrl}
              </a>
              <a
                href={insight.affiliateUrl}
                target="_blank"
                rel="noreferrer"
                className="block break-all text-emerald-800 hover:underline"
              >
                Affiliate: {insight.affiliateUrl}
              </a>
            </div>
            {insight.notes ? (
              <div className="mt-5 rounded-2xl bg-stone-50 p-4">
                <p className="text-xs uppercase tracking-[0.12em] text-stone-500">Notes</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-700">
                  {insight.notes}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-950">Original pasted reviews</h2>
            <pre className="mt-4 max-h-[720px] overflow-auto whitespace-pre-wrap rounded-2xl bg-stone-50 p-4 text-sm leading-7 text-stone-700">
              {insight.rawReviews}
            </pre>
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-950">AI extracted insights</h2>
            {insight.summary ? (
              <p className="mt-3 rounded-2xl bg-amber-50 p-4 text-sm leading-7 text-stone-700">
                {insight.summary}
              </p>
            ) : (
              <p className="mt-3 text-sm text-stone-500">
                Chưa phân tích. Bấm Analyze Reviews để DeepSeek rút insight marketing.
              </p>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InsightList title="Positive points" value={insight.positivePoints} />
              <InsightList title="Negative points" value={insight.negativePoints} />
              <InsightList title="Buyer personas" value={insight.buyerPersonas} />
              <InsightList title="Pain points" value={insight.painPoints} />
              <InsightList title="Emotional hooks" value={insight.emotionalHooks} />
              <InsightList title="Objections" value={insight.objections} />
              <InsightList title="Purchase reasons" value={insight.purchaseReasons} />
              <InsightList title="Article angles" value={insight.articleAngles} />
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-950">Generate + Schedule</h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Tạo bài từ insight này và đưa vào hàng đợi đăng tự động. Mặc định là
              ngày mai lúc 08:00 theo giờ Việt Nam.
            </p>
            <form action={generateArticleFromReviewInsightAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <input type="hidden" name="id" value={insight.id} />
              <input type="hidden" name="publishMode" value="scheduled" />
              <label className="block flex-1">
                <span className="text-sm font-medium text-stone-700">Thời gian đăng</span>
                <input
                  name="scheduledAt"
                  type="datetime-local"
                  defaultValue={defaultScheduledAt}
                  className="mt-2 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
                />
              </label>
              <button className="rounded-full bg-amber-800 px-4 py-3 text-sm font-semibold text-white hover:bg-stone-950">
                Generate + Schedule
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-950">Generated articles</h2>
            <div className="mt-4 divide-y divide-stone-100">
              {insight.articles.map((article) => (
                <div key={article.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Link
                      href={`/admin/articles/${article.id}/edit`}
                      className="font-medium text-stone-950 hover:text-amber-900"
                    >
                      {article.title}
                    </Link>
                    <p className="mt-1 text-xs text-stone-500">
                      {article.scheduledAt
                        ? `Lên lịch: ${article.scheduledAt.toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                          })}`
                        : article.createdAt.toLocaleString("vi-VN")}
                    </p>
                  </div>
                  <StatusBadge status={article.status} />
                </div>
              ))}
              {!insight.articles.length ? (
                <p className="py-4 text-sm text-stone-500">
                  Chưa có article draft được tạo từ insight này.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

function defaultVietnamScheduledDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return new Date(
    Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day) + 1, 1, 0, 0),
  );
}

function toVietnamDatetimeLocal(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}T${value.hour}:${value.minute}`;
}

function InfoTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.12em] text-stone-500">{label}</dt>
      <dd className="mt-1 font-medium text-stone-950">{value}</dd>
    </div>
  );
}

function InsightList({ title, value }: { title: string; value: unknown }) {
  const items = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

  return (
    <div className="rounded-2xl border border-stone-200 p-4">
      <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {items.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-stone-500">Chưa có dữ liệu.</p>
      )}
    </div>
  );
}
