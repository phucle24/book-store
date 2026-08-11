export default function Loading() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl animate-pulse">
        <div className="h-4 w-36 rounded-full bg-amber-100" />
        <div className="mt-6 h-12 w-4/5 rounded-2xl bg-stone-200" />
        <div className="mt-4 h-6 w-2/3 rounded-2xl bg-stone-100" />
        <div className="mt-8 rounded-[2rem] border border-stone-200 bg-white p-6">
          <div className="h-5 w-1/2 rounded-2xl bg-stone-100" />
          <div className="mt-5 space-y-3">
            <div className="h-4 rounded-full bg-stone-100" />
            <div className="h-4 rounded-full bg-stone-100" />
            <div className="h-4 w-3/4 rounded-full bg-stone-100" />
          </div>
        </div>
      </div>
    </main>
  );
}
