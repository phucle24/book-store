import Link from "next/link";
import { ArticleStatus } from "@prisma/client";
import { AdminShell } from "@/components/AdminShell";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SystemStatusPage() {
  await requireAdmin();

  const database = await databaseStatus();
  const [demoAffiliateLinks, scheduledArticles] = await Promise.all([
    prisma.affiliateLink.count({
      where: {
        isActive: true,
        OR: [
          { destinationUrl: { contains: "example.com", mode: "insensitive" } },
          { destinationUrl: { contains: "shopee.vn/search?keyword", mode: "insensitive" } },
          { destinationUrl: { contains: "localhost", mode: "insensitive" } },
        ],
      },
    }),
    prisma.article.count({
      where: {
        status: ArticleStatus.SCHEDULED,
        scheduledAt: { gte: new Date() },
      },
    }),
  ]);

  const services = [
    {
      name: "Database",
      ok: database.ok,
      detail: database.ok ? "Kết nối PostgreSQL đang hoạt động." : database.message,
    },
    {
      name: "Cron publish",
      ok: hasSafeSecret("CRON_SECRET", 32),
      detail: hasSafeSecret("CRON_SECRET", 32)
        ? `${scheduledArticles} bài đang chờ lịch. Hãy bảo đảm VPS cron gọi endpoint đúng chu kỳ.`
        : "Thiếu hoặc CRON_SECRET quá ngắn. Scheduled article sẽ không được bảo vệ đúng cách.",
    },
    {
      name: "DeepSeek AI",
      ok: hasConfiguredValue("DEEPSEEK_API_KEY"),
      detail: hasConfiguredValue("DEEPSEEK_API_KEY")
        ? "Sẵn sàng cho AI Autopilot và cải thiện nội dung."
        : "Chưa cấu hình API key; AI Autopilot sẽ báo lỗi thân thiện.",
    },
    {
      name: "Tavily research",
      ok: hasConfiguredValue("TAVILY_API_KEY"),
      detail: hasConfiguredValue("TAVILY_API_KEY")
        ? "Sẵn sàng research nguồn public cho AI Autopilot."
        : "Chưa cấu hình API key; chỉ research autopilot sẽ không chạy.",
    },
    {
      name: "Production URL",
      ok: isProductionSiteUrl(),
      detail: isProductionSiteUrl()
        ? "Canonical, sitemap và metadata đang dùng HTTPS domain production."
        : "NEXT_PUBLIC_SITE_URL vẫn là localhost hoặc chưa dùng HTTPS.",
    },
    {
      name: "Google Search Console",
      ok: hasConfiguredValue("GOOGLE_SITE_VERIFICATION"),
      detail: hasConfiguredValue("GOOGLE_SITE_VERIFICATION")
        ? "Verification meta tag đã sẵn sàng."
        : "Chưa có GOOGLE_SITE_VERIFICATION; chưa nên submit sitemap chính thức.",
    },
  ];

  return (
    <AdminShell
      title="Trạng thái hệ thống"
      description="Kiểm tra nhanh những điều có thể làm website lỗi, không index được hoặc không thể vận hành nội dung đúng lịch."
      actions={
        <Link
          href="/admin/content-audit"
          className="rounded-full bg-amber-800 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-950"
        >
          Mở content audit
        </Link>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((service) => (
          <section
            key={service.name}
            className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-stone-950">{service.name}</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  service.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"
                }`}
              >
                {service.ok ? "Sẵn sàng" : "Cần xử lý"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-stone-600">{service.detail}</p>
          </section>
        ))}
      </div>

      <section className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Affiliate links trước launch</h2>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          {demoAffiliateLinks
            ? `${demoAffiliateLinks} link active vẫn là link mẫu hoặc link tìm kiếm. Thay bằng link affiliate sản phẩm thật trước khi chạy traffic.`
            : "Không phát hiện affiliate link mẫu trong các link đang active."}
        </p>
        <Link
          href="/admin/books"
          className="mt-4 inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
        >
          Kiểm tra sách và link
        </Link>
      </section>
    </AdminShell>
  );
}

async function databaseStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, message: "" };
  } catch {
    return { ok: false, message: "Không kết nối được PostgreSQL. Kiểm tra DATABASE_URL, DNS và Neon." };
  }
}

function hasConfiguredValue(name: string) {
  const value = process.env[name]?.trim() || "";
  return Boolean(value && !value.startsWith("your_") && !value.startsWith("change_me"));
}

function hasSafeSecret(name: string, minimumLength: number) {
  const value = process.env[name]?.trim() || "";
  return value.length >= minimumLength && !value.startsWith("change_me");
}

function isProductionSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "";
  return value.startsWith("https://") && !value.includes("localhost") && !value.includes("127.0.0.1");
}
