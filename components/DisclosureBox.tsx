import Link from "next/link";

export function DisclosureBox() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-stone-700">
      Một số liên kết là affiliate. Trạm Đọc Một Chút có thể nhận hoa hồng nếu
      bạn mua qua liên kết, nhưng giá bạn trả không đổi.{" "}
      <Link href="/tiep-thi-lien-ket" className="font-medium text-amber-900">
        Xem disclosure
      </Link>
      .
    </div>
  );
}
