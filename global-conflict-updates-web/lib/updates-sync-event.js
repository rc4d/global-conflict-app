/** Dispatched after a successful POST /api/updates/sync so lists can refetch. */
export const UPDATES_SYNCED_EVENT = "conflict-updates-sync";

export function dispatchUpdatesSynced() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(UPDATES_SYNCED_EVENT));
}
