import { readFile, stat } from "fs/promises";
import { join, normalize, extname } from "path";
import { existsSync } from "fs";

export const dynamic = "force-dynamic";

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

/**
 * GET /uploads/[...path]
 * Phục vụ trực tiếp tất cả file ảnh upload lúc runtime trên VPS.
 * Khắc phục triệt để lỗi Next.js Production chỉ serve file tĩnh có sẵn lúc build.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];

    if (!pathSegments.length) {
      return new Response("Not found", { status: 404 });
    }

    // Ngăn chặn Path Traversal attack
    const safePath = normalize(pathSegments.join("/")).replace(/^(\.\.[\/\\])+/, "");
    if (safePath.includes("..")) {
      return new Response("Forbidden", { status: 403 });
    }

    // Tìm file trong public/uploads hoặc uploads
    const candidatePaths = [
      join(process.cwd(), "public", "uploads", safePath),
      join(process.cwd(), "uploads", safePath),
    ];

    let targetFile: string | null = null;
    for (const p of candidatePaths) {
      if (existsSync(p)) {
        const fileStat = await stat(p);
        if (fileStat.isFile()) {
          targetFile = p;
          break;
        }
      }
    }

    if (!targetFile) {
      return new Response("File not found", { status: 404 });
    }

    const ext = extname(targetFile).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const buffer = await readFile(targetFile);

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("Error serving uploaded file:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
