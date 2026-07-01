import Link from "next/link";

export function AffiliateButton({
  trackingSlug,
  label = "Xem giá sách trên Shopee",
  sublabel,
  size = "md",
  fullWidth = false,
}: {
  trackingSlug?: string | null;
  label?: string;
  sublabel?: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  if (!trackingSlug) return null;

  const sizeClass = {
    sm: "gap-2 rounded-2xl px-3 py-2 text-xs",
    md: "gap-2.5 rounded-2xl px-5 py-3 text-sm",
    lg: "gap-3 rounded-3xl px-5 py-4 text-base",
  }[size];

  return (
    <Link
      href={`/go/${trackingSlug}`}
      className={`group inline-flex items-center justify-center bg-gradient-to-r from-[#ee4d2d] via-[#f06a2f] to-amber-700 font-semibold text-white shadow-[0_12px_28px_rgba(180,83,9,0.22)] ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:from-stone-950 hover:via-stone-900 hover:to-amber-900 hover:shadow-[0_16px_34px_rgba(28,25,23,0.22)] focus:outline-none focus:ring-4 focus:ring-amber-200 ${
        fullWidth ? "w-full" : ""
      } ${sizeClass}`}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/18 ring-1 ring-white/30 transition group-hover:bg-white/12">
        <ShopeeBagIcon />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block whitespace-normal">{label}</span>
        {sublabel ? (
          <span className="mt-0.5 block text-[0.72rem] font-medium leading-4 text-white/82">
            {sublabel}
          </span>
        ) : null}
      </span>
      {size !== "sm" ? (
        <span className="ml-1 text-lg leading-none transition group-hover:translate-x-0.5">
          →
        </span>
      ) : null}
    </Link>
  );
}

function ShopeeBagIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6.5 8.5h11l-.8 10.2a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8L6.5 8.5Z" />
      <path d="M9 9V7a3 3 0 0 1 6 0v2" />
      <path d="M9.8 13.3c.6.5 1.3.7 2.2.7 1.2 0 2-.5 2-1.2s-.7-1.1-1.9-1.2c-1-.1-1.9-.5-1.9-1.4s.8-1.4 1.9-1.4c.7 0 1.3.2 1.8.5" />
    </svg>
  );
}
