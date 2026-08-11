import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireAdmin();
  const subscribers = await prisma.subscriber.findMany({
    orderBy: { createdAt: "desc" },
    include: { painPoint: true },
  });

  const rows = [
    ["email", "source", "painPoint", "createdAt"],
    ...subscribers.map((subscriber) => [
      subscriber.email,
      subscriber.source || "",
      subscriber.painPoint?.name || "",
      subscriber.createdAt.toISOString(),
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tram-doc-subscribers.csv"`,
    },
  });
}

function csvCell(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}
