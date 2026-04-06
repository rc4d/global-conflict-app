export function UpdateCardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex justify-between gap-3">
        <div className="h-5 w-20 rounded-md bg-zinc-800" />
        <div className="h-4 w-16 rounded bg-zinc-800" />
      </div>
      <div className="mt-4 h-5 w-4/5 max-w-md rounded bg-zinc-800" />
      <div className="mt-2 h-3 w-full rounded bg-zinc-800/80" />
      <div className="mt-2 h-3 w-5/6 rounded bg-zinc-800/80" />
      <div className="mt-4 flex gap-2 border-t border-zinc-800/90 pt-4">
        <div className="h-3 w-24 rounded bg-zinc-800" />
        <div className="h-3 w-20 rounded bg-zinc-800/70" />
      </div>
    </div>
  );
}
