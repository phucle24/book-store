"use client";

import { useState, useTransition } from "react";
import { toggleReactionAction } from "@/lib/comment-actions";

type ReactionType = "helpful" | "insightful" | "bought" | "loved";

interface ReactionConfig {
  type: ReactionType;
  emoji: string;
  label: string;
}

const REACTIONS: ReactionConfig[] = [
  { type: "helpful", emoji: "👍", label: "Hữu ích" },
  { type: "insightful", emoji: "💡", label: "Mở rộng góc nhìn" },
  { type: "bought", emoji: "📖", label: "Đã đặt mua" },
  { type: "loved", emoji: "❤️", label: "Rất đồng cảm" },
];

export function ArticleReactions({
  articleId,
  bookId,
  initialCounts = {},
}: {
  articleId?: string;
  bookId?: string;
  initialCounts?: Record<string, number>;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({
    helpful: initialCounts.helpful || 0,
    insightful: initialCounts.insightful || 0,
    bought: initialCounts.bought || 0,
    loved: initialCounts.loved || 0,
  });

  const [activeReactions, setActiveReactions] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const handleReact = (type: ReactionType) => {
    if (activeReactions[type]) return;

    // Optimistic UI update
    setActiveReactions((prev) => ({ ...prev, [type]: true }));
    setCounts((prev) => ({ ...prev, [type]: (prev[type] || 0) + 1 }));

    startTransition(async () => {
      await toggleReactionAction({ articleId, bookId, type });
    });
  };

  return (
    <div className="my-8 rounded-3xl border border-stone-200/80 bg-stone-50/70 p-6 text-center sm:p-7">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-900">
        Bạn thấy nội dung này thế nào?
      </p>
      <p className="mt-1 text-xs text-stone-500">
        1 lượt chạm của bạn giúp Trạm hiểu và hoàn thiện các bài viết tiếp theo
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
        {REACTIONS.map(({ type, emoji, label }) => {
          const count = counts[type] || 0;
          const isActive = activeReactions[type];

          return (
            <button
              key={type}
              type="button"
              onClick={() => handleReact(type)}
              disabled={isActive || isPending}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-95 ${
                isActive
                  ? "border-amber-600 bg-amber-50 text-amber-950 shadow-sm"
                  : "border-stone-200 bg-white text-stone-700 hover:border-amber-400 hover:bg-stone-50 hover:shadow-sm"
              }`}
            >
              <span className="text-base">{emoji}</span>
              <span>{label}</span>
              {count > 0 ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? "bg-amber-200/80 text-amber-950" : "bg-stone-100 text-stone-600"
                  }`}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
