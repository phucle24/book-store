import Link from "next/link";
import {
  improveAutopilotArticleAction,
  runAiAutopilotAction,
} from "@/lib/ai-autopilot-actions";
import { VOICE_TONE_AUTO, voiceToneProfiles } from "@/lib/voice-tones";

type Option = {
  id: string;
  name: string;
};

type ResearchSourceView = {
  id: string;
  url?: string | null;
  domain?: string | null;
  title?: string | null;
  sourceType: string;
  status: string;
  summary?: string | null;
  confidence?: number | null;
  skipReason?: string | null;
};

type ResearchRunView = {
  id: string;
  bookTitle: string;
  author?: string | null;
  affiliateUrl?: string | null;
  productUrl?: string | null;
  manualBookData?: string | null;
  sourceNotes?: string | null;
  rawReviews?: string | null;
  status: string;
  warnings: string[];
  sourceSummary?: unknown;
  confidence?: number | null;
  createdAt: string;
  createdBook?: { title: string; slug: string } | null;
  createdArticle?: { id: string; title: string; slug: string; status: string } | null;
  sources: ResearchSourceView[];
};

export function AdminAiAutopilot({
  categories,
  painPoints,
  audiences,
  selectedRun,
  recentRuns,
}: {
  categories: Option[];
  painPoints: Option[];
  audiences: Option[];
  selectedRun?: ResearchRunView | null;
  recentRuns: ResearchRunView[];
}) {
  const run = selectedRun || null;

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
            AI Autopilot
          </p>
          <h2 className="mt-2 text-xl font-semibold text-stone-950">
            Tạo bài tự động từ tên sách và nguồn admin cung cấp
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
            Autopilot dùng Tavily để research nguồn public, kết hợp dữ liệu bạn paste thủ
            công, sau đó tạo Book, Article, FAQ và CTA affiliate. Hệ thống không tự scrape
            review Shopee và sẽ ép bài về REVIEW nếu nguồn còn yếu.
          </p>
        </div>
        {run ? (
          <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900">
            Run: {run.status}
          </span>
        ) : null}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <form action={runAiAutopilotAction} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <input type="hidden" name="researchRunId" value={run?.id || ""} />
          <h3 className="text-base font-semibold text-stone-950">Input sách và nguồn</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextField
              label="Tên sách *"
              name="bookTitle"
              defaultValue={run?.bookTitle || ""}
              placeholder="VD: Atomic Habits"
            />
            <TextField
              label="Tác giả"
              name="author"
              defaultValue={run?.author || ""}
              placeholder="VD: James Clear"
            />
            <TextField label="Nhà xuất bản" name="publisher" />
            <TextField
              label="Focus keyword"
              name="focusKeyword"
              placeholder="VD: review Atomic Habits cho người hay trì hoãn"
            />
            <TextField
              label="Affiliate URL"
              name="affiliateUrl"
              type="url"
              defaultValue={run?.affiliateUrl || ""}
              placeholder="https://..."
            />
            <TextField
              label="Product URL"
              name="productUrl"
              type="url"
              defaultValue={run?.productUrl || ""}
              placeholder="Link Shopee/Fahasa/Tiki nếu có"
            />
            <SelectField label="Category" name="categoryId" options={categories} />
            <SelectField label="Pain point" name="painPointId" options={painPoints} />
            <SelectField label="Audience" name="audienceId" options={audiences} />
            <ToneSelect />
          </div>

          <TextareaField
            label="Dữ liệu sách bạn có"
            name="manualBookData"
            rows={5}
            defaultValue={run?.manualBookData || ""}
            placeholder="Paste mô tả tự viết, ghi chú đọc, mục lục, thông tin tác giả, điểm chính..."
          />
          <TextareaField
            label="Review paste thủ công"
            name="rawReviews"
            rows={6}
            defaultValue={run?.rawReviews || ""}
            placeholder="Paste review công khai bạn tự collect. AI chỉ rút insight, không quote."
          />
          <TextareaField
            label="Ghi chú nguồn / angle"
            name="sourceNotes"
            rows={4}
            defaultValue={run?.sourceNotes || ""}
            placeholder="Nguồn đáng tin, angle muốn viết, điều cần tránh..."
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <TextField label="Lên lịch lúc" name="scheduledAt" type="datetime-local" />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <WorkflowButton intent="research" label="Research sources" variant="secondary" />
            <WorkflowButton intent="book" label="Generate book data" variant="secondary" />
            <WorkflowButton intent="draft" label="Generate article draft" />
            <WorkflowButton intent="schedule" label="Generate + Schedule" />
            <WorkflowButton intent="publish" label="Publish now" variant="danger" />
          </div>
          <p className="mt-3 text-xs leading-5 text-stone-500">
            Publish now chỉ publish khi checklist đủ: nguồn đủ mạnh, content đủ dài, có SEO,
            FAQ và affiliate URL. Nếu chưa đủ, bài sẽ được đưa vào REVIEW.
          </p>
        </form>

        <div className="space-y-5">
          <ResearchRunPanel run={run} />
          <RecentRuns runs={recentRuns} selectedRunId={run?.id} />
        </div>
      </div>
    </section>
  );
}

function ResearchRunPanel({ run }: { run: ResearchRunView | null }) {
  if (!run) {
    return (
      <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-stone-950">Source provenance</h3>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          Chưa có research run. Nhập tên sách rồi bấm Research sources để xem nguồn nào được
          dùng, nguồn nào bị bỏ qua và cảnh báo chất lượng.
        </p>
      </div>
    );
  }

  const used = run.sources.filter((source) => source.status === "USED");
  const skipped = run.sources.filter((source) => source.status !== "USED");
  const painBrief = readPainBrief(run.sourceSummary);

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-stone-950">Source provenance</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Metric label="Nguồn dùng" value={String(used.length)} />
        <Metric label="Bị skip" value={String(skipped.length)} />
        <Metric label="Confidence" value={run.confidence ? run.confidence.toFixed(2) : "-"} />
      </div>

      {run.warnings.length ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-950">Cảnh báo</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {run.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {painBrief ? (
        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-950">Pain Brief</p>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            <span className="font-semibold">Inner voice: </span>
            {painBrief.readerInnerVoice}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <BriefList title="Symptoms" items={painBrief.symptoms} />
            <BriefList title="Objections" items={painBrief.purchaseObjections} />
            <BriefList title="Why fits" items={painBrief.whyThisBookFits} />
            <BriefList title="May not fit" items={painBrief.whyThisBookMayNotFit} />
          </div>
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {run.sources.slice(0, 12).map((source) => (
          <div key={source.id} className="rounded-2xl border border-stone-200 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                  source.status === "USED"
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-stone-100 text-stone-600"
                }`}
              >
                {source.status}
              </span>
              <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800">
                {source.sourceType}
              </span>
              {source.domain ? (
                <span className="text-xs text-stone-500">{source.domain}</span>
              ) : null}
            </div>
            <p className="mt-2 text-sm font-semibold text-stone-950">
              {source.title || source.url || "Nguồn không có tiêu đề"}
            </p>
            {source.summary ? (
              <p className="mt-2 text-sm leading-6 text-stone-600">{source.summary}</p>
            ) : null}
            {source.skipReason ? (
              <p className="mt-2 text-xs text-rose-700">Skip: {source.skipReason}</p>
            ) : null}
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-xs font-semibold text-amber-800 hover:text-amber-950"
              >
                Mở nguồn
              </a>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        {run.createdBook ? (
          <Link
            href={`/admin/books?search=${encodeURIComponent(run.createdBook.title)}`}
            className="rounded-full border border-stone-300 px-3 py-2 font-semibold text-stone-800 hover:border-amber-500"
          >
            Xem book data
          </Link>
        ) : null}
        {run.createdArticle ? (
          <>
            <Link
              href={`/admin/articles/${run.createdArticle.id}/edit`}
              className="rounded-full bg-stone-950 px-3 py-2 font-semibold text-white hover:bg-amber-900"
            >
              Review bài
            </Link>
            <form action={improveAutopilotArticleAction}>
              <input type="hidden" name="researchRunId" value={run.id} />
              <button className="rounded-full border border-amber-400 bg-amber-50 px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100">
                AI tự chỉnh sửa bài
              </button>
            </form>
            {run.createdArticle.status === "PUBLISHED" ? (
              <Link
                href={`/bai-viet/${run.createdArticle.slug}`}
                target="_blank"
                className="rounded-full border border-stone-300 px-3 py-2 font-semibold text-stone-800 hover:border-amber-500"
              >
                Xem public
              </Link>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function BriefList({ title, items }: { title: string; items?: string[] }) {
  const visibleItems = items?.filter(Boolean).slice(0, 4) || [];
  if (!visibleItems.length) return null;

  return (
    <div className="rounded-2xl bg-white/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-800">
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-xs leading-5 text-stone-700">
        {visibleItems.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function readPainBrief(sourceSummary: unknown) {
  if (!sourceSummary || typeof sourceSummary !== "object") return null;
  const painBrief = (sourceSummary as { painBrief?: unknown }).painBrief;
  if (!painBrief || typeof painBrief !== "object") return null;
  const value = painBrief as {
    readerInnerVoice?: unknown;
    symptoms?: unknown;
    purchaseObjections?: unknown;
    whyThisBookFits?: unknown;
    whyThisBookMayNotFit?: unknown;
  };

  return {
    readerInnerVoice:
      typeof value.readerInnerVoice === "string" ? value.readerInnerVoice : "",
    symptoms: stringArray(value.symptoms),
    purchaseObjections: stringArray(value.purchaseObjections),
    whyThisBookFits: stringArray(value.whyThisBookFits),
    whyThisBookMayNotFit: stringArray(value.whyThisBookMayNotFit),
  };
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => (typeof item === "string" ? item : "")).filter(Boolean)
    : [];
}

function RecentRuns({
  runs,
  selectedRunId,
}: {
  runs: ResearchRunView[];
  selectedRunId?: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-stone-950">Research runs gần đây</h3>
      <div className="mt-3 divide-y divide-stone-100">
        {runs.map((run) => (
          <Link
            key={run.id}
            href={`/admin/ai?researchRunId=${run.id}`}
            className={`block py-3 text-sm ${
              run.id === selectedRunId ? "text-amber-900" : "text-stone-700"
            }`}
          >
            <span className="font-semibold">{run.bookTitle}</span>
            <span className="mt-1 block text-xs text-stone-500">
              {run.status} · {new Date(run.createdAt).toLocaleString("vi-VN")}
            </span>
          </Link>
        ))}
        {!runs.length ? (
          <p className="py-4 text-sm text-stone-500">Chưa có research run nào.</p>
        ) : null}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function TextField({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Option[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <select
        name={name}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      >
        <option value="">Để AI gợi ý / chưa chọn</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToneSelect() {
  return (
    <label className="block md:col-span-2">
      <span className="text-sm font-medium text-stone-700">Tone giọng</span>
      <select
        name="tone"
        defaultValue={VOICE_TONE_AUTO}
        className="mt-2 w-full rounded-2xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      >
        {voiceToneProfiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.name} - {profile.shortDescription}
          </option>
        ))}
      </select>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {voiceToneProfiles
          .filter((profile) => profile.id !== VOICE_TONE_AUTO)
          .map((profile) => (
            <p
              key={profile.id}
              className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs leading-5 text-stone-600"
            >
              <span className="font-semibold text-stone-800">{profile.name}:</span>{" "}
              {profile.shortDescription}
            </p>
          ))}
      </div>
    </label>
  );
}

function TextareaField({
  label,
  name,
  rows,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <label className="mt-4 block">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-stone-300 px-4 py-3 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function WorkflowButton({
  intent,
  label,
  variant = "primary",
}: {
  intent: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const className =
    variant === "danger"
      ? "bg-stone-950 text-white hover:bg-amber-900"
      : variant === "secondary"
        ? "border border-stone-300 bg-white text-stone-800 hover:border-amber-500 hover:text-amber-900"
        : "bg-amber-800 text-white hover:bg-amber-900";

  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      className={`rounded-full px-4 py-2 text-sm font-semibold shadow-sm ${className}`}
    >
      {label}
    </button>
  );
}
