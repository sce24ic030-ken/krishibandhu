const mongoose = require('mongoose');

// ==========================================
// AUDIT LOG  — immutable-ish record of admin
// and sensitive operations on the platform.
// ==========================================

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    actorName: {
      type: String,
      default: '',
    },

    actorRole: {
      type: String,
      default: '',
    },

    action: {
      type: String,
      required: true,
      index: true,
    },

    targetType: {
      type: String,
      default: '',
      index: true,
    },

    targetId: {
      type: String,
      default: '',
      index: true,
    },

    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    ip: {
      type: String,
      default: '',
    },

    userAgent: {
      type: String,
      default: '',
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'auditlogs',
  },
);

module.exports = mongoose.model('AuditLog', auditLogSchema);