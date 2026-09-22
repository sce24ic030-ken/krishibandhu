const mongoose = require('mongoose');

// ==========================================
// CHECKPOINT  — generic traceability scan log.
// Used for: lot QR, sale match, weighbridge,
// logistics, cold-storage check-in, dispute
// evidence, harvest checks — anything scanned.
// ==========================================

const checkpointSchema = new mongoose.Schema(
  {
    qrType: {
      type: String,
      enum: [
        'lot',
        'sale',
        'parchi',
        'match',
        'weighbridge',
        'logistics',
        'coldstorage',
        'harvest',
        'dispute',
      ],
      required: true,
      index: true,
    },

    entityType: {
      type: String,
      enum: [
        'crop',
        'saleListing',
        'parchi',
        'backhaul',
        'storageRequest',
        'bid',
      ],
      required: true,
    },

    entityId: {
      type: String,
      required: true,
      index: true,
    },

    qrToken: {
      type: String,
      index: true,
    },

    scannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    scannedByName: {
      type: String,
      default: '',
    },

    role: {
      type: String,
      default: '',
    },

    location: {
      type: String,
      default: '',
    },

    notes: {
      type: String,
      default: '',
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Client-generated id for offline sync dedupe
    syncId: {
      type: String,
      unique: true,
      sparse: true,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'checkpoints',
  },
);

module.exports = mongoose.model('Checkpoint', checkpointSchema);