"use client";

import { useEffect, useRef } from "react";

type IntentContext = {
  articleId?: string;
  bookId?: string;
  painPointId?: string;
};

type IntentEventPayload = IntentContext & {
  type: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

export function IntentEventTracker({
  articleId,
  bookId,
  painPointId,
  observeCta = true,
}: IntentContext & { observeCta?: boolean }) {
  const sentRef = useRef(new Set<string>());

  useEffect(() => {
    const context = { articleId, bookId, painPointId };

    function sendOnce(type: string, metadata?: Record<string, unknown>) {
      const key = `${type}:${JSON.stringify(metadata || {})}`;
      if (sentRef.current.has(key)) return;
      sentRef.current.add(key);
      trackIntentEvent({ type, ...context, metadata });
    }

    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const depth = (window.scrollY / scrollable) * 100;
      if (depth >= 50) sendOnce("article_scroll_50", { depth: 50 });
      if (depth >= 90) {
        sendOnce("article_scroll_90", { depth: 90 });
        window.removeEventListener("scroll", onScroll);
      }
    }

    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-intent-event]",
      );
      if (!target) return;

      const rawMeta = target.dataset.intentMeta;
      let metadata: Record<string, unknown> = {
        target: target.dataset.intentTarget || target.tagName.toLowerCase(),
      };

      if (rawMeta) {
        try {
          metadata = { ...metadata, ...(JSON.parse(rawMeta) as Record<string, unknown>) };
        } catch {
          metadata.rawMeta = rawMeta;
        }
      }

      trackIntentEvent({
        type: target.dataset.intentEvent || "intent_click",
        ...context,
        metadata,
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onClick);
    onScroll();

    let ctaObserver: IntersectionObserver | null = null;
    if (observeCta) {
      const ctaElement = document.querySelector("[data-cta-visible-target]");
      if (ctaElement) {
        ctaObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                sendOnce("cta_visible", { ratio: Number(entry.intersectionRatio.toFixed(2)) });
                ctaObserver?.disconnect();
              }
            }
          },
          { threshold: 0.4 },
        );
        ctaObserver.observe(ctaElement);
      }
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick);
      ctaObserver?.disconnect();
    };
  }, [articleId, bookId, painPointId, observeCta]);

  return null;
}

export function trackIntentEvent(payload: IntentEventPayload) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    ...payload,
    path: payload.path || window.location.pathname,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/intent-events", blob)) return;
    }

    fetch("/api/intent-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Intent events must never interrupt reading.
  }
}
