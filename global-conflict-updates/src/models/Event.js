const mongoose = require('mongoose');

/**
 * Clusters related Update documents into a single timeline / story (event).
 */
const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    summary: { type: String, default: '' },
    conflict: {
      type: String,
      required: true,
      enum: ['ukraine', 'middle-east'],
      index: true,
    },
    keywords: [{ type: String }],
    firstSeenAt: { type: Date, required: true },
    lastUpdatedAt: { type: Date, required: true, index: true },
    articles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Update' }],
    /** Derived signal fields — recomputed on each event update */
    intensityScore: { type: Number, default: 0, min: 0, max: 100 },
    sourceCount: { type: Number, default: 0, min: 0 },
    isBreaking: { type: Boolean, default: false },
    isEscalating: { type: Boolean, default: false },
  },
  { timestamps: true }
);

eventSchema.index({ conflict: 1, lastUpdatedAt: -1 });

module.exports = mongoose.model('Event', eventSchema);
