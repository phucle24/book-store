import { ImageResponse } from "next/og";
import { siteName } from "@/lib/seo";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
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
        <div
          style={{
            fontSize: 28,
            color: "#92400e",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          {siteName}
        </div>
        <div style={{ fontSize: 72, lineHeight: 1.08, maxWidth: 900, fontWeight: 700 }}>
          Tìm đúng cuốn sách cho giai đoạn bạn đang đi qua
        </div>
        <div style={{ fontSize: 30, color: "#57534e", maxWidth: 780 }}>
          Review sách theo cảm xúc, nỗi đau và bối cảnh đời thường.
        </div>
      </div>
    ),
    size,
  );
}
