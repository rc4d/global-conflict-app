import axios from "axios";

const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const baseURL = raw.replace(/\/$/, "");

export const api = axios.create({
  baseURL,
  timeout: 30_000,
});

/**
 * Resolves max age filter (hours). Set NEXT_PUBLIC_UPDATES_MAX_AGE_HOURS=0 to disable.
 * Defaults to 36 so the UI emphasizes more recent items. Use 0 to disable the filter (full history).
 */
function defaultMaxAgeHours() {
  const v = process.env.NEXT_PUBLIC_UPDATES_MAX_AGE_HOURS;
  if (v === "0" || v === "") return undefined;
  const n = Number(v);
  if (Number.isFinite(n) && n > 0) return n;
  return 36;
}

/**
 * @param {{ conflict?: string; page?: number; limit?: number; maxAgeHours?: number }} opts
 * @returns {Promise<{ data: object[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>}
 */
export async function getUpdates({
  conflict,
  page = 1,
  limit = 20,
  maxAgeHours: maxAgeHoursOpt,
} = {}) {
  const path = conflict
    ? `/updates/${encodeURIComponent(conflict)}`
    : "/updates";
  const maxAgeHours =
    maxAgeHoursOpt !== undefined ? maxAgeHoursOpt : defaultMaxAgeHours();
  const params = { page, limit };
  if (maxAgeHours != null && maxAgeHours > 0) {
    params.maxAgeHours = maxAgeHours;
  }
  const { data } = await api.get(path, { params });
  return data;
}
