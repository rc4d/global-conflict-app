"use client";

import { useEffect, useReducer } from "react";
import {
  conflictBadgeClasses,
  conflictLabel,
} from "@/lib/conflicts";
import { formatRelativeTime } from "@/utils/time";

export function UpdateCard({
  title,
  summary,
  description,
  source,
  url,
  conflict,
  publishedAt,
  isNew,
}) {
  const [, bump] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    const t = window.setInterval(() => bump(), 30_000);
    return () => clearInterval(t);
  }, []);

  const relative = formatRelativeTime(publishedAt);
  const label = conflict ? conflictLabel(conflict) : "—";
  const body = (summary && summary.trim()) || description || "";

  return (
    <article
      className={`rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-sm transition-all duration-200 ease-out hover:border-zinc-600 hover:shadow-lg hover:shadow-black/20 ${
        isNew ? "ring-1 ring-amber-500/40" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${conflictBadgeClasses(conflict)}`}
        >
          {label}
        </span>
        <time
          dateTime={publishedAt}
          className="shrink-0 text-xs tabular-nums text-zinc-500"
        >
          {relative}
        </time>
      </div>

      <h2 className="mt-3 text-lg font-semibold leading-snug text-white">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500/50"
        >
          {title}
        </a>
      </h2>

      {body ? (
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-zinc-400">
          {body}
        </p>
      ) : null}

      <p className="mt-4 border-t border-zinc-800/90 pt-4 text-xs text-zinc-500">
        <span className="font-medium text-zinc-400">{source}</span>
        <span className="mx-2 text-zinc-600">·</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-amber-500/90 underline-offset-2 hover:text-amber-400 hover:underline"
        >
          Open article
        </a>
      </p>
    </article>
  );
}
