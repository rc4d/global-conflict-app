import { NextResponse } from "next/server";

const SYNC_TIMEOUT_MS = 120_000;

function apiBaseUrl() {
  const base =
    process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "";
  return base.replace(/\/$/, "");
}

export async function POST() {
  const base = apiBaseUrl();
  if (!base) {
    return NextResponse.json(
      { error: "API base URL not configured (NEXT_PUBLIC_API_BASE_URL)" },
      { status: 500 }
    );
  }

  const secret = process.env.ADMIN_SYNC_SECRET;
  const headers = {};
  if (secret) {
    headers["X-Admin-Sync-Secret"] = secret;
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}/updates/sync`, {
      method: "POST",
      headers,
      signal: controller.signal,
    });
    clearTimeout(t);

    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { error: text || res.statusText };
    }

    if (!res.ok) {
      return NextResponse.json(body, { status: res.status });
    }
    return NextResponse.json(body);
  } catch (e) {
    clearTimeout(t);
    const msg =
      e.name === "AbortError"
        ? "Sync timed out — the server may still be processing."
        : e instanceof Error
          ? e.message
          : "Sync request failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
