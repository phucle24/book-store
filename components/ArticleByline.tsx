import Link from "next/link";
import { voiceToneLabel } from "@/lib/voice-tones";

type ArticleBylineData = {
  authorName?: string | null;
  authorSlug?: string | null;
  authorBio?: string | null;
  voiceTone?: string | null;
  publishedAt?: Date | null;
  updatedAt?: Date | null;
  readingTime?: number | null;
};

export function ArticleByline({ article }: { article: ArticleBylineData }) {
  const authorName = article.authorName || "Ban biên tập Trạm Đọc";
  const toneLabel = voiceToneLabel(article.voiceTone);

  return (
    <div className="mt-5 flex items-start gap-3 rounded-3xl border border-stone-200 bg-white/80 p-4 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
        {initials(authorName)}
      </div>
      <div className="min-w-0">
        {article.authorSlug ? (
          <Link
            href={`/tac-gia/${article.authorSlug}`}
            className="text-sm font-semibold text-stone-950 hover:text-amber-900"
          >
            {authorName}
          </Link>
        ) : (
          <p className="text-sm font-semibold text-stone-950">{authorName}</p>
        )}
        {article.authorBio ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
            {article.authorBio}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-500">
          {toneLabel ? <span>{toneLabel}</span> : null}
          {article.readingTime ? <span>{article.readingTime} phút đọc</span> : null}
          {article.publishedAt ? (
            <>
              <span>•</span>
              <time dateTime={article.publishedAt.toISOString()}>
                {article.publishedAt.toLocaleDateString("vi-VN")}
              </time>
            </>
          ) : null}
          {article.updatedAt ? (
            <>
              <span>•</span>
              <span>Cập nhật {article.updatedAt.toLocaleDateString("vi-VN")}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi");
}
