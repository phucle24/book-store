import { ArticleCard } from "@/components/ArticleCard";
import type { Article, Category, PainPoint } from "@prisma/client";

export function RelatedArticles({
  articles,
}: {
  articles: (Article & { categories: Category[]; painPoints: PainPoint[] })[];
}) {
  if (!articles.length) return null;

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-semibold text-stone-950">Bài viết liên quan</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
