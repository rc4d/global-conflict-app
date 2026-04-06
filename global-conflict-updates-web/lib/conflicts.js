export const CONFLICTS = [
  { slug: "ukraine", label: "Ukraine" },
  { slug: "middle-east", label: "Middle East" },
];

export const ALLOWED_SLUGS = new Set(CONFLICTS.map((c) => c.slug));

/** Sidebar / routing */
export const NAV_LINKS = [
  { href: "/", label: "All updates" },
  ...CONFLICTS.map((c) => ({
    href: `/conflict/${c.slug}`,
    label: c.label,
  })),
];

export function isConflictSlug(value) {
  return ALLOWED_SLUGS.has(value);
}

/** Active feed route for `<select value>` — home or `/conflict/[slug]`. */
export function currentRegionHref(pathname) {
  if (pathname === "/") return "/";
  const m = pathname.match(/^\/conflict\/([^/]+)/);
  if (m && ALLOWED_SLUGS.has(m[1])) return `/conflict/${m[1]}`;
  return "/";
}

export function conflictLabel(slug) {
  return CONFLICTS.find((c) => c.slug === slug)?.label ?? slug;
}

/** Tailwind classes for badge pill (light + dark) */
export function conflictBadgeClasses(slug) {
  if (slug === "ukraine") {
    return "border-amber-600/35 bg-amber-100 text-amber-950 dark:border-amber-400/35 dark:bg-amber-400/10 dark:text-amber-200";
  }
  if (slug === "middle-east") {
    return "border-red-600/40 bg-red-100 text-red-950 dark:border-red-500/35 dark:bg-red-500/10 dark:text-red-300";
  }
  return "border-zinc-300 bg-zinc-200/90 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-400";
}
