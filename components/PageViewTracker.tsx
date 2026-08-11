"use client";

import { useEffect, useRef } from "react";

type PageViewTrackerProps = {
  articleId?: string;
  bookId?: string;
  path: string;
};

export function PageViewTracker({ articleId, bookId, path }: PageViewTrackerProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const body = JSON.stringify({ articleId, bookId, path });
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon("/api/page-views", blob)) return;
      }

      fetch("/api/page-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // Page views are telemetry only and must never interrupt reading.
    }
  }, [articleId, bookId, path]);

  return null;
}
