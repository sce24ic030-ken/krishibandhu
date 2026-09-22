const mongoose = require('mongoose');

// ==========================================
// LEDGER RECORD  — append-only hash chain.
// Every sensitive mutation appends a block;
// each block hashes the previous block plus
// its own canonicalized payload.
// ==========================================

const ledgerRecordSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: [
        'parchi',
        'crop',
        'saleListing',
        'bid',
        'checkpoint',
        'invoice',
        'storageRequest',
        'backhaul',
        'fpo',
        'carbonCredit',
      ],
      required: true,
      index: true,
    },

    entityId: {
      type: String,
      required: true,
      index: true,
    },

    blockNumber: {
      type: Number,
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    prevHash: {
      type: String,
      required: true,
    },

    hash: {
      type: String,
      required: true,
      unique: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'ledgerrecords',
  },
);

// One entity chain must never fork.
ledgerRecordSchema.index(
  { entityType: 1, entityId: 1, blockNumber: 1 },
  { unique: true },
);

module.exports = mongoose.model('LedgerRecord', ledgerRecordSchema);