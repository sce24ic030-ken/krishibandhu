const mongoose = require('mongoose');

// ==========================================
// INVOICE  — Phase 2 invoice factoring
// workflow over completed Parchis.
// ==========================================

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    parchi: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parchi',
      default: null,
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ['issued', 'approved', 'factored', 'settled', 'cancelled'],
      default: 'issued',
      index: true,
    },

    factor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    dueDate: {
      type: Date,
      default: null,
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
    collection: 'invoices',
  },
);

module.exports = mongoose.model('Invoice', invoiceSchema);