require('dotenv').config();

const cors = require('cors');
const express = require('express');
const mongoose = require('mongoose');
const healthRoutes = require('./routes/healthRoutes');
const updatesRoutes = require('./routes/updatesRoutes');
const eventsRoutes = require('./routes/eventsRoutes');
const { startFetchUpdatesJob } = require('./jobs/fetchUpdatesJob');
const { fetchAndStoreUpdates } = require('./services/newsService');

const PORT = Number(process.env.PORT) || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required. Copy .env.example to .env and set it.');
  process.exit(1);
}

const app = express();

function parseCorsOrigins() {
  const raw = process.env.FRONTEND_ORIGIN || 'http://localhost:3001';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

app.use(
  cors({
    origin: parseCorsOrigins(),
  })
);
app.use(express.json());

// Routes
app.use(healthRoutes);
app.use('/updates', updatesRoutes);
app.use('/events', eventsRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler — returns JSON; log full error server-side
app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

async function bootstrap() {
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: Number(process.env.MONGODB_CONNECT_TIMEOUT_MS) || 10_000,
  });
  console.log('[db] Connected to MongoDB');

  startFetchUpdatesJob();

  // Optional: one warm-up fetch shortly after boot so the DB is not empty until first cron tick.
  setImmediate(async () => {
    console.log('[boot] Running initial news sync…');
    try {
      const r = await fetchAndStoreUpdates(console);
      console.log(`[boot] Initial sync: fetched=${r.fetched} unique_urls=${r.dedupedUnique} new_inserts=${r.newInserts}`);
      if (r.errors.length) {
        console.warn(`[boot] Sync notes: ${r.errors.join(' | ')}`);
      }
    } catch (e) {
      console.error('[boot] Initial sync failed', e);
    }
  });

  app.listen(PORT, () => {
    console.log(`[server] Listening on port ${PORT}`);
  });
}

bootstrap().catch((e) => {
  console.error('[fatal]', e);
  process.exit(1);
});
