"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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
  const [localBlobUrl, setLocalBlobUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    };
  }, [localBlobUrl]);

  const uploadFile = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    setSuccessMsg(null);

    // Tạo preview ngay lập tức từ file local
    const blob = URL.createObjectURL(file);
    setLocalBlobUrl(blob);

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
      setSuccessMsg(`Đã upload thành công lên VPS (${(file.size / 1024).toFixed(0)} KB)`);
    } catch {
      setError("Lỗi kết nối khi tải ảnh lên VPS. Kiểm tra lại mạng.");
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

  const displayImageSrc = localBlobUrl || url;
  const hasPreview = Boolean(
    displayImageSrc &&
      (displayImageSrc.startsWith("blob:") ||
        displayImageSrc.startsWith("/") ||
        displayImageSrc.startsWith("http")),
  );

  return (
    <div className="space-y-2">
      {/* Hidden input gửi URL về form */}
      <input type="hidden" name={name} value={url} />

      <label className="block text-sm font-medium text-stone-700">{label}</label>

      {/* Preview ảnh hiện tại */}
      {hasPreview && (
        <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 p-2">
          <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayImageSrc}
              alt="Preview ảnh bìa"
              className="h-full w-full object-contain"
              onError={(e) => {
                // Nếu load URL từ server bị lỗi nhưng có blob thì giữ blob
                if (localBlobUrl) {
                  (e.target as HTMLImageElement).src = localBlobUrl;
                }
              }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between px-1 text-xs">
            <span className="truncate font-mono text-stone-500 max-w-[240px]">
              {url || "Đang tải lên..."}
            </span>
            <div className="flex items-center gap-2">
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-amber-800 hover:underline"
                >
                  🔗 Mở ảnh gốc
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setLocalBlobUrl(null);
                  setSuccessMsg(null);
                }}
                className="font-medium text-rose-600 hover:underline"
              >
                ✕ Xóa
              </button>
            </div>
          </div>
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
            <p className="text-xs text-stone-500">Đang lưu ảnh vào thư mục trên VPS...</p>
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
            <p className="text-[11px] text-stone-400">JPG, PNG, WebP · Tối đa 5MB · Tự động lưu trên VPS</p>
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
          setLocalBlobUrl(null);
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
