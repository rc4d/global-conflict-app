/**
 * Lightweight keyword extraction for event clustering (MVP).
 * Lowercase, drop stopwords, rank by frequency, return top N unique tokens.
 */

const STOPWORDS = new Set(
  `the a an and or but if in on at to for of as is was are were been be with by from
  that this these those it its they them their we you he she his her has have had
  not no nor so than too very can will just about into through during before after
  above below between under again further then once here there when where why how
  all each both few more most other some such only own same so than too very what
  which who whom whose while whom whose our your any don doesn didn isn wasn won would
  could should may might must shall will news says said say update report reports
  according video photo image get got getting`
    .split(/\s+/)
    .filter(Boolean)
);

/**
 * @param {string} title
 * @param {string} description
 * @param {{ min?: number; max?: number; minWordLen?: number }} [opts]
 * @returns {string[]}
 */
function extractKeywords(title, description, opts = {}) {
  const min = opts.min ?? 5;
  const max = opts.max ?? 10;
  const minWordLen = opts.minWordLen ?? 3;

  const blob = `${title || ''} ${description || ''}`.toLowerCase();
  const freq = new Map();
  const tokens = blob.match(/\b[a-z]{2,}\b/g) || [];
  for (const raw of tokens) {
    const w = raw.toLowerCase();
    if (w.length < minWordLen) continue;
    if (STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }


  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const out = [];
  for (const [word] of sorted) {
    if (out.length >= max) break;
    if (!out.includes(word)) out.push(word);
  }

  // Ensure at least a few tags for very short blurbs (loosen word length)
  if (out.length < min && minWordLen > 2) {
    return extractKeywords(title, description, { ...opts, minWordLen: 2, min: 3, max });
  }

  return out;
}

module.exports = { extractKeywords, STOPWORDS };
