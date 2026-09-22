const mongoose = require('mongoose');

// ==========================================
// CARBON CREDIT  — Phase 2 marketplace base.
// Farmers register sustainable practices to
// earn verifiable carbon credit units.
// ==========================================

const carbonCreditSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    practice: {
      type: String,
      required: true,
      trim: true,
    },

    crop: {
      type: String,
      default: '',
    },

    area: {
      type: Number,
      default: 0,
    },

    areaUnit: {
      type: String,
      default: 'acre',
    },

    estimatedUnits: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ['pending', 'verified', 'listed', 'sold', 'rejected'],
      default: 'pending',
      index: true,
    },

    pricePerUnit: {
      type: Number,
      default: 0,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    description: {
      type: String,
      default: '',
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    collection: 'carboncredits',
  },
);

module.exports = mongoose.model('CarbonCredit', carbonCreditSchema);