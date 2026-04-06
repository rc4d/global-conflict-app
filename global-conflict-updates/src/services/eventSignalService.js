const Event = require('../models/Event');
const Update = require('../models/Update');

const HOUR_MS = 60 * 60 * 1000;
const BREAKING_WINDOW_MS = HOUR_MS;

function escalationThreshold() {
  return Math.max(1, Number(process.env.EVENT_ESCALATION_THRESHOLD) || 5);
}

/**
 * Recompute intensityScore, sourceCount, isBreaking, isEscalating from articles + timestamps.
 * Call after any event mutation that changes `articles` or `lastUpdatedAt`.
 */
async function refreshEventSignalMetrics(eventId, log = console) {
  try {
    const ev = await Event.findById(eventId).select('articles lastUpdatedAt').lean();
    if (!ev) return;

    const ids = ev.articles || [];
    if (!ids.length) {
      await Event.updateOne(
        { _id: eventId },
        {
          $set: {
            intensityScore: 0,
            sourceCount: 0,
            isBreaking: false,
            isEscalating: false,
          },
        }
      );
      return;
    }

    const updates = await Update.find({ _id: { $in: ids } })
      .select('source publishedAt createdAt')
      .lean();

    const sourceCount = new Set(updates.map((u) => u.source).filter(Boolean)).size;

    const now = Date.now();
    const lastUp = new Date(ev.lastUpdatedAt).getTime();
    const isBreaking = now - lastUp <= BREAKING_WINDOW_MS;

    const hourAgo = now - HOUR_MS;
    const articlesAddedLastHour = updates.filter(
      (u) => new Date(u.createdAt).getTime() >= hourAgo
    ).length;
    const isEscalating = articlesAddedLastHour > escalationThreshold();

    let articlePoints = Math.min(updates.length * 5, 60);
    let sourcePoints = Math.min(sourceCount * 8, 40);
    let recencyPoints = 0;
    for (const u of updates) {
      const pub = new Date(u.publishedAt).getTime();
      if (Number.isNaN(pub)) continue;
      const ageH = (now - pub) / HOUR_MS;
      if (ageH <= 1) recencyPoints += 12;
      else if (ageH <= 6) recencyPoints += 7;
      else if (ageH <= 24) recencyPoints += 3;
    }
    recencyPoints = Math.min(recencyPoints, 40);
    const intensityScore = Math.round(
      Math.min(100, articlePoints + sourcePoints + recencyPoints)
    );

    await Event.updateOne(
      { _id: eventId },
      {
        $set: {
          intensityScore,
          sourceCount,
          isBreaking,
          isEscalating,
        },
      }
    );
  } catch (e) {
    log?.error?.(`[eventSignalService] refreshEventSignalMetrics: ${e.message || e}`);
  }
}

module.exports = { refreshEventSignalMetrics, BREAKING_WINDOW_MS, escalationThreshold };
