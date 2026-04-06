"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getUpdates } from "@/lib/api";
import { UPDATES_SYNCED_EVENT } from "@/lib/updates-sync-event";
import { UpdateCard } from "@/components/UpdateCard";
import { UpdateCardSkeleton } from "@/components/UpdateCardSkeleton";

const PAGE_SIZE = 20;
const REFRESH_MS = 60_000;
const HIGHLIGHT_MS = 10_000;
const SKELETON_COUNT = 5;

function errorMessage(err) {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data;
    if (d && typeof d === "object" && d.error != null) return String(d.error);
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}

export function UpdatesList({ conflict }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [error, setError] = useState(null);
  const [highlightIds, setHighlightIds] = useState(() => new Set());

  const applyHighlight = useCallback((ids) => {
    if (!ids.length) return;
    setHighlightIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
    window.setTimeout(() => {
      setHighlightIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, HIGHLIGHT_MS);
  }, []);

  const mergeRefreshPage = useCallback(
    (freshPayload) => {
      const incoming = freshPayload.data || [];
      setItems((prev) => {
        if (!prev.length) return incoming;

        const prevIds = new Set(prev.map((e) => String(e._id)));
        const added = incoming.filter((e) => !prevIds.has(String(e._id)));
        if (added.length) applyHighlight(added.map((e) => String(e._id)));

        const freshIds = new Set(incoming.map((e) => String(e._id)));
        const tail = prev.filter((e) => !freshIds.has(String(e._id)));
        return [...incoming, ...tail];
      });
      setTotalPages(freshPayload.pagination?.totalPages ?? 0);
    },
    [applyHighlight]
  );

  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setPage(1);
    setTotalPages(0);
    setError(null);
    setInitialLoading(true);
    setHighlightIds(new Set());

    (async () => {
      if (
        !process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL.trim() === ""
      ) {
        if (!cancelled) {
          setError(
            "Set NEXT_PUBLIC_API_BASE_URL in .env.local (see .env.example)."
          );
        }
        if (!cancelled) setInitialLoading(false);
        return;
      }

      try {
        const res = await getUpdates({
          conflict,
          page: 1,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        setItems(res.data || []);
        setTotalPages(res.pagination?.totalPages ?? 0);
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [conflict]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      if (
        !process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL.trim() === ""
      ) {
        return;
      }
      try {
        const res = await getUpdates({
          conflict,
          page: 1,
          limit: PAGE_SIZE,
        });
        mergeRefreshPage(res);
        setError(null);
      } catch (e) {
        setError(errorMessage(e));
      }
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [conflict, mergeRefreshPage]);

  useEffect(() => {
    async function onSync() {
      if (
        !process.env.NEXT_PUBLIC_API_BASE_URL ||
        process.env.NEXT_PUBLIC_API_BASE_URL.trim() === ""
      ) {
        return;
      }
      try {
        const res = await getUpdates({
          conflict,
          page: 1,
          limit: PAGE_SIZE,
        });
        mergeRefreshPage(res);
        setError(null);
      } catch (e) {
        setError(errorMessage(e));
      }
    }
    window.addEventListener(UPDATES_SYNCED_EVENT, onSync);
    return () => window.removeEventListener(UPDATES_SYNCED_EVENT, onSync);
  }, [conflict, mergeRefreshPage]);

  async function handleLoadMore() {
    if (page >= totalPages || loadMoreLoading) return;
    setLoadMoreLoading(true);
    try {
      const nextPage = page + 1;
      const res = await getUpdates({
        conflict,
        page: nextPage,
        limit: PAGE_SIZE,
      });
      setPage(nextPage);
      setItems((prev) => {
        const seen = new Set(prev.map((e) => String(e._id)));
        const extra = (res.data || []).filter((e) => !seen.has(String(e._id)));
        return [...prev, ...extra];
      });
      setTotalPages(res.pagination?.totalPages ?? 0);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadMoreLoading(false);
    }
  }

  function handleRetry() {
    setError(null);
    setInitialLoading(true);
    setItems([]);
    setPage(1);
    (async () => {
      try {
        const res = await getUpdates({
          conflict,
          page: 1,
          limit: PAGE_SIZE,
        });
        setItems(res.data || []);
        setTotalPages(res.pagination?.totalPages ?? 0);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setInitialLoading(false);
      }
    })();
  }

  const liveStrip = useMemo(
    () => (
      <div className="mb-4 flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-500">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/50" />
          <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span>Live updating</span>
      </div>
    ),
    []
  );

  if (initialLoading) {
    return (
      <div className="space-y-4">
        {liveStrip}
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <UpdateCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div
        className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-500/30 dark:bg-red-950/25 dark:text-red-200"
        role="alert"
      >
        <p>{error}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="mt-4 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {liveStrip}

      {error ? (
        <div
          className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/20 dark:text-amber-200/90"
          role="status"
        >
          Refresh issue: {error}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-100/50 px-4 py-8 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/30 dark:text-zinc-500">
          No headlines yet. Run a sync or check back shortly.
        </p>
      ) : (
        <ul className="space-y-4">
          {items.map((u) => (
            <li key={String(u._id)}>
              <UpdateCard
                title={u.title}
                summary={u.summary}
                description={u.description}
                source={u.source}
                url={u.url}
                conflict={u.conflict}
                publishedAt={u.publishedAt}
                isNew={highlightIds.has(String(u._id))}
              />
            </li>
          ))}
        </ul>
      )}

      {page < totalPages ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadMoreLoading}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-zinc-100 shadow-sm transition-colors hover:border-zinc-600 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {loadMoreLoading ? "Loading…" : "Load more"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
