const mongoose = require('mongoose');

/**
 * Persists a single news item tied to a conflict zone for the MVP.
 * `url` is unique so re-ingestion does not create duplicates.
 */
const updateSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    source: { type: String, required: true },
    url: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    publishedAt: { type: Date, required: true, index: true },
    conflict: {
      type: String,
      required: true,
      enum: ['ukraine', 'middle-east'],
      index: true,
    },
    /** AI or fallback one-liner for cards and detail views */
    summary: { type: String, default: '' },
  },
  { timestamps: true }
);

updateSchema.index({ conflict: 1, publishedAt: -1 });

module.exports = mongoose.model('Update', updateSchema);
