import type { MetadataRoute } from "next";
import { siteName, siteUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "Trạm Đọc",
    description: "Review sách theo cảm xúc, nỗi đau và bối cảnh đời thường.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbf7ef",
    theme_color: "#92400e",
    icons: [
      {
        src: siteUrl("/icon"),
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
