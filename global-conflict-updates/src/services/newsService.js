const axios = require('axios');
const Update = require('../models/Update');
const { generateSummary } = require('./aiService');
const { assignUpdateToEvent } = require('./eventService');

const NEWS_API_BASE = 'https://newsapi.org/v2';
const NEWSDATA_API_BASE = 'https://newsdata.io/api/1/latest';

const FALLBACK_SUMMARY_MAX = 600;

/** Keyword sets drive conflict tagging (case-insensitive substring match). */
const CONFLICT_KEYWORDS = {
  ukraine: ['ukraine', 'russia', 'russian'],
  'middle-east': ['israel', 'gaza', 'hamas'],
};

/**
 * NewsAPI searches we run on each sync. `fallbackConflict` is used when text does not match keywords.
 */
const SEARCH_QUERIES = [
  { q: 'Ukraine war', fallbackConflict: 'ukraine' },
  { q: 'Israel Palestine conflict', fallbackConflict: 'middle-east' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summaryFallback(doc) {
  const t = (doc.description || doc.title || '').trim();
  return t.slice(0, FALLBACK_SUMMARY_MAX);
}

/** Skip persisting very old rows when INGEST_MAX_ARTICLE_AGE_HOURS is set (e.g. 12). */
function articleFreshEnough(publishedAt) {
  const h = Number(process.env.INGEST_MAX_ARTICLE_AGE_HOURS);
  if (!Number.isFinite(h) || h <= 0) return true;
  const t = new Date(publishedAt).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= h * 3600 * 1000;
}

/**
 * Before first insert only: rate-limit OpenAI, then AI or description fallback.
 */
async function prepareSummaryForInsert(doc) {
  if (process.env.OPENAI_API_KEY) {
    const delayMs = Math.max(0, Number(process.env.OPENAI_SUMMARY_DELAY_MS) || 500);
    await sleep(delayMs);
    const ai = await generateSummary(doc.title, doc.description);
    if (ai) return ai;
  }
  return summaryFallback(doc);
}

function normalizeText(title, description) {
  return `${title || ''} ${description || ''}`.toLowerCase();
}

function resolveConflict(title, description, fallbackConflict) {
  const blob = normalizeText(title, description);
  const hasUkraine = CONFLICT_KEYWORDS.ukraine.some((k) => blob.includes(k.toLowerCase()));
  const hasMiddleEast = CONFLICT_KEYWORDS['middle-east'].some((k) => blob.includes(k.toLowerCase()));

  if (hasUkraine && !hasMiddleEast) return 'ukraine';
  if (hasMiddleEast && !hasUkraine) return 'middle-east';
  if (hasUkraine && hasMiddleEast) {
    const uScore = CONFLICT_KEYWORDS.ukraine.filter((k) => blob.includes(k.toLowerCase())).length;
    const mScore = CONFLICT_KEYWORDS['middle-east'].filter((k) => blob.includes(k.toLowerCase())).length;
    return uScore >= mScore ? 'ukraine' : 'middle-east';
  }

  return fallbackConflict;
}

function mapArticle(article, fallbackConflict) {
  const url = article.url;
  if (!url) return null;

  const title = article.title || 'Untitled';
  const description = article.description || article.content || '';
  const source =
    article.source && typeof article.source.name === 'string'
      ? article.source.name
      : 'unknown';
  const publishedAt = article.publishedAt ? new Date(article.publishedAt) : new Date();
  const conflict = resolveConflict(title, description, fallbackConflict);

  return {
    title,
    description,
    source,
    url,
    publishedAt,
    conflict,
  };
}

/**
 * NewsData `pubDate` is documented as UTC; parse explicitly so "from now" is not shifted by local TZ.
 */
function parseNewsDataPubDate(row) {
  if (!row.pubDate) return new Date();
  const raw = String(row.pubDate).trim();
  const withT = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const hasZone = /Z$|[+-]\d{2}:?\d{2}$/.test(withT);
  const isoUtc =
    row.pubDateTZ === 'UTC' || !row.pubDateTZ
      ? hasZone
        ? withT
        : `${withT}Z`
      : withT;
  const d = new Date(isoUtc);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Maps NewsData.io latest result to the same shape as NewsAPI (dedupes on `link` → url).
 */
function mapNewsDataArticle(row, fallbackConflict) {
  const url = row.link;
  if (!url || typeof url !== 'string') return null;

  const title = row.title || 'Untitled';
  const description =
    row.description ||
    (typeof row.content === 'string' ? row.content.slice(0, 800) : '') ||
    '';
  let source = 'unknown';
  if (Array.isArray(row.creator) && row.creator[0]) {
    source = String(row.creator[0]);
  } else if (row.source_name) {
    source = String(row.source_name);
  } else if (row.source_id) {
    source = String(row.source_id);
  }

  const publishedAt = parseNewsDataPubDate(row);

  const textForTags = `${description}\n${typeof row.content === 'string' ? row.content.slice(0, 400) : ''}`;
  const conflict = resolveConflict(title, textForTags, fallbackConflict);

  return {
    title,
    description,
    source,
    url,
    publishedAt,
    conflict,
  };
}

function parsePullMode() {
  const raw = (process.env.NEWS_PULL_MODE || 'top-headlines').toLowerCase();
  if (raw === 'everything' || raw === 'top-headlines' || raw === 'both') return raw;
  return 'top-headlines';
}

function everythingFromParam() {
  const hours = Math.min(168, Math.max(1, Number(process.env.NEWS_EVERYTHING_FROM_HOURS) || 72));
  const d = new Date(Date.now() - hours * 60 * 60 * 1000);
  return d.toISOString();
}

async function fetchEverything(query, apiKey, pageSize) {
  const params = {
    q: query,
    language: 'en',
    sortBy: 'publishedAt',
    pageSize,
    from: everythingFromParam(),
  };

  const { data } = await axios.get(`${NEWS_API_BASE}/everything`, {
    params,
    headers: { 'X-Api-Key': apiKey },
    timeout: 25_000,
    validateStatus: (s) => s < 500,
  });

  if (data.status !== 'ok' || !Array.isArray(data.articles)) {
    const msg = data.message || data.code || 'NewsAPI returned a non-ok status';
    const err = new Error(msg);
    err.status = data.code === 'apiKeyInvalid' ? 401 : 502;
    throw err;
  }

  return data.articles;
}

async function fetchTopHeadlines(query, apiKey, pageSize) {
  const { data } = await axios.get(`${NEWS_API_BASE}/top-headlines`, {
    params: {
      q: query,
      language: 'en',
      pageSize,
    },
    headers: { 'X-Api-Key': apiKey },
    timeout: 25_000,
    validateStatus: (s) => s < 500,
  });

  if (data.status !== 'ok' || !Array.isArray(data.articles)) {
    const msg = data.message || data.code || 'NewsAPI returned a non-ok status';
    const err = new Error(msg);
    err.status = data.code === 'apiKeyInvalid' ? 401 : 502;
    throw err;
  }

  return data.articles;
}

async function fetchArticlesForQuery(query, apiKey, pageSize, mode) {
  const batches = [];
  if (mode === 'everything' || mode === 'both') {
    batches.push(fetchEverything(query, apiKey, pageSize));
  }
  if (mode === 'top-headlines' || mode === 'both') {
    batches.push(fetchTopHeadlines(query, apiKey, pageSize));
  }
  const results = await Promise.all(batches);
  return results.flat();
}

/** NewsData.io — free tier ~10 articles per request; cap size to stay within plan limits. */
async function fetchNewsDataLatest(query, apiKey) {
  const maxAllowed = Math.min(10, Math.max(1, Number(process.env.NEWSDATA_MAX_PER_REQUEST) || 10));
  // `timeframe` is not available on NewsData.io free tier (paid-only). Set NEWSDATA_TIMEFRAME only if your plan supports it.
  const rawTf = (process.env.NEWSDATA_TIMEFRAME || '').trim();
  const params = {
    apikey: apiKey,
    q: query,
    language: process.env.NEWSDATA_LANGUAGE || 'en',
    size: maxAllowed,
  };
  if (rawTf.length > 0) {
    params.timeframe = rawTf;
  }
  const { data } = await axios.get(NEWSDATA_API_BASE, {
    params,
    timeout: 25_000,
    validateStatus: (s) => s < 500,
  });

  if (data.status !== 'success' || !Array.isArray(data.results)) {
    const msg = data.message || data.results?.message || 'NewsData.io returned a non-success status';
    const err = new Error(msg);
    err.status = 502;
    throw err;
  }

  return data.results;
}

async function upsertArticle(doc) {
  try {
    const result = await Update.updateOne(
      { url: doc.url },
      {
        $setOnInsert: {
          title: doc.title,
          description: doc.description,
          source: doc.source,
          url: doc.url,
          publishedAt: doc.publishedAt,
          conflict: doc.conflict,
          summary: doc.summary || '',
        },
      },
      { upsert: true }
    );
    return result.upsertedCount === 1;
  } catch (e) {
    if (e && e.code === 11000) return false;
    throw e;
  }
}

/**
 * Dedupe in-batch, skip DB hits for known URLs, then AI summary + upsert only for new URLs.
 */
async function ingestNormalizedDoc(doc, seen, stats, log) {
  if (!doc || seen.has(doc.url)) return;
  if (!articleFreshEnough(doc.publishedAt)) return;

  seen.add(doc.url);
  stats.dedupedUnique += 1;

  if (await Update.exists({ url: doc.url })) return;

  try {
    doc.summary = await prepareSummaryForInsert(doc);
  } catch (e) {
    log.error?.(`[newsService] Summary failed for ${doc.url}: ${e.message || e}`);
    doc.summary = summaryFallback(doc);
  }

  const inserted = await upsertArticle(doc);
  if (inserted) {
    stats.newInserts += 1;
    try {
      const saved = await Update.findOne({ url: doc.url }).lean();
      if (saved) {
        await assignUpdateToEvent(saved, log);
      }
    } catch (e) {
      log.error?.(`[newsService] Event clustering failed for ${doc.url}: ${e.message || e}`);
    }
  }
}

/**
 * Fetches from NewsAPI and/or NewsData.io, normalizes, dedupes by URL, stores new rows with summaries.
 */
async function fetchAndStoreUpdates(log = console) {
  const newsApiKey = process.env.NEWS_API_KEY;
  const newsDataKey = process.env.NEWSDATA_API_KEY;

  if (!newsApiKey && !newsDataKey) {
    const msg = 'Neither NEWS_API_KEY nor NEWSDATA_API_KEY is set — skipping news fetch';
    log.error?.(`[newsService] ${msg}`);
    return { newInserts: 0, dedupedUnique: 0, fetched: 0, errors: [msg] };
  }

  const pageSize = Math.min(50, Number(process.env.NEWS_PAGE_SIZE) || 30);
  const mode = parsePullMode();
  const seen = new Set();
  const errors = [];
  const stats = { fetched: 0, newInserts: 0, dedupedUnique: 0 };

  const tfNote = process.env.NEWSDATA_TIMEFRAME?.trim()
    ? ` newsdata_timeframe=${process.env.NEWSDATA_TIMEFRAME.trim()}`
    : '';
  log.info?.(
    `[newsService] sources: newsapi=${Boolean(newsApiKey)} newsdata=${Boolean(newsDataKey)} pullMode=${mode}${tfNote}`
  );

  // NewsData first — usually better recency; wins URL dedupe when both providers return the same link.
  if (newsDataKey) {
    for (const { q, fallbackConflict } of SEARCH_QUERIES) {
      try {
        const rows = await fetchNewsDataLatest(q, newsDataKey);
        stats.fetched += rows.length;

        for (const raw of rows) {
          const doc = mapNewsDataArticle(raw, fallbackConflict);
          await ingestNormalizedDoc(doc, seen, stats, log);
        }
      } catch (e) {
        const message = e.response?.data?.message || e.message || String(e);
        errors.push(`NewsData.io "${q}": ${message}`);
        log.error?.(`[newsService] NewsData.io fetch failed for "${q}": ${message}`);
      }
    }
  }

  if (newsApiKey) {
    for (const { q, fallbackConflict } of SEARCH_QUERIES) {
      try {
        const articles = await fetchArticlesForQuery(q, newsApiKey, pageSize, mode);
        const sorted = [...articles].sort(
          (a, b) =>
            new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime()
        );
        stats.fetched += sorted.length;

        for (const raw of sorted) {
          const doc = mapArticle(raw, fallbackConflict);
          await ingestNormalizedDoc(doc, seen, stats, log);
        }
      } catch (e) {
        const message = e.response?.data?.message || e.message || String(e);
        errors.push(`NewsAPI "${q}": ${message}`);
        log.error?.(`[newsService] NewsAPI fetch failed for "${q}": ${message}`);
      }
    }
  }

  return {
    newInserts: stats.newInserts,
    dedupedUnique: stats.dedupedUnique,
    fetched: stats.fetched,
    errors,
  };
}

module.exports = {
  fetchAndStoreUpdates,
  resolveConflict,
  SEARCH_QUERIES,
};
