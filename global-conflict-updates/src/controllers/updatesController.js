const mongoose = require('mongoose');
const Update = require('../models/Update');

const ALLOWED_CONFLICTS = new Set(['ukraine', 'middle-east']);
const OBJECT_ID_RE_SAFE = /^[a-f0-9]{24}$/i;

function isLikelyObjectId(s) {
  return typeof s === 'string' && OBJECT_ID_RE_SAFE.test(s) && mongoose.Types.ObjectId.isValid(s);
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || 50;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function listUpdates(req, res, next) {
  try {
    const conflictParam = req.params.conflict;
    const filter = {};

    const maxAgeHours = parseInt(req.query.maxAgeHours, 10);
    if (!Number.isNaN(maxAgeHours) && maxAgeHours > 0) {
      const since = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      filter.publishedAt = { $gte: since };
    }

    if (conflictParam) {
      if (!ALLOWED_CONFLICTS.has(conflictParam)) {
        return res.status(400).json({
          error: 'Invalid conflict',
          allowed: [...ALLOWED_CONFLICTS],
        });
      }
      filter.conflict = conflictParam;
    }

    const { page, limit, skip } = parsePagination(req.query);

    const [data, total] = await Promise.all([
      Update.find(filter).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean(),
      Update.countDocuments(filter),
    ]);

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    });
  } catch (e) {
    next(e);
  }
}

async function getUpdateById(req, res, next) {
  try {
    const doc = await Update.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(doc);
  } catch (e) {
    next(e);
  }
}

/**
 * Dispatches GET /updates/:param — Mongo ObjectId returns one document; otherwise treat as conflict slug.
 */
function routeUpdateByParam(req, res, next) {
  const param = req.params.param;
  if (isLikelyObjectId(param)) {
    req.params.id = param;
    return getUpdateById(req, res, next);
  }
  req.params.conflict = param;
  return listUpdates(req, res, next);
}

module.exports = { listUpdates, getUpdateById, routeUpdateByParam };
