import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function formatPublishedRelative(iso) {
  if (iso == null || iso === "") return "—";
  const d = dayjs(iso);
  if (!d.isValid()) return "—";
  return d.fromNow();
}

/** Alias for intelligence UI (same as formatPublishedRelative). */
export function formatRelativeTime(iso) {
  return formatPublishedRelative(iso);
}
