"use client";

import { useState, useRef, useCallback } from "react";

interface ImageUploadFieldProps {
  name: string;
  currentValue?: string | null;
  label: string;
  placeholder?: string;
}

export function ImageUploadField({
  name,
  currentValue,
  label,
  placeholder = "https://example.com/image.jpg",
}: ImageUploadFieldProps) {
  const [url, setUrl] = useState(currentValue || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);

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
    } catch {
      setError("Lỗi kết nối. Kiểm tra lại mạng và thử lại.");
    } finally {
      setUploading(false);
    }
  }, []);

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

      <label className="block text-sm font-medium text-stone-700">{label}</label>

      {/* Preview ảnh hiện tại */}
      {hasPreview && (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Preview ảnh bìa"
            className="h-40 w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <button
            type="button"
            onClick={() => setUrl("")}
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
        } ${uploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
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
            <p className="text-[11px] text-stone-400">JPG, PNG, WebP · Tối đa 5MB · Lưu trên VPS</p>
          </div>
        )}
      </div>

      {/* Hoặc nhập URL trực tiếp */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-stone-200" />
        <span className="text-[11px] text-stone-400">hoặc nhập URL trực tiếp</span>
        <div className="h-px flex-1 bg-stone-200" />
      </div>

      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none transition focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />

      {error && (
        <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
