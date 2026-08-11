type ScoreBreakdown = Record<string, number> | null | undefined;

type VerdictCardProps = {
  score?: number | null;
  summary?: string | null;
  scoreBreakdown?: ScoreBreakdown;
  label?: string;
};

const DEFAULT_BREAKDOWN_LABELS: Record<string, string> = {
  practical: "Dễ thực hành",
  depth: "Độ sâu",
  readability: "Dễ đọc",
  value: "Giá trị so với giá",
};

export function VerdictCard({
  score,
  summary,
  scoreBreakdown,
  label = "Điểm biên tập",
}: VerdictCardProps) {
  const normalizedScore = normalizeScore(score);
  const rows = Object.entries(scoreBreakdown || {}).filter(([, value]) => normalizeScore(value));

  if (!normalizedScore && !summary && !rows.length) return null;

  return (
    <section className="mx-auto mt-8 max-w-3xl rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
            {label}
          </p>
          {summary ? (
            <p className="mt-2 text-lg font-semibold leading-7 text-stone-950">
              {summary}
            </p>
          ) : null}
        </div>
        {normalizedScore ? (
          <div className="shrink-0 rounded-3xl border border-amber-200 bg-white px-4 py-3 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-900">
              {formatScore(normalizedScore)}
              <span className="text-sm font-semibold text-stone-500">/5</span>
            </div>
            <div className="mt-1 text-xs tracking-wide text-amber-700" aria-label={`${normalizedScore} trên 5 sao`}>
              {starLine(normalizedScore)}
            </div>
          </div>
        ) : null}
      </div>

      {rows.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {rows.map(([key, value]) => {
            const itemScore = normalizeScore(value) || 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-stone-700">
                    {DEFAULT_BREAKDOWN_LABELS[key] || key}
                  </span>
                  <span className="text-xs font-semibold text-stone-500">
                    {formatScore(itemScore)}/5
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-amber-700"
                    style={{ width: `${Math.min(Math.max(itemScore / 5, 0), 1) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function normalizeScore(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.min(Math.max(value, 0), 5);
}

function formatScore(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function starLine(score: number) {
  const rounded = Math.round(score);
  return "★★★★★"
    .split("")
    .map((star, index) => (index < rounded ? star : "☆"))
    .join("");
}
