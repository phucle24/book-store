"use client";

import { useMemo, useState, useTransition } from "react";
import { createArticleDraftFromAiAction } from "@/lib/ai-actions";

type Option = {
  id: string;
  name: string;
};

type BookOption = Option & {
  author: string;
};

type RecentGeneration = {
  id: string;
  type: string;
  model: string;
  createdAt: string;
  bookTitle?: string | null;
};

const endpointMap = {
  brief: "/api/admin/ai/generate-brief",
  outline: "/api/admin/ai/generate-outline",
  draft: "/api/admin/ai/generate-draft",
  improve: "/api/admin/ai/improve-draft",
  seo: "/api/admin/ai/seo-check",
};

export function AdminAiGenerator({
  books,
  painPoints,
  audiences,
  categories,
  recentGenerations,
}: {
  books: BookOption[];
  painPoints: Option[];
  audiences: Option[];
  categories: Option[];
  recentGenerations: RecentGeneration[];
}) {
  const [contentType, setContentType] = useState("Review sách");
  const [bookId, setBookId] = useState(books[0]?.id || "");
  const [painPointId, setPainPointId] = useState(painPoints[0]?.id || "");
  const [audienceId, setAudienceId] = useState(audiences[0]?.id || "");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [tone, setTone] = useState("ấm, từng trải, không quảng cáo");
  const [extraNotes, setExtraNotes] = useState("");
  const [verifiedRead, setVerifiedRead] = useState(false);
  const [outline, setOutline] = useState("");
  const [output, setOutput] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedBook = useMemo(
    () => books.find((book) => book.id === bookId),
    [bookId, books],
  );

  async function runGeneration(kind: keyof typeof endpointMap) {
    setError("");
    setStatus("Đang gọi DeepSeek...");

    const payload = {
      contentType,
      bookId,
      painPointId,
      audienceId,
      focusKeyword: focusKeyword || selectedBook?.name || "review sách",
      tone,
      extraNotes,
      verifiedRead,
      outline,
      draft: output,
    };

    startTransition(async () => {
      try {
        const response = await fetch(endpointMap[kind], {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await response.json()) as {
          id?: string;
          outputMarkdown?: string;
          error?: string;
        };

        if (!response.ok) {
          setError(data.error || "Không tạo được nội dung.");
          setStatus("");
          return;
        }

        const nextOutput = data.outputMarkdown || "";
        setOutput(nextOutput);
        setGenerationId(data.id || "");
        setStatus("Đã lưu kết quả vào AiGeneration.");

        if (kind === "outline") {
          setOutline(nextOutput);
        }
        if (kind === "draft" || kind === "improve") {
          if (!draftTitle) {
            const nextTitle = makeDraftTitle(focusKeyword, selectedBook?.name);
            setDraftTitle(nextTitle);
            setSeoTitle(nextTitle);
          }
          if (!excerpt) {
            const nextExcerpt = makeExcerpt(nextOutput);
            setExcerpt(nextExcerpt);
            setSeoDescription(nextExcerpt);
          }
        }
      } catch {
        setError("Không gọi được API AI. Kiểm tra kết nối hoặc đăng nhập admin.");
        setStatus("");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-950">Input</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <SelectField
            label="Loại bài"
            value={contentType}
            onChange={setContentType}
            options={[
              { id: "Review sách", name: "Review sách" },
              { id: "Top list", name: "Top list" },
              { id: "Story essay", name: "Story essay" },
              { id: "Comparison", name: "Comparison" },
            ]}
          />
          <SelectField
            label="Sách chính"
            value={bookId}
            onChange={setBookId}
            options={books.map((book) => ({
              id: book.id,
              name: `${book.name} - ${book.author}`,
            }))}
          />
          <SelectField
            label="Pain point"
            value={painPointId}
            onChange={setPainPointId}
            options={painPoints}
          />
          <SelectField
            label="Audience"
            value={audienceId}
            onChange={setAudienceId}
            options={audiences}
          />
          <TextField
            label="Focus keyword"
            value={focusKeyword}
            onChange={setFocusKeyword}
            placeholder="VD: sách cho người hay trì hoãn"
          />
          <TextField label="Tone" value={tone} onChange={setTone} />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={verifiedRead}
            onChange={(event) => setVerifiedRead(event.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-amber-800"
          />
          <span>Đã đọc / có ghi chú đọc thật</span>
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700">Extra notes</span>
          <textarea
            value={extraNotes}
            onChange={(event) => setExtraNotes(event.target.value)}
            rows={5}
            className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </label>
        <label className="mt-4 block">
          <span className="text-sm font-medium text-stone-700">Outline dùng cho draft</span>
          <textarea
            value={outline}
            onChange={(event) => setOutline(event.target.value)}
            rows={6}
            className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 font-mono text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-2">
          <ActionButton label="Generate Brief" disabled={isPending} onClick={() => runGeneration("brief")} />
          <ActionButton label="Generate Outline" disabled={isPending} onClick={() => runGeneration("outline")} />
          <ActionButton label="Generate Draft" disabled={isPending} onClick={() => runGeneration("draft")} />
          <ActionButton label="Improve Draft" disabled={isPending} onClick={() => runGeneration("improve")} />
          <ActionButton label="SEO Check" disabled={isPending} onClick={() => runGeneration("seo")} />
        </div>

        {error ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </div>
        ) : null}
        {status ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {status}
          </div>
        ) : null}
      </section>

      <section className="space-y-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Output</h2>
          <textarea
            value={output}
            onChange={(event) => setOutput(event.target.value)}
            rows={24}
            className="mt-4 w-full rounded-2xl border border-stone-300 px-4 py-3 font-mono text-sm leading-7 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
          />
        </div>

        <form action={createArticleDraftFromAiAction} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Copy sang article draft</h2>
          <input type="hidden" name="generationId" value={generationId} />
          <input type="hidden" name="content" value={output} />
          <input type="hidden" name="contentType" value={contentType} />
          <input type="hidden" name="bookId" value={bookId} />
          <input type="hidden" name="painPointId" value={painPointId} />
          <input type="hidden" name="audienceId" value={audienceId} />
          <input type="hidden" name="focusKeyword" value={focusKeyword} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <TextField label="Article title" value={draftTitle} onChange={setDraftTitle} name="title" />
            <TextField label="SEO title" value={seoTitle} onChange={setSeoTitle} name="seoTitle" />
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-stone-700">Excerpt</span>
            <textarea
              name="excerpt"
              value={excerpt}
              onChange={(event) => setExcerpt(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-stone-700">SEO description</span>
            <textarea
              name="seoDescription"
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
            />
          </label>
          <div className="mt-4 rounded-2xl border border-stone-200 p-4">
            <p className="text-sm font-semibold text-stone-950">Categories</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {categories.map((category) => (
                <label key={category.id} className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    name="categoryIds"
                    value={category.id}
                    className="h-4 w-4 rounded border-stone-300 text-amber-800"
                  />
                  <span>{category.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button
            disabled={!generationId || !output || !draftTitle || !excerpt}
            className="mt-5 rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900 disabled:cursor-not-allowed disabled:bg-stone-300"
          >
            Copy sang draft
          </button>
        </form>

        <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-950">Recent generations</h2>
          <div className="mt-3 divide-y divide-stone-100">
            {recentGenerations.map((generation) => (
              <div key={generation.id} className="py-3 text-sm">
                <p className="font-medium text-stone-950">
                  {generation.type} · {generation.model}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {generation.bookTitle || "Không gắn sách"} ·{" "}
                  {new Date(generation.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
            ))}
            {!recentGenerations.length ? (
              <p className="py-4 text-sm text-stone-500">Chưa có generation nào.</p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      >
        <option value="">Chưa chọn</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  name,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  name?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function ActionButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-800 hover:border-amber-400 hover:text-amber-900 disabled:cursor-wait disabled:opacity-60"
    >
      {label}
    </button>
  );
}

function makeDraftTitle(focusKeyword: string, bookTitle?: string) {
  if (focusKeyword.trim()) return focusKeyword.trim();
  if (bookTitle) return `Review ${bookTitle}`;
  return "AI article draft";
}

function makeExcerpt(markdown: string) {
  const plain = markdown
    .replace(/^#+\s+/gm, "")
    .replace(/[*_>`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 220);
}
