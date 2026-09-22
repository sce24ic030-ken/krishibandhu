const mongoose = require('mongoose');

// ==========================================
// NOTIFICATION  — SMS / WhatsApp / IVR /
// in-app alerts. Delivery is delegated to
// notificationService (demo-safe when no
// external provider is configured).
// ==========================================

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ['sms', 'whatsapp', 'ivr', 'inapp', 'email'],
      default: 'inapp',
    },

    channel: {
      type: String,
      default: 'app',
    },

    title: {
      type: String,
      default: '',
    },

    body: {
      type: String,
      default: '',
    },

    readAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    failedAt: {
      type: Date,
      default: null,
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    collection: 'notifications',
  },
);

module.exports = mongoose.model('Notification', notificationSchema);