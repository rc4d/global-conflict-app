const crypto = require('crypto');

/**
 * When ADMIN_SYNC_SECRET is set, requires header X-Admin-Sync-Secret to match (timing-safe).
 * When unset, allows sync for local MVP; a warning is logged once per process.
 */
let warnedMissingSecret = false;

function requireAdminSyncSecret(req, res, next) {
  const secret = process.env.ADMIN_SYNC_SECRET;

  if (!secret) {
    if (!warnedMissingSecret) {
      console.warn(
        '[auth] ADMIN_SYNC_SECRET is unset — POST /updates/sync accepts any caller (set secret for production)'
      );
      warnedMissingSecret = true;
    }
    return next();
  }

  const provided = req.get('x-admin-sync-secret') || '';
  const a = Buffer.from(secret, 'utf8');
  const b = Buffer.from(provided, 'utf8');

  if (a.length !== b.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (!crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

module.exports = { requireAdminSyncSecret };
