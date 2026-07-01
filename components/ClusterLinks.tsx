import Link from "next/link";

type ClusterLinkItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export function ClusterLinks({ clusters }: { clusters: ClusterLinkItem[] }) {
  if (!clusters.length) return null;

  return (
    <section className="mt-10 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
        Cụm SEO
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-950">
        Cụm nội dung liên quan
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {clusters.map((cluster) => (
          <Link
            key={cluster.id}
            href={`/cum-noi-dung/${cluster.slug}`}
            className="rounded-2xl border border-stone-200 bg-stone-50 p-4 hover:border-amber-200 hover:bg-amber-50"
          >
            <span className="font-semibold text-stone-950">{cluster.name}</span>
            {cluster.description ? (
              <span className="mt-2 line-clamp-2 block text-sm leading-6 text-stone-600">
                {cluster.description}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
