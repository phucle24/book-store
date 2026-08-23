"use client";

import { useState, useRef, useCallback } from "react";

interface ImageUploadFieldProps {
  name: string;
  currentValue?: string | null;
  label: string;
  placeholder?: string;
  bookTitle?: string;
  bookAuthor?: string;
}

export function ImageUploadField({
  name,
  currentValue,
  label,
  placeholder = "https://example.com/image.jpg",
  bookTitle,
  bookAuthor,
}: ImageUploadFieldProps) {
  const [url, setUrl] = useState(currentValue || "");
  const [uploading, setUploading] = useState(false);
  const [fetchingGoogle, setFetchingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload thất bại. Vui lòng thử lại.");
        return;
      }

      setUrl(data.url);
      setSuccessMsg("Đã tải ảnh lên VPS thành công!");
    } catch {
      setError("Lỗi kết nối. Kiểm tra lại mạng và thử lại.");
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFetchFromGoogleBooks = async () => {
    setError(null);
    setSuccessMsg(null);

    // Lấy tên sách từ props hoặc từ input "title" trên form
    let titleToSearch = bookTitle?.trim();
    if (!titleToSearch && typeof document !== "undefined") {
      const titleInput = document.querySelector<HTMLInputElement>('input[name="title"]');
      titleToSearch = titleInput?.value?.trim();
    }

    let authorToSearch = bookAuthor?.trim();
    if (!authorToSearch && typeof document !== "undefined") {
      const authorInput = document.querySelector<HTMLInputElement>('input[name="author"]');
      authorToSearch = authorInput?.value?.trim();
    }

    if (!titleToSearch) {
      setError("Vui lòng nhập Tên sách ở bên dưới trước khi tìm ảnh trên Google Books.");
      return;
    }

    setFetchingGoogle(true);

    try {
      const res = await fetch("/api/admin/fetch-google-book-cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleToSearch,
          author: authorToSearch,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message || data.error || "Không tìm thấy ảnh trên Google Books.");
        return;
      }

      setUrl(data.coverImage);
      setSuccessMsg("Đã tìm thấy & tải ảnh từ Google Books về VPS thành công!");
    } catch {
      setError("Lỗi khi kết nối tới Google Books API.");
    } finally {
      setFetchingGoogle(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const hasPreview = url && (url.startsWith("/") || url.startsWith("http"));

  return (
    <div className="space-y-2">
      {/* Hidden input gửi URL về form */}
      <input type="hidden" name={name} value={url} />

      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-stone-700">{label}</label>
        <button
          type="button"
          onClick={handleFetchFromGoogleBooks}
          disabled={fetchingGoogle || uploading}
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-200 transition disabled:opacity-50"
          title="Tự động tìm kiếm ảnh bìa trên Google Books và tải về VPS"
        >
          {fetchingGoogle ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
              <span>Đang tìm Google Books...</span>
            </>
          ) : (
            <>
              <span>🔍</span>
              <span>Tìm từ Google Books (Free)</span>
            </>
          )}
        </button>
      </div>

      {/* Preview ảnh hiện tại */}
      {hasPreview && (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Preview ảnh bìa"
            className="h-44 w-full object-contain bg-stone-100 p-2"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={() => {
              setUrl("");
              setSuccessMsg(null);
            }}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900/70 text-xs text-white hover:bg-rose-600 transition"
            title="Xóa ảnh"
          >
            ✕
          </button>
        </div>
      )}

      {/* Khu vực kéo thả upload */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 text-center transition-all ${
          isDragging
            ? "border-amber-500 bg-amber-50"
            : "border-stone-300 bg-stone-50 hover:border-amber-400 hover:bg-amber-50/50"
        } ${uploading || fetchingGoogle ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileChange}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-800 border-t-transparent" />
            <p className="text-xs text-stone-500">Đang tải ảnh lên VPS...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-200 text-lg text-stone-500">
              📷
            </div>
            <p className="text-xs font-medium text-stone-700">
              Kéo thả ảnh vào đây hoặc{" "}
              <span className="text-amber-800 underline">chọn từ máy tính</span>
            </p>
            <p className="text-[11px] text-stone-400">JPG, PNG, WebP · Tối đa 5MB · Tự lưu trên VPS</p>
          </div>
        )}
      </div>

      {/* Hoặc nhập URL trực tiếp */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-[11px] text-stone-400">hoặc dán URL ảnh trực tiếp</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <input
        type="text"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          setSuccessMsg(null);
        }}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />

      {successMsg && (
        <p className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
          <span>✓</span> {successMsg}
        </p>
      )}

      {error && (
        <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
