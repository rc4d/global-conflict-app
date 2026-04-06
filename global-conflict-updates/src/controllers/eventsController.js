const mongoose = require('mongoose');
const Event = require('../models/Event');

const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

function isObjectIdLike(s) {
  return typeof s === 'string' && OBJECT_ID_RE.test(s) && mongoose.Types.ObjectId.isValid(s);
}

function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || 30;
  const limit = Math.min(100, Math.max(1, rawLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * GET /events — newest activity first; omits full article id arrays (returns articleCount).
 */
async function listEvents(req, res, next) {
  try {
    const { page, limit, skip } = parsePagination(req.query);

    const filter = {};
    if (req.query.conflict && ['ukraine', 'middle-east'].includes(req.query.conflict)) {
      filter.conflict = req.query.conflict;
    }

    const [data, total] = await Promise.all([
      Event.aggregate([
        { $match: filter },
        { $sort: { lastUpdatedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            title: 1,
            summary: 1,
            conflict: 1,
            keywords: 1,
            firstSeenAt: 1,
            lastUpdatedAt: 1,
            createdAt: 1,
            updatedAt: 1,
            articleCount: { $size: { $ifNull: ['$articles', []] } },
            intensityScore: { $ifNull: ['$intensityScore', 0] },
            sourceCount: { $ifNull: ['$sourceCount', 0] },
            isBreaking: { $ifNull: ['$isBreaking', false] },
            isEscalating: { $ifNull: ['$isEscalating', false] },
          },
        },
      ]),
      Event.countDocuments(filter),
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

/**
 * GET /events/:id — full event with populated articles.
 */
async function getEventById(req, res, next) {
  try {
    const id = req.params.id;
    if (!isObjectIdLike(id)) {
      return res.status(400).json({ error: 'Invalid event id' });
    }

    const event = await Event.findById(id)
      .populate({
        path: 'articles',
        options: { sort: { publishedAt: -1 } },
      })
      .lean();

    if (!event) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({
      ...event,
      intensityScore: event.intensityScore ?? 0,
      sourceCount: event.sourceCount ?? 0,
      isBreaking: event.isBreaking ?? false,
      isEscalating: event.isEscalating ?? false,
    });
  } catch (e) {
    next(e);
  }
}

module.exports = { listEvents, getEventById };
