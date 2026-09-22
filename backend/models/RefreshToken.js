const mongoose = require('mongoose');

// ==========================================
// REFRESH TOKEN  — rotating JWT refresh
// sessions for long-lived farmer/trader logins.
// ==========================================

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    token: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    replacedBy: {
      type: String,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'refreshtokens',
  },
);

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);