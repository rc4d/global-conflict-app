import { UpdatesList } from "@/components/UpdatesList";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200/90 bg-white/70 px-5 py-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:shadow-none">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
          Feed
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          All updates
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Newest first · refetches every minute
        </p>
      </div>
      <UpdatesList />
    </div>
  );
}
