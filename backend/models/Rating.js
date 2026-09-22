const mongoose = require('mongoose');

// ==========================================
// RATING  — two-way farmer <-> trader rating
// after a completed trade (bid -> parchi).
// One rating per participant per context.
// ==========================================

const ratingSchema = new mongoose.Schema(
  {
    rater: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    ratee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    contextType: {
      type: String,
      enum: ['bid', 'parchi', 'saleListing'],
      required: true,
    },

    contextId: {
      type: String,
      required: true,
    },

    score: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    comment: {
      type: String,
      default: '',
      maxlength: 500,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'ratings',
  },
);

ratingSchema.index(
  { rater: 1, contextType: 1, contextId: 1 },
  { unique: true },
);

module.exports = mongoose.model('Rating', ratingSchema);