import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleStatus } from "@prisma/client";
import { ArticleCard } from "@/components/ArticleCard";
import { getEditorialPersonaBySlug } from "@/lib/editorial-personas";
import { prisma } from "@/lib/prisma";
import { pageMetadata, siteUrl } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const persona = getEditorialPersonaBySlug(slug);

  if (!persona) {
    return pageMetadata({
      title: "Không tìm thấy tác giả",
      description: "Bút danh biên tập không tồn tại.",
      path: `/tac-gia/${slug}`,
    });
  }

  return pageMetadata({
    title: `${persona.name} - Bút danh biên tập`,
    description: persona.bio,
    path: `/tac-gia/${persona.slug}`,
  });
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const persona = getEditorialPersonaBySlug(slug);
  if (!persona) notFound();

  const articles = await prisma.article.findMany({
    where: {
      status: ArticleStatus.PUBLISHED,
      authorSlug: persona.slug,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { categories: true, painPoints: true },
  });

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: persona.name,
    description: persona.bio,
    url: siteUrl(`/tac-gia/${persona.slug}`),
    worksFor: {
      "@type": "Organization",
      name: "Trạm Đọc Một Chút",
    },
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <section className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-800">
          Bút danh biên tập
        </p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
          {persona.name}
        </h1>
        <p className="mt-3 text-lg font-medium text-stone-700">{persona.label}</p>
        <p className="mt-5 text-lg leading-8 text-stone-700">{persona.bio}</p>
        <div className="mt-5 rounded-3xl border border-stone-200 bg-white p-4 text-sm leading-6 text-stone-600 shadow-sm">
          Đây là bút danh biên tập của Trạm Đọc Một Chút, dùng để giữ phong cách
          bài viết nhất quán theo từng nhóm nội dung. Chúng tôi không trình bày
          đây như một hồ sơ cá nhân ngoài đời.
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold text-stone-950">
          Bài viết của {persona.name}
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>
    </main>
  );
}
