"use client";

import { usePathname, useRouter } from "next/navigation";
import { NAV_LINKS, currentRegionHref } from "@/lib/conflicts";

/**
 * Styled region switcher (replaces sidebar links).
 */
export function RegionSelect({ className = "" }) {
  const pathname = usePathname();
  const router = useRouter();
  const value = currentRegionHref(pathname);

  return (
    <div className={`relative inline-block min-w-[12.5rem] ${className}`}>
      <label
        htmlFor="region-filter"
        className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-500"
      >
        Region
      </label>
      <div className="relative">
        <select
          id="region-filter"
          value={value}
          onChange={(e) => router.push(e.target.value)}
          className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-zinc-200/95 bg-white pl-3.5 pr-10 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:border-zinc-300 focus:border-amber-500/70 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:border-zinc-600 dark:focus:border-amber-500/50 dark:focus:ring-amber-500/15"
        >
          {NAV_LINKS.map((item) => (
            <option key={item.href} value={item.href}>
              {item.label}
            </option>
          ))}
        </select>
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
          aria-hidden
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m19 9-7 7-7-7"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}
