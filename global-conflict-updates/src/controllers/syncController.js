const { fetchAndStoreUpdates } = require('../services/newsService');

/**
 * Runs the same ingest path as the cron job, on demand (for ops or staging checks).
 */
async function triggerManualSync(req, res, next) {
  try {
    console.log(`[sync] Manual sync started (${req.ip || 'unknown'})`);
    const result = await fetchAndStoreUpdates(console);
    console.log(
      `[sync] Manual sync done: fetched=${result.fetched} unique_urls=${result.dedupedUnique} new_inserts=${result.newInserts}`
    );

    res.status(200).json({
      ok: true,
      fetched: result.fetched,
      uniqueUrls: result.dedupedUnique,
      newInserts: result.newInserts,
      errors: result.errors,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { triggerManualSync };
