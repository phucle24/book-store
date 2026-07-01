import Link from "next/link";
import { ArticleType, KeywordIdeaStatus } from "@prisma/client";
import { AdminNotice } from "@/components/AdminNotice";
import { AdminShell } from "@/components/AdminShell";
import { StatusBadge } from "@/components/StatusBadge";
import {
  createContentClusterAction,
  createDraftFromKeywordIdeaAction,
  createKeywordIdeaAction,
  deleteContentClusterAction,
  deleteKeywordIdeaAction,
  generateKeywordIdeaBriefAction,
  generateKeywordIdeaOutlineAction,
  updateContentClusterAction,
  updateKeywordIdeaAction,
} from "@/lib/content-planner-actions";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContentPlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = ideaStatus(params.status);
  const [clusters, ideas, painPoints, audiences, categories, articles] = await Promise.all([
    prisma.contentCluster.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        category: true,
        painPoint: true,
        audience: true,
        pillarArticle: { select: { title: true, slug: true } },
        _count: { select: { articles: true, keywordIdeas: true } },
      },
    }),
    prisma.keywordIdea.findMany({
      where: status ? { status } : undefined,
      orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
      include: {
        cluster: true,
        article: { select: { id: true, title: true, slug: true, status: true } },
        painPoint: true,
        audience: true,
      },
    }),
    prisma.painPoint.findMany({ orderBy: { name: "asc" } }),
    prisma.audience.findMany({ orderBy: { name: "asc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.article.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, status: true },
      take: 60,
    }),
  ]);

  return (
    <AdminShell
      title="Content Planner"
      description="Quản lý content cluster, keyword idea và biến idea thành article draft."
    >
      <AdminNotice error={params.error} success={params.success} />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="space-y-6">
          <CreateClusterForm
            categories={categories}
            painPoints={painPoints}
            audiences={audiences}
            articles={articles}
          />
          <CreateIdeaForm clusters={clusters} painPoints={painPoints} audiences={audiences} />
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-stone-950">Keyword ideas</h2>
              <div className="flex flex-wrap gap-2">
                <Filter href="/admin/content-planner" label="Tất cả" active={!status} />
                {Object.values(KeywordIdeaStatus).map((item) => (
                  <Filter
                    key={item}
                    href={`/admin/content-planner?status=${item}`}
                    label={item}
                    active={status === item}
                  />
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  clusters={clusters}
                  painPoints={painPoints}
                  audiences={audiences}
                  articles={articles}
                />
              ))}
              {!ideas.length ? (
                <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                  Chưa có keyword idea trong filter này.
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-stone-950">Content clusters</h2>
            <div className="mt-5 space-y-4">
              {clusters.map((cluster) => (
                <ClusterCard
                  key={cluster.id}
                  cluster={cluster}
                  categories={categories}
                  painPoints={painPoints}
                  audiences={audiences}
                  articles={articles}
                />
              ))}
              {!clusters.length ? (
                <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500">
                  Chưa có content cluster.
                </p>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </AdminShell>
  );
}

type Option = { id: string; name: string };
type ArticleOption = { id: string; title: string; status: string };

function CreateClusterForm({
  categories,
  painPoints,
  audiences,
  articles,
}: {
  categories: Option[];
  painPoints: Option[];
  audiences: Option[];
  articles: ArticleOption[];
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-950">Tạo content cluster</h2>
      <form action={createContentClusterAction} className="mt-5 grid gap-4 md:grid-cols-2">
        <TextInput name="name" label="Tên cluster" required />
        <TextInput name="slug" label="Slug" />
        <SelectInput name="categoryId" label="Category" options={categories} />
        <SelectInput name="painPointId" label="Pain point" options={painPoints} />
        <SelectInput name="audienceId" label="Audience" options={audiences} />
        <SelectInput
          name="pillarArticleId"
          label="Pillar article"
          options={articles.map((article) => ({
            id: article.id,
            name: `${article.title} (${article.status})`,
          }))}
        />
        <Textarea name="description" label="Mô tả" />
        <div className="md:col-span-2">
          <button className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900">
            Tạo cluster
          </button>
        </div>
      </form>
    </section>
  );
}

function CreateIdeaForm({
  clusters,
  painPoints,
  audiences,
}: {
  clusters: Option[];
  painPoints: Option[];
  audiences: Option[];
}) {
  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-stone-950">Tạo keyword idea</h2>
      <form action={createKeywordIdeaAction} className="mt-5 grid gap-4 md:grid-cols-2">
        <TextInput name="keyword" label="Keyword" required />
        <TextInput name="intent" label="Search intent" defaultValue="informational" required />
        <SelectInput name="articleType" label="Article type" options={articleTypeOptions()} />
        <SelectInput name="status" label="Status" options={statusOptions()} defaultValue="IDEA" />
        <TextInput name="priority" label="Priority 1-5" defaultValue="2" />
        <SelectInput name="clusterId" label="Cluster" options={clusters} />
        <SelectInput name="painPointId" label="Pain point" options={painPoints} />
        <SelectInput name="audienceId" label="Audience" options={audiences} />
        <Textarea name="notes" label="Notes" />
        <div className="md:col-span-2">
          <button className="rounded-full bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-900">
            Tạo idea
          </button>
        </div>
      </form>
    </section>
  );
}

function IdeaCard({
  idea,
  clusters,
  painPoints,
  audiences,
  articles,
}: {
  idea: {
    id: string;
    keyword: string;
    intent: string;
    priority: number;
    status: KeywordIdeaStatus;
    articleType: ArticleType;
    notes: string | null;
    briefMarkdown: string | null;
    outlineMarkdown: string | null;
    clusterId: string | null;
    painPointId: string | null;
    audienceId: string | null;
    articleId: string | null;
    cluster: { name: string } | null;
    article: { id: string; title: string; slug: string; status: string } | null;
  };
  clusters: Option[];
  painPoints: Option[];
  audiences: Option[];
  articles: ArticleOption[];
}) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-950">{idea.keyword}</h3>
          <p className="mt-1 text-xs text-stone-500">
            {idea.intent} · priority {idea.priority} · {idea.cluster?.name || "Chưa gắn cluster"}
          </p>
        </div>
        <StatusBadge status={idea.status} />
      </div>
      <form action={updateKeywordIdeaAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={idea.id} />
        <TextInput name="keyword" label="Keyword" defaultValue={idea.keyword} required />
        <TextInput name="intent" label="Intent" defaultValue={idea.intent} required />
        <SelectInput name="articleType" label="Type" options={articleTypeOptions()} defaultValue={idea.articleType} />
        <SelectInput name="status" label="Status" options={statusOptions()} defaultValue={idea.status} />
        <TextInput name="priority" label="Priority" defaultValue={String(idea.priority)} />
        <SelectInput name="clusterId" label="Cluster" options={clusters} defaultValue={idea.clusterId} />
        <SelectInput name="painPointId" label="Pain point" options={painPoints} defaultValue={idea.painPointId} />
        <SelectInput name="audienceId" label="Audience" options={audiences} defaultValue={idea.audienceId} />
        <SelectInput
          name="articleId"
          label="Target article"
          options={articles.map((article) => ({ id: article.id, name: article.title }))}
          defaultValue={idea.articleId}
        />
        <Textarea name="notes" label="Notes" defaultValue={idea.notes} />
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900">
            Lưu idea
          </button>
        </div>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionForm action={generateKeywordIdeaBriefAction} id={idea.id} label="Generate brief" />
        <ActionForm action={generateKeywordIdeaOutlineAction} id={idea.id} label="Generate outline" />
        <ActionForm action={createDraftFromKeywordIdeaAction} id={idea.id} label="Tạo draft" />
        {idea.article ? (
          <Link
            href={`/admin/articles/${idea.article.id}/edit`}
            className="rounded-full border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
          >
            Mở article
          </Link>
        ) : null}
        <form action={deleteKeywordIdeaAction}>
          <input type="hidden" name="id" value={idea.id} />
          <button className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
            Xóa
          </button>
        </form>
      </div>
      {(idea.briefMarkdown || idea.outlineMarkdown) ? (
        <details className="mt-3 rounded-2xl bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-stone-950">
            Brief / outline đã generate
          </summary>
          <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-stone-700">
            {[idea.briefMarkdown, idea.outlineMarkdown].filter(Boolean).join("\n\n---\n\n")}
          </pre>
        </details>
      ) : null}
    </article>
  );
}

function ClusterCard({
  cluster,
  categories,
  painPoints,
  audiences,
  articles,
}: {
  cluster: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    categoryId: string | null;
    painPointId: string | null;
    audienceId: string | null;
    pillarArticleId: string | null;
    _count: { articles: number; keywordIdeas: number };
  };
  categories: Option[];
  painPoints: Option[];
  audiences: Option[];
  articles: ArticleOption[];
}) {
  return (
    <article className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-stone-950">{cluster.name}</h3>
          <p className="mt-1 text-xs text-stone-500">
            {cluster._count.articles} bài · {cluster._count.keywordIdeas} ideas
          </p>
        </div>
        <Link
          href={`/cum-noi-dung/${cluster.slug}`}
          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium hover:bg-white"
        >
          Xem public
        </Link>
      </div>
      <form action={updateContentClusterAction} className="mt-4 grid gap-3 md:grid-cols-2">
        <input type="hidden" name="id" value={cluster.id} />
        <TextInput name="name" label="Tên" defaultValue={cluster.name} required />
        <TextInput name="slug" label="Slug" defaultValue={cluster.slug} />
        <SelectInput name="categoryId" label="Category" options={categories} defaultValue={cluster.categoryId} />
        <SelectInput name="painPointId" label="Pain point" options={painPoints} defaultValue={cluster.painPointId} />
        <SelectInput name="audienceId" label="Audience" options={audiences} defaultValue={cluster.audienceId} />
        <SelectInput
          name="pillarArticleId"
          label="Pillar article"
          options={articles.map((article) => ({ id: article.id, name: article.title }))}
          defaultValue={cluster.pillarArticleId}
        />
        <Textarea name="description" label="Mô tả" defaultValue={cluster.description} />
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <button className="rounded-full bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-900">
            Lưu cluster
          </button>
        </div>
      </form>
      <form action={deleteContentClusterAction} className="mt-3 flex justify-end">
        <input type="hidden" name="id" value={cluster.id} />
        <button className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50">
          Xóa cluster
        </button>
      </form>
    </article>
  );
}

function ActionForm({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  label: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button className="rounded-full border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">
        {label}
      </button>
    </form>
  );
}

function TextInput({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue || ""}
        className="mt-1 w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function Textarea({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="block md:col-span-2">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue || ""}
        className="mt-1 w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
      />
    </label>
  );
}

function SelectInput({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Option[];
  defaultValue?: string | null;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-stone-600">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue || ""}
        className="mt-1 w-full rounded-2xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-700 focus:ring-4 focus:ring-amber-100"
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

function Filter({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        active
          ? "bg-stone-950 text-white"
          : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
      }`}
    >
      {label}
    </Link>
  );
}

function statusOptions() {
  return Object.values(KeywordIdeaStatus).map((status) => ({ id: status, name: status }));
}

function articleTypeOptions() {
  return Object.values(ArticleType).map((type) => ({ id: type, name: type }));
}

function ideaStatus(value?: string) {
  return Object.values(KeywordIdeaStatus).includes(value as KeywordIdeaStatus)
    ? (value as KeywordIdeaStatus)
    : null;
}
