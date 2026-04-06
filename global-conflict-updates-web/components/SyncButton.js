"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dispatchUpdatesSynced } from "@/lib/updates-sync-event";

function SyncIcon({ spinning }) {
  return (
    <svg
      className={`h-5 w-5 ${spinning ? "animate-spin" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

export function SyncButton() {
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState(null);
  const bannerTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const clearBannerSoon = useCallback((msg, isError) => {
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setBanner({ msg, isError });
    bannerTimerRef.current = window.setTimeout(
      () => {
        setBanner(null);
        bannerTimerRef.current = null;
      },
      isError ? 8000 : 5000,
    );
  }, []);

  async function runSync() {
    if (pending) return;
    setPending(true);
    setBanner(null);
    try {
      const res = await fetch("/api/updates/sync", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          typeof data.error === "string"
            ? data.error
            : `Sync failed (${res.status})`;
        clearBannerSoon(msg, true);
        return;
      }
      const extra =
        typeof data.newInserts === "number" ? ` · +${data.newInserts} new` : "";
      clearBannerSoon(`Sync complete${extra}`, false);
      dispatchUpdatesSynced();
    } catch (e) {
      clearBannerSoon(
        e instanceof Error ? e.message : "Sync request failed",
        true,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="relative flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={runSync}
        disabled={pending}
        title="Run news sync now"
        aria-label="Run news sync once"
        className="shrink-0 rounded-lg border border-zinc-300/90 bg-zinc-50/80 p-2 text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700/90 dark:bg-zinc-900/50 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-white"
      >
        <SyncIcon spinning={pending} />
      </button>
      {banner ? (
        <p
          role="status"
          className={`absolute right-0 top-full z-40 mt-1 max-w-[min(18rem,70vw)] rounded-md border px-2 py-1 text-[11px] font-medium shadow-md ${
            banner.isError
              ? "border-red-300/80 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/90 dark:text-red-200"
              : "border-zinc-200/90 bg-white text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          }`}
        >
          {banner.msg}
        </p>
      ) : null}
    </div>
  );
}
