"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function ReadingProgress() {
  const pathname = usePathname();
  const [progress, setProgress] = useState(0);
  const isArticle = pathname?.startsWith("/bai-viet/");

  useEffect(() => {
    if (!isArticle) return;

    function updateProgress() {
      const scrollTop = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(maxScroll <= 0 ? 0 : Math.min(scrollTop / maxScroll, 1));
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [isArticle]);

  if (!isArticle) return null;

  return (
    <div className="fixed left-0 top-0 z-50 h-1 w-full bg-transparent">
      <div
        className="h-full bg-amber-700 transition-[width] duration-150"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
