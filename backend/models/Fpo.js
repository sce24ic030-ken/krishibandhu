const mongoose = require('mongoose');

// ==========================================
// FPO  — Farmer Producer Organisation.
// Phase 2 base: formation requests, member
// roster and (future) virtual marketplace.
// ==========================================

const fpoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    district: {
      type: String,
      default: '',
      index: true,
    },

    state: {
      type: String,
      default: 'Maharashtra',
    },

    leadFarmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    commodityFocus: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ['proposed', 'forming', 'active', 'inactive'],
      default: 'proposed',
      index: true,
    },

    registrationNumber: {
      type: String,
      default: '',
    },

    notes: {
      type: String,
      default: '',
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'fpos',
  },
);

module.exports = mongoose.model('Fpo', fpoSchema);