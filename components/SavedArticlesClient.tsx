"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import {
  type SavedArticleItem,
  writeSavedArticles,
} from "@/components/SavedArticleButton";

export function SavedArticlesClient() {
  const savedSnapshot = useSyncExternalStore(
    subscribeSavedArticles,
    getSavedSnapshot,
    getServerSnapshot,
  );
  const items = useMemo(() => parseSavedSnapshot(savedSnapshot), [savedSnapshot]);
  const groupedItems = groupSavedArticles(items);
  const latestItem = items[0];

  function removeArticle(id: string) {
    const next = items.filter((item) => item.id !== id);
    writeSavedArticles(next);
  }

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-stone-950">Chưa có bài nào được lưu</h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600">
          Khi gặp một bài review đúng với giai đoạn của mình, bạn có thể bấm
          “Lưu bài này” để quay lại đọc chậm hơn sau.
        </p>
        <Link
          href="/bai-viet"
          className="mt-5 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900"
        >
          Xem bài viết
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {latestItem?.tags?.[0] ? (
        <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Gợi ý đọc tiếp
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-950">
            Bạn vừa lưu bài liên quan đến {latestItem.tags[0].toLowerCase()}
          </h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            Khi quay lại, hãy đọc tiếp theo cụm nỗi đau này thay vì mở quá nhiều
            hướng cùng lúc.
          </p>
          <Link
            href={`/noi-dau/${clientSlugify(latestItem.tags[0])}`}
            className="mt-4 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900"
          >
            Xem cụm {latestItem.tags[0]}
          </Link>
        </section>
      ) : null}

      {groupedItems.map((group) => (
        <section key={group.name}>
          <h2 className="text-2xl font-semibold text-stone-950">{group.name}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {group.items.map((item) => (
              <SavedArticleCard key={item.id} item={item} onRemove={removeArticle} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SavedArticleCard({
  item,
  onRemove,
}: {
  item: SavedArticleItem;
  onRemove: (id: string) => void;
}) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      {item.tags?.length ? (
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">
          {item.tags.slice(0, 2).join(" / ")}
        </p>
      ) : null}
      <h3 className="mt-3 text-xl font-semibold leading-snug text-stone-950">
        <Link href={`/bai-viet/${item.slug}`} className="hover:text-amber-900">
          {item.title}
        </Link>
      </h3>
      <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-600">{item.excerpt}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-stone-500">{item.readingTime} phút đọc</span>
        <div className="flex gap-2">
          <Link
            href={`/bai-viet/${item.slug}`}
            className="rounded-full border border-stone-300 px-3 py-1.5 font-medium text-stone-800 hover:bg-stone-50"
          >
            Đọc lại
          </Link>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="rounded-full border border-rose-200 px-3 py-1.5 font-medium text-rose-700 hover:bg-rose-50"
          >
            Bỏ lưu
          </button>
        </div>
      </div>
    </article>
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
  return typeof window === "undefined"
    ? "[]"
    : window.localStorage.getItem("tram-doc-saved-articles") || "[]";
}

function getServerSnapshot() {
  return "[]";
}

function parseSavedSnapshot(snapshot: string): SavedArticleItem[] {
  try {
    const parsed = JSON.parse(snapshot);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is SavedArticleItem =>
      Boolean(
        item &&
          typeof item === "object" &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.slug === "string" &&
          typeof item.excerpt === "string" &&
          typeof item.readingTime === "number",
      ),
    );
  } catch {
    return [];
  }
}

function groupSavedArticles(items: SavedArticleItem[]) {
  const groups = new Map<string, SavedArticleItem[]>();

  for (const item of items) {
    const groupName = item.tags?.[0] || "Bài đã lưu khác";
    groups.set(groupName, [...(groups.get(groupName) || []), item]);
  }

  return Array.from(groups, ([name, groupItems]) => ({ name, items: groupItems }));
}

function clientSlugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
