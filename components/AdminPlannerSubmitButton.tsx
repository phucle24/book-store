"use client";

import { useFormStatus } from "react-dom";

export function AdminPlannerSubmitButton({
  label,
  loadingLabel = "Đang xử lý...",
  className = "",
}: {
  label: string;
  loadingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <div>
      <button
        type="submit"
        disabled={pending}
        className={`${className} ${pending ? "cursor-not-allowed opacity-75" : ""}`}
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            {loadingLabel}
          </span>
        ) : (
          label
        )}
      </button>
      {pending && (
        <p className="mt-2 text-xs text-amber-800 animate-pulse">
          ⏳ AI đang phân tích dữ liệu & viết bài hoàn chỉnh (khoảng 1–3 phút tuỳ số lượng). Vui lòng không tắt hoặc tải lại trang...
        </p>
      )}
    </div>
  );
}
