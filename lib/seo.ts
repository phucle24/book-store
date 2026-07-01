import type { Metadata } from "next";

export const siteName =
  process.env.NEXT_PUBLIC_SITE_NAME || "Trạm Đọc Một Chút";

export function siteUrl(path = "/") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000")
    .replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

export function pageMetadata({
  title,
  description,
  path,
  image,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
}): Metadata {
  const absoluteTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const url = siteUrl(path);

  return {
    title: absoluteTitle,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: absoluteTitle,
      description,
      url,
      siteName,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: absoluteTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}
