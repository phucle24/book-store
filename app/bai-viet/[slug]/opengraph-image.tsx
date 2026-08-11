import { ImageResponse } from "next/og";
import { getPublishedArticleBySlug } from "@/lib/queries";
import { siteName } from "@/lib/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function ArticleOpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug);
  const title = article?.title || "Review sách theo nỗi đau người đọc";
  const painPoint = article?.painPoints[0]?.name || "Trạm Đọc Một Chút";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbf7ef",
          color: "#1c1917",
          padding: 72,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, color: "#92400e", letterSpacing: 3 }}>
          {siteName.toUpperCase()}
        </div>
        <div style={{ display: "flex", maxWidth: 960, fontSize: 62, lineHeight: 1.12, fontWeight: 700 }}>
          {title}
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#57534e" }}>
          {painPoint} · Review sách theo bối cảnh đời thường
        </div>
      </div>
    ),
    size,
  );
}
