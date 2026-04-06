const Event = require('../models/Event');
const Update = require('../models/Update');
const { extractKeywords } = require('./keywordService');
const { generateEventSummary } = require('./aiService');
const { refreshEventSignalMetrics } = require('./eventSignalService');

const MATCH_WINDOW_MS = () =>
  Math.max(3600_000, (Number(process.env.EVENT_MATCH_WINDOW_HOURS) || 12) * 3600 * 1000);
const MIN_KEYWORD_OVERLAP = Math.max(1, Number(process.env.EVENT_MIN_KEYWORD_OVERLAP) || 2);
const MAX_ARTICLES_PER_EVENT = Math.min(50, Math.max(5, Number(process.env.EVENT_MAX_ARTICLES) || 20));

function keywordOverlap(a, b) {
  if (!a?.length || !b?.length) return 0;
  const setB = new Set(b);
  return a.filter((k) => setB.has(k)).length;
}

function fallbackEventSummary(titles) {
  const t = titles.filter(Boolean)[0] || 'Developing story';
  return t.slice(0, 400);
}

/**
 * Rebuild event.summary from recent article titles (AI optional).
 */
async function refreshEventSummary(eventId, log) {
  const ev = await Event.findById(eventId).select('articles').lean();
  if (!ev?.articles?.length) return;

  const tail = ev.articles.slice(-15);
  const updates = await Update.find({ _id: { $in: tail } })
    .select('title')
    .lean();
  const byId = new Map(updates.map((u) => [String(u._id), u.title]));
  const titles = tail.map((id) => byId.get(String(id))).filter(Boolean);

  const summary = (await generateEventSummary(titles)) || fallbackEventSummary(titles);
  await Event.updateOne({ _id: eventId }, { $set: { summary } });
}

/**
 * Attach a newly inserted Update to an existing Event or create one.
 */
async function assignUpdateToEvent(updateDoc, log = console) {
  if (!updateDoc?._id || !updateDoc.conflict) return;

  const keywords = extractKeywords(updateDoc.title, updateDoc.description);
  const since = new Date(Date.now() - MATCH_WINDOW_MS());

  const candidates = await Event.find({
    conflict: updateDoc.conflict,
    lastUpdatedAt: { $gte: since },
  }).lean();

  let matched = null;
  for (const ev of candidates) {
    if (keywordOverlap(keywords, ev.keywords) >= MIN_KEYWORD_OVERLAP) {
      matched = ev;
      break;
    }
  }

  const now = new Date();
  const articleId = updateDoc._id;

  if (matched) {
    await Event.updateOne(
      { _id: matched._id },
      {
        $push: {
          articles: {
            $each: [articleId],
            $slice: -MAX_ARTICLES_PER_EVENT,
          },
        },
        $set: { lastUpdatedAt: now },
      }
    );
    await refreshEventSignalMetrics(matched._id, log);
    try {
      await refreshEventSummary(matched._id, log);
    } catch (e) {
      log?.error?.(`[eventService] refreshEventSummary: ${e.message || e}`);
    }
    return;
  }

  const seedTitles = [updateDoc.title];
  let summary = (await generateEventSummary(seedTitles)) || fallbackEventSummary(seedTitles);
  let kw = keywords.length ? keywords : extractKeywords(updateDoc.title, updateDoc.description);
  if (!kw.length) kw = ['developing'];

  const created = await Event.create({
    title: (updateDoc.title || 'Untitled').slice(0, 300),
    summary,
    conflict: updateDoc.conflict,
    keywords: kw,
    firstSeenAt: now,
    lastUpdatedAt: now,
    articles: [articleId],
  });
  await refreshEventSignalMetrics(created._id, log);
}

module.exports = {
  assignUpdateToEvent,
  refreshEventSummary,
};
