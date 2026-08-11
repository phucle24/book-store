"use client";

import { useMemo, useSyncExternalStore } from "react";
import { trackIntentEvent } from "@/components/IntentEventTracker";

export type SavedArticleItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  readingTime: number;
  savedAt?: string;
  tags?: string[];
  tagLinks?: { name: string; href: string }[];
};

const storageKey = "tram-doc-saved-articles";

export function SavedArticleButton({ article }: { article: SavedArticleItem }) {
  const savedSnapshot = useSyncExternalStore(
    subscribeSavedArticles,
    getSavedSnapshot,
    getServerSnapshot,
  );
  const saved = useMemo(() => parseSavedSnapshot(savedSnapshot), [savedSnapshot]);
  const isSaved = saved.some((item) => item.id === article.id);

  function toggleSaved() {
    const current = readSavedArticles();
    const exists = current.some((item) => item.id === article.id);
    const next = exists
      ? current.filter((item) => item.id !== article.id)
      : [{ ...article, savedAt: new Date().toISOString() }, ...current].slice(0, 50);

    writeSavedArticles(next);
    if (!exists) {
      trackIntentEvent({
        type: "saved_article",
        articleId: article.id,
        metadata: { slug: article.slug, tags: article.tags || [] },
      });
    }
  }

  return (
    <button
      type="button"
      onClick={toggleSaved}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        isSaved
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-stone-300 bg-white text-stone-700 hover:border-amber-300 hover:text-amber-900"
      }`}
    >
      {isSaved ? "Đã lưu bài" : "Lưu bài này"}
    </button>
  );
}

export function readSavedArticles(): SavedArticleItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isSavedArticleItem);
  } catch {
    return [];
  }
}

export function writeSavedArticles(items: SavedArticleItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(items));
  window.dispatchEvent(new Event("saved-articles-updated"));
}

function isSavedArticleItem(value: unknown): value is SavedArticleItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<SavedArticleItem>;

  return Boolean(
    typeof item.id === "string" &&
      typeof item.title === "string" &&
      typeof item.slug === "string" &&
      typeof item.excerpt === "string" &&
      typeof item.readingTime === "number",
  );
}

function subscribeSavedArticles(callback: () => void) {
  window.addEventListener("saved-articles-updated", callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("saved-articles-updated", callback);
    window.removeEventListener("storage", callback);
  };
}

function getSavedSnapshot() {
  return typeof window === "undefined" ? "[]" : window.localStorage.getItem(storageKey) || "[]";
}

function getServerSnapshot() {
  return "[]";
}

function parseSavedSnapshot(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot);
    return Array.isArray(parsed) ? parsed.filter(isSavedArticleItem) : [];
  } catch {
    return [];
  }
}
