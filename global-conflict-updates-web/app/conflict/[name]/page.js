import { notFound } from "next/navigation";
import { conflictLabel, isConflictSlug } from "@/lib/conflicts";
import { UpdatesList } from "@/components/UpdatesList";

export async function generateMetadata({ params }) {
  const { name } = await params;
  if (!isConflictSlug(name)) {
    return { title: "Not found" };
  }
  return {
    title: `${conflictLabel(name)} · Headlines`,
  };
}

export default async function ConflictPage({ params }) {
  const { name } = await params;
  if (!isConflictSlug(name)) notFound();

  const label = conflictLabel(name);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200/90 bg-white/70 px-5 py-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50 dark:shadow-none">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
          Feed
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {label}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Newest headlines · refetches every minute
        </p>
      </div>
      <UpdatesList conflict={name} />
    </div>
  );
}
