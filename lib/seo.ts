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
  type = "website",
  authors,
  publishedTime,
  modifiedTime,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  type?: "website" | "article";
  authors?: string[];
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const absoluteTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const url = siteUrl(path);
  const ogImage = image || siteUrl("/opengraph-image");

  return {
    title: absoluteTitle,
    description,
    authors: authors?.map((name) => ({ name })),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: absoluteTitle,
      description,
      url,
      siteName,
      type,
      images: [{ url: ogImage }],
      ...(type === "article"
        ? {
            publishedTime,
            modifiedTime,
            authors,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: absoluteTitle,
      description,
      images: [ogImage],
    },
  };
}
