const cron = require('node-cron');
const { fetchAndStoreUpdates } = require('../services/newsService');

function timestamp() {
  return new Date().toISOString();
}

/**
 * Schedules periodic ingestion. Cron expression defaults to every 15 minutes.
 * Logs start/end and errors so operators can trace failures without crashing the process.
 */
function startFetchUpdatesJob() {
  const schedule = process.env.CRON_SCHEDULE || '*/15 * * * *';

  cron.schedule(schedule, async () => {
    console.log(`[cron] ${timestamp()} — starting news sync`);
    try {
      const result = await fetchAndStoreUpdates(console);
      console.log(
        `[cron] ${timestamp()} — sync finished: fetched=${result.fetched} unique_urls=${result.dedupedUnique} new_inserts=${result.newInserts}`
      );
      if (result.errors.length) {
        console.warn(`[cron] ${timestamp()} — warnings/errors: ${result.errors.join(' | ')}`);
      }
    } catch (e) {
      console.error(`[cron] ${timestamp()} — unexpected error`, e);
    }
  });

  console.log(`[cron] Scheduled news sync: "${schedule}"`);
}

module.exports = { startFetchUpdatesJob };
