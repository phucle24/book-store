"use client";

import { useState } from "react";

export function ArticleShareActions({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    url,
  )}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={facebookShareUrl}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-amber-300 hover:text-amber-900"
        aria-label={`Chia sẻ ${title} lên Facebook`}
      >
        Chia sẻ Facebook
      </a>
      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:border-amber-300 hover:text-amber-900"
      >
        {copied ? "Đã copy link" : "Copy link"}
      </button>
    </div>
  );
}
