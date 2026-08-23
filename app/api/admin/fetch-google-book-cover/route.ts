import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { autoFetchAndSaveGoogleBookCover } from "@/lib/google-books";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/fetch-google-book-cover
 * Tự động tìm kiếm ảnh bìa và metadata sách từ Google Books API và lưu ảnh về VPS.
 * Request body: { title: string, author?: string, slug?: string }
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, author, slug } = body || {};

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json(
        { error: "Vui lòng cung cấp tên sách để tìm kiếm." },
        { status: 400 },
      );
    }

    const { coverImage, bookInfo } = await autoFetchAndSaveGoogleBookCover(
      title.trim(),
      author?.trim() || undefined,
      slug?.trim() || undefined,
    );

    if (!coverImage) {
      return NextResponse.json({
        success: false,
        message: "Không tìm thấy ảnh bìa phù hợp trên Google Books.",
        bookInfo,
      });
    }

    return NextResponse.json({
      success: true,
      coverImage,
      bookInfo: bookInfo
        ? {
            title: bookInfo.title,
            authors: bookInfo.authors,
            publisher: bookInfo.publisher,
            publishedDate: bookInfo.publishedDate,
            pageCount: bookInfo.pageCount,
            isbn: bookInfo.isbn,
          }
        : null,
    });
  } catch (error) {
    console.error("Fetch Google Book Cover API error:", error);
    return NextResponse.json(
      { error: "Lỗi hệ thống khi tìm kiếm ảnh bìa từ Google Books." },
      { status: 500 },
    );
  }
}
