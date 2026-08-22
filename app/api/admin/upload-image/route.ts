import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

/**
 * POST /api/admin/upload-image
 * Upload an image from local and save it to public/uploads/books/ on VPS.
 * Returns: { url: "/uploads/books/filename.ext" }
 */
export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Không có file nào được chọn." }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Định dạng ảnh không hợp lệ. Chỉ chấp nhận: JPG, PNG, WebP, GIF.` },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ảnh quá lớn. Tối đa 5MB.` },
        { status: 400 },
      );
    }

    // Tạo tên file an toàn không trùng lặp
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filename = `book-${timestamp}-${random}.${ext}`;

    // Đường dẫn lưu file (trong thư mục public để Next.js phục vụ)
    const uploadDir = join(process.cwd(), "public", "uploads", "books");

    // Tạo thư mục nếu chưa tồn tại
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, filename);

    // Chuyển đổi File sang Buffer và ghi vào đĩa
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Trả về URL tương đối để dùng trong <img> và Next.js Image
    const url = `/uploads/books/${filename}`;

    return NextResponse.json({ url, filename, size: file.size });
  } catch (error) {
    console.error("Upload image error:", error);
    return NextResponse.json({ error: "Lỗi khi tải ảnh lên. Vui lòng thử lại." }, { status: 500 });
  }
}
