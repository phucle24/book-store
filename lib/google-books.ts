import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { slugify } from "@/lib/slugify";

export type GoogleBookInfo = {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  pageCount?: number;
  categories: string[];
  isbn?: string;
  coverImageUrl?: string;
  previewLink?: string;
};

/**
 * 1. Tìm kiếm sách trên Google Books API
 */
export async function searchGoogleBooks(
  query: string,
  options: { author?: string; limit?: number } = {},
): Promise<GoogleBookInfo[]> {
  const { author, limit = 5 } = options;

  let q = query.trim();
  if (author && author !== "Không rõ") {
    q = `intitle:${query} inauthor:${author}`;
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", q);
  url.searchParams.set("maxResults", String(limit));
  url.searchParams.set("printType", "books");
  if (apiKey) {
    url.searchParams.set("key", apiKey);
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BookStoreBot/1.0)",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item: any) => {
      const v = item.volumeInfo || {};
      const img = v.imageLinks || {};

      let coverUrl =
        img.extraLarge ||
        img.large ||
        img.medium ||
        img.small ||
        img.thumbnail ||
        img.smallThumbnail ||
        null;

      if (coverUrl) {
        coverUrl = coverUrl
          .replace(/^http:\/\//i, "https://")
          .replace(/&edge=curl/gi, "");
      }

      const isbns = v.industryIdentifiers || [];
      const isbnObj =
        isbns.find((i: any) => i.type === "ISBN_13") ||
        isbns.find((i: any) => i.type === "ISBN_10") ||
        isbns[0];

      return {
        id: item.id,
        title: v.title || query,
        subtitle: v.subtitle,
        authors: Array.isArray(v.authors) ? v.authors : [],
        publisher: v.publisher,
        publishedDate: v.publishedDate,
        description: v.description,
        pageCount: typeof v.pageCount === "number" ? v.pageCount : undefined,
        categories: Array.isArray(v.categories) ? v.categories : [],
        isbn: isbnObj?.identifier,
        coverImageUrl: coverUrl || undefined,
        previewLink: v.previewLink,
      };
    });
  } catch (error) {
    console.warn("Google Books API search error:", error);
    return [];
  }
}

/**
 * 2. Tìm kiếm sách trên Open Library (Hoàn toàn miễn phí, không cần API key)
 */
export async function searchOpenLibrary(
  query: string,
  author?: string,
): Promise<{ coverUrl?: string; info?: Partial<GoogleBookInfo> }> {
  try {
    const q = author && author !== "Không rõ" ? `${query} ${author}` : query;
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=3`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; BookStoreBot/1.0)" },
    });

    if (!res.ok) return {};

    const data = await res.json();
    const doc = data.docs?.[0];
    if (!doc) return {};

    let coverUrl: string | undefined = undefined;
    if (doc.cover_i) {
      coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    } else if (doc.isbn?.[0]) {
      coverUrl = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-L.jpg`;
    }

    return {
      coverUrl,
      info: {
        title: doc.title || query,
        authors: doc.author_name || (author ? [author] : []),
        publisher: doc.publisher?.[0],
        publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : undefined,
        pageCount: doc.number_of_pages_median,
        isbn: doc.isbn?.[0],
        coverImageUrl: coverUrl,
      },
    };
  } catch (error) {
    console.warn("Open Library search error:", error);
    return {};
  }
}

/**
 * 3. Tải ảnh từ URL và lưu về server local (/public/uploads/books/)
 * Trả về đường dẫn tương đối: `/uploads/books/book-cover-...`
 */
export async function downloadAndSaveCoverImage(
  imageUrl: string,
  bookTitleOrSlug: string,
): Promise<string | null> {
  if (!imageUrl || !imageUrl.startsWith("http")) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    else if (contentType.includes("webp")) ext = "webp";
    else if (contentType.includes("gif")) ext = "gif";

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Kiểm tra buffer có dữ liệu ảnh hợp lệ (> 500 bytes)
    if (buffer.length < 500) {
      return null;
    }

    const uploadDir = join(process.cwd(), "public", "uploads", "books");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const cleanSlug = slugify(bookTitleOrSlug).slice(0, 40) || "book";
    const filename = `book-cover-${Date.now()}-${cleanSlug}.${ext}`;
    const filePath = join(uploadDir, filename);

    await writeFile(filePath, buffer);

    return `/uploads/books/${filename}`;
  } catch (error) {
    console.error("Error downloading and saving cover image:", error);
    return null;
  }
}

/**
 * Tự động tìm kiếm ảnh bìa và metadata sách từ Google Books & Open Library và tải về lưu trên VPS
 */
export async function autoFetchAndSaveGoogleBookCover(
  title: string,
  author?: string | null,
  slug?: string | null,
): Promise<{
  coverImage: string | null;
  bookInfo: GoogleBookInfo | null;
}> {
  if (!title?.trim()) {
    return { coverImage: null, bookInfo: null };
  }

  // 1. Thử Google Books API trước
  const googleResults = await searchGoogleBooks(title, {
    author: author || undefined,
    limit: 3,
  });

  const googleMatch = googleResults.find((r) => r.coverImageUrl) || googleResults[0];

  if (googleMatch?.coverImageUrl) {
    const savedUrl = await downloadAndSaveCoverImage(googleMatch.coverImageUrl, slug || title);
    if (savedUrl) {
      return {
        coverImage: savedUrl,
        bookInfo: googleMatch,
      };
    }
  }

  // 2. Fallback: Thử Open Library (miễn phí 100%, có kho ảnh bìa chất lượng cao)
  const openLib = await searchOpenLibrary(title, author || undefined);
  if (openLib.coverUrl) {
    const savedUrl = await downloadAndSaveCoverImage(openLib.coverUrl, slug || title);
    if (savedUrl) {
      return {
        coverImage: savedUrl,
        bookInfo: (openLib.info as GoogleBookInfo) || googleMatch || null,
      };
    }
  }

  return {
    coverImage: null,
    bookInfo: googleMatch || (openLib.info as GoogleBookInfo) || null,
  };
}
