"use client";

import { SyncButton } from "@/components/SyncButton";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { RegionSelect } from "@/components/RegionSelect";

function LiveIndicator() {
  return (
    <div
      className="flex items-center gap-2 rounded-full border border-zinc-200/90 bg-white/90 px-3 py-1.5 text-xs text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400"
      title="Background news sync interval"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-40 dark:bg-emerald-400" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-500" />
      </span>
      <span className="hidden sm:inline">Updating every 15 min</span>
      <span className="sm:hidden">Live</span>
    </div>
  );
}

export function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-zinc-100/80 dark:bg-zinc-950">
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/85 backdrop-blur-xl dark:border-zinc-800/80 dark:bg-zinc-950/85">
        <div className="mx-auto max-w-4xl px-4 py-5 sm:py-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-700/90 dark:text-amber-500/80">
                Global brief
              </p>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
                Global Conflict Updates
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Headlines from tracked conflict zones, refreshed on a schedule and when you sync.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5 lg:shrink-0">
              <RegionSelect className="sm:min-w-52" />
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <SyncButton />
                <ThemeSwitcher />
                <LiveIndicator />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:py-10">{children}</main>
    </div>
  );
}
