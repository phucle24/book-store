"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

type QuizTaxonomy = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
};

type QuizArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  readingTime: number;
  painPoints: QuizTaxonomy[];
  audiences: QuizTaxonomy[];
};

type QuizBook = {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string;
  suitableFor: string[];
  keyLessons: string[];
  painPoints: QuizTaxonomy[];
  audiences: QuizTaxonomy[];
};

const goals = [
  {
    id: "hanh-dong",
    label: "Muốn bắt đầu hành động",
    keywords: ["bắt đầu", "hành động", "trì hoãn", "kỷ luật", "thói quen"],
  },
  {
    id: "chua-lanh",
    label: "Muốn dịu lại một chút",
    keywords: ["chữa lành", "cô đơn", "chia tay", "dịu", "mất phương hướng"],
  },
  {
    id: "ky-luat",
    label: "Muốn có kỷ luật hơn",
    keywords: ["kỷ luật", "thói quen", "atomic", "hệ thống", "động lực"],
  },
  {
    id: "giao-tiep",
    label: "Muốn giao tiếp tốt hơn",
    keywords: ["giao tiếp", "công việc", "kết nối", "tự tin"],
  },
];

export function BookQuiz({
  painPoints,
  audiences,
  articles,
  books,
}: {
  painPoints: QuizTaxonomy[];
  audiences: QuizTaxonomy[];
  articles: QuizArticle[];
  books: QuizBook[];
}) {
  const [painSlug, setPainSlug] = useState(painPoints[0]?.slug || "");
  const [audienceSlug, setAudienceSlug] = useState(audiences[0]?.slug || "");
  const [timeMode, setTimeMode] = useState("short");
  const [goalId, setGoalId] = useState(goals[0].id);
  const [hasResult, setHasResult] = useState(false);

  const selectedPain = painPoints.find((item) => item.slug === painSlug);
  const selectedAudience = audiences.find((item) => item.slug === audienceSlug);
  const selectedGoal = goals.find((goal) => goal.id === goalId) || goals[0];

  const result = useMemo(() => {
    const article = scoreArticles({
      articles,
      painSlug,
      audienceSlug,
      timeMode,
      keywords: selectedGoal.keywords,
    })[0];
    const matchedBooks = scoreBooks({
      books,
      painSlug,
      audienceSlug,
      keywords: selectedGoal.keywords,
    }).slice(0, 2);

    return { article, books: matchedBooks };
  }, [articles, audienceSlug, books, painSlug, selectedGoal.keywords, timeMode]);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
          Quiz chọn sách
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">
          Hôm nay bạn đang cần kiểu sách nào?
        </h2>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Chọn vài tín hiệu gần đúng. Kết quả chỉ là gợi ý để bắt đầu, không phải
          kết luận thay bạn.
        </p>

        <QuizGroup title="Vấn đề gần nhất">
          {painPoints.slice(0, 9).map((painPoint) => (
            <ChoiceButton
              key={painPoint.id}
              active={painSlug === painPoint.slug}
              onClick={() => setPainSlug(painPoint.slug)}
            >
              {painPoint.name}
            </ChoiceButton>
          ))}
        </QuizGroup>

        <QuizGroup title="Bạn thuộc nhóm nào?">
          {audiences.slice(0, 8).map((audience) => (
            <ChoiceButton
              key={audience.id}
              active={audienceSlug === audience.slug}
              onClick={() => setAudienceSlug(audience.slug)}
            >
              {audience.name}
            </ChoiceButton>
          ))}
        </QuizGroup>

        <QuizGroup title="Bạn có bao nhiêu thời gian?">
          <ChoiceButton active={timeMode === "short"} onClick={() => setTimeMode("short")}>
            Khoảng 10 phút để chọn nhanh
          </ChoiceButton>
          <ChoiceButton active={timeMode === "deep"} onClick={() => setTimeMode("deep")}>
            Muốn đọc sâu hơn
          </ChoiceButton>
        </QuizGroup>

        <QuizGroup title="Mục tiêu gần nhất">
          {goals.map((goal) => (
            <ChoiceButton
              key={goal.id}
              active={goalId === goal.id}
              onClick={() => setGoalId(goal.id)}
            >
              {goal.label}
            </ChoiceButton>
          ))}
        </QuizGroup>

        <button
          type="button"
          onClick={() => setHasResult(true)}
          className="mt-6 w-full rounded-3xl bg-stone-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-amber-900"
        >
          Xem gợi ý đọc hôm nay
        </button>
      </section>

      <section className="rounded-3xl border border-amber-100 bg-[#fffaf2] p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Kết quả gợi ý
        </p>
        {!hasResult ? (
          <div className="mt-5 rounded-2xl bg-white p-5 text-sm leading-7 text-stone-600">
            Sau khi chọn xong, bạn sẽ thấy một bài nên đọc trước, hai cuốn sách
            phù hợp và một cụm nỗi đau để đọc tiếp.
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="rounded-2xl bg-white p-5">
              <p className="text-sm font-semibold text-stone-950">Nên đọc trước</p>
              {result.article ? (
                <Link
                  href={`/bai-viet/${result.article.slug}`}
                  className="mt-3 block rounded-2xl border border-stone-200 bg-stone-50 p-4 hover:border-amber-200 hover:bg-amber-50"
                >
                  <span className="font-semibold text-stone-950">
                    {result.article.title}
                  </span>
                  <span className="mt-2 line-clamp-3 block text-sm leading-6 text-stone-600">
                    {result.article.excerpt}
                  </span>
                  <span className="mt-3 block text-xs text-stone-500">
                    {result.article.readingTime} phút đọc
                  </span>
                </Link>
              ) : (
                <p className="mt-3 text-sm text-stone-500">Chưa có bài phù hợp.</p>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5">
              <p className="text-sm font-semibold text-stone-950">Hai cuốn nên cân nhắc</p>
              <div className="mt-3 grid gap-3">
                {result.books.map((book) => (
                  <Link
                    key={book.id}
                    href={`/sach/${book.slug}`}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4 hover:border-amber-200 hover:bg-amber-50"
                  >
                    <span className="font-semibold text-stone-950">{book.title}</span>
                    <span className="mt-1 block text-xs text-amber-800">{book.author}</span>
                    <span className="mt-2 line-clamp-2 block text-sm leading-6 text-stone-600">
                      {book.description}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {selectedPain ? (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <p className="text-sm font-semibold text-stone-950">
                  Cụm nên đọc tiếp
                </p>
                <p className="mt-2 text-sm leading-6 text-stone-700">
                  Với trạng thái {selectedPain.name.toLowerCase()}
                  {selectedAudience ? ` của nhóm ${selectedAudience.name.toLowerCase()}` : ""},
                  bạn nên đọc theo cụm thay vì chọn sách đơn lẻ.
                </p>
                <Link
                  href={`/noi-dau/${selectedPain.slug}`}
                  className="mt-4 inline-flex rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900"
                >
                  Xem cụm {selectedPain.name}
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function QuizGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-stone-950">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-stone-950 text-white"
          : "border border-stone-200 bg-white text-stone-700 hover:border-amber-300 hover:text-amber-900"
      }`}
    >
      {children}
    </button>
  );
}

function scoreArticles({
  articles,
  painSlug,
  audienceSlug,
  timeMode,
  keywords,
}: {
  articles: QuizArticle[];
  painSlug: string;
  audienceSlug: string;
  timeMode: string;
  keywords: string[];
}) {
  return articles
    .map((article) => {
      const text = `${article.title} ${article.excerpt}`.toLocaleLowerCase("vi");
      const keywordScore = keywords.filter((keyword) =>
        text.includes(keyword.toLocaleLowerCase("vi")),
      ).length;

      return {
        ...article,
        score:
          (article.painPoints.some((item) => item.slug === painSlug) ? 5 : 0) +
          (article.audiences.some((item) => item.slug === audienceSlug) ? 3 : 0) +
          keywordScore +
          (timeMode === "short" && article.readingTime <= 10 ? 2 : 0),
      };
    })
    .sort((a, b) => b.score - a.score || a.readingTime - b.readingTime);
}

function scoreBooks({
  books,
  painSlug,
  audienceSlug,
  keywords,
}: {
  books: QuizBook[];
  painSlug: string;
  audienceSlug: string;
  keywords: string[];
}) {
  return books
    .map((book) => {
      const text = `${book.title} ${book.description} ${book.suitableFor.join(" ")} ${book.keyLessons.join(" ")}`.toLocaleLowerCase("vi");
      const keywordScore = keywords.filter((keyword) =>
        text.includes(keyword.toLocaleLowerCase("vi")),
      ).length;

      return {
        ...book,
        score:
          (book.painPoints.some((item) => item.slug === painSlug) ? 5 : 0) +
          (book.audiences.some((item) => item.slug === audienceSlug) ? 3 : 0) +
          keywordScore,
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "vi"));
}
