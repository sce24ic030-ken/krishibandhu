const express = require('express');

const Checkpoint = require('../models/Checkpoint');
const Parchi = require('../models/Parchi');
const AuditLog = require('../models/AuditLog');
const LedgerRecord = require('../models/LedgerRecord');
const User = require('../models/User');
const Market = require('../models/Market');
const MarketPrice = require('../models/MarketPrice');
const SaleListing = require('../models/SaleListing');
const Transaction = require('../models/Transaction');
const Crop = require('../models/Crop');

const ledgerService = require('../services/ledgerService');
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');

const {
  protect,
  requireRole,
} = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(requireRole('admin'));

/*
 * ==========================================
 * Tracking Control Tower
 * ==========================================
 *
 * Live traceability pulse: recent scans, chain
 * integrity status, open parchi pipeline, audit
 * trail.
 *
 * GET
 * /api/admin/analytics/control-tower
 */

router.get(
  '/control-tower',
  async (req, res) => {
    try {
      const cached = await cacheService.get('admin:control-tower');

      if (cached) {
        return res.status(200).json({ success: true, ...cached });
      }

      const [recentScans, recentLedger, auditLogs, parchiStats] =
        await Promise.all([
          Checkpoint.find({})
            .sort({ createdAt: -1 })
            .limit(25)
            .populate('scannedBy', 'name role')
            .lean(),
          LedgerRecord.find({})
            .sort({ createdAt: -1 })
            .limit(25)
            .lean(),
          AuditLog.find({})
            .sort({ createdAt: -1 })
            .limit(25)
            .lean(),
          Parchi.aggregate([
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ]),
        ]);

      // Verify latest chain integrity for the most recent entities
      const entities = recentLedger.map((r) => `${r.entityType}:${r.entityId}`);

      const uniqueEntities = [...new Set(entities)].slice(0, 10);

      const chainChecks = [];

      for (const key of uniqueEntities) {
        const [type, id] = key.split(':');

        const chain = await ledgerService
          .verifyChain(type, id)
          .catch(() => null);

        if (chain) {
          chainChecks.push({
            entityType: type,
            entityId: id,
            valid: chain.valid,
            length: chain.length,
            tamperedBlocks: chain.tamperedBlocks,
          });
        }
      }

      const payload = {
        recentScans,
        recentLedger: recentLedger.slice(0, 15),
        auditLogs,
        parchiByStatus: parchiStats,
        chainChecks,
        verifiedChains: {
          total: chainChecks.length,
          valid: chainChecks.filter((c) => c.valid).length,
          tampered: chainChecks.filter((c) => !c.valid).length,
        },
        computedAt: new Date().toISOString(),
      };

      await cacheService.set('admin:control-tower', payload, 60);

      return res.status(200).json({ success: true, ...payload });
    } catch (error) {
      console.error('Control Tower Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load control tower.',
      });
    }
  },
);

/*
 * ==========================================
 * Government Analytics
 * ==========================================
 *
 * Portfolio snapshots the state can use:
 * coverage, volumes, price summaries, activity.
 *
 * GET
 * /api/admin/analytics/gov
 */

router.get(
  '/gov',
  async (req, res) => {
    try {
      const cached = await cacheService.get('admin:gov');

      if (cached) {
        return res.status(200).json({ success: true, ...cached });
      }

      const [
        totals,
        monthly,
        commoditySummary,
        coverage,
        riskSummary,
      ] = await Promise.all([
        Promise.all([
          User.countDocuments({ role: 'farmer' }),
          User.countDocuments({ role: 'trader' }),
          User.countDocuments({ role: 'admin' }),
          Market.countDocuments(),
          SaleListing.countDocuments(),
          Parchi.countDocuments(),
          Transaction.countDocuments(),
          Crop.countDocuments(),
        ]),
        Transaction.aggregate([
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              count: { $sum: 1 },
              volume: { $sum: '$amount' },
            },
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 12 },
        ]),
        MarketPrice.aggregate([
          {
            $group: {
              _id: '$commodity',
              latestAvg: { $avg: '$modalPrice' },
              observations: { $sum: 1 },
            },
          },
          { $sort: { observations: -1 } },
          { $limit: 15 },
        ]),
        analyticsService.getStatewideCoverage(),
        Parchi.aggregate([
          {
            $group: {
              _id: '$paymentStatus',
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      const [
        farmers,
        traders,
        admins,
        markets,
        listings,
        parchis,
        transactions,
        crops,
      ] = totals;

      const payload = {
        totals: {
          farmers,
          traders,
          admins,
          markets,
          listings,
          parchis,
          transactions,
          crops,
        },
        monthlyActivity: monthly,
        commoditySummary,
        coverage,
        settlementStatus: riskSummary,
        computedAt: new Date().toISOString(),
      };

      await cacheService.set('admin:gov', payload, 300);

      return res.status(200).json({ success: true, ...payload });
    } catch (error) {
      console.error('Gov Analytics Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load government analytics.',
      });
    }
  },
);

/*
 * ==========================================
 * Data Dictionary Transparency
 * ==========================================
 *
 * Exposes every collection/field the platform
 * stores, so citizens & auditors can see what
 * data is held.
 *
 * GET
 * /api/admin/analytics/data-dictionary
 */

router.get(
  '/data-dictionary',
  async (req, res) => {
    try {
      const models = {
        users: User,
        markets: Market,
        marketPrices: MarketPrice,
        crops: Crop,
        saleListings: SaleListing,
        parchis: Parchi,
        transactions: Transaction,
        checkpoints: Checkpoint,
        ledgerRecords: LedgerRecord,
        auditLogs: AuditLog,
      };

      const dictionary = Object.entries(models).map(
        ([collection, model]) => {
          const schema = model.schema;

          const fields = Object.entries(schema.paths).map(
            ([name, path]) => ({
              name,
              type: path.instance || path.options?.type?.name || 'Mixed',
              required: Boolean(path.isRequired),
              indexed: Boolean(path._index),
              enum: path.options?.enum || undefined,
            }),
          );

          return {
            collection,
            fields,
            count: fields.length,
          };
        },
      );

      return res.status(200).json({
        success: true,
        dictionary,
        totalCollections: dictionary.length,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Data Dictionary Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load data dictionary.',
      });
    }
  },
);

/*
 * ==========================================
 * Fraud / Anomaly Flags
 * ==========================================
 *
 * Deduction anomalies + tampered chains +
 * receipts never AI-verified.
 *
 * GET
 * /api/admin/analytics/fraud-flags
 */

router.get(
  '/fraud-flags',
  async (req, res) => {
    try {
      const parchis = await Parchi.find({})
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

      const flags = [];

      parchis.forEach((parchi) => {
        const deductionCheck = analyticsService.checkParchiDeductions(
          parchi,
        );

        deductionCheck.flags.forEach((flag) => {
          flags.push({
            severity: flag.severity,
            code: flag.code,
            message: flag.message,
            details: {
              parchi: parchi.parchiNumber,
              parchiId: parchi._id,
              total: parchi.totalAmount || parchi.amount,
              deductions: parchi.deductions || parchi.commission,
              ratio: flag.ratio,
            },
            category: 'deduction',
          });
        });

        // Receipts that were never AI-verified
        if (
          parchi.paymentReceipt &&
          (!parchi.aiVerification ||
            parchi.aiVerification.status !== 'completed')
        ) {
          flags.push({
            severity: 'medium',
            code: 'RECEIPT_UNVERIFIED',
            message:
              'A payment receipt exists but was never AI-verified.',
            details: {
              parchi: parchi.parchiNumber,
              parchiId: parchi._id,
            },
            category: 'receipt',
          });
        }

        // Unusual same-day status flips
        const created = new Date(parchi.createdAt);
        const confirmed = parchi.farmerConfirmation?.confirmedAt
          ? new Date(parchi.farmerConfirmation.confirmedAt)
          : null;

        if (
          confirmed &&
          parchis.length > 10 &&
          confirmed.getDate() === created.getDate() &&
          confirmed.getMonth() === created.getMonth()
        ) {
          flags.push({
            severity: 'low',
            code: 'SAME_DAY_SETTLEMENT',
            message:
              'Parchi moved from creation to farmer confirmation within the same day. Review if recurring.',
            details: {
              parchi: parchi.parchiNumber,
              parchiId: parchi._id,
            },
            category: 'settlement',
          });
        }
      });

      // Tampered ledger chains
      const entities = await LedgerRecord.aggregate([
        { $group: { _id: { entityType: '$entityType', entityId: '$entityId' } } },
      ]);

      const tamperedChains = [];

      for (const { _id } of entities.slice(0, 60)) {
        const chain = await ledgerService
          .verifyChain(_id.entityType, _id.entityId)
          .catch(() => null);

        if (chain && !chain.valid) {
          tamperedChains.push({
            entityType: _id.entityType,
            entityId: _id.entityId,
            tamperedBlocks: chain.tamperedBlocks,
            length: chain.length,
          });
        }
      }

      const sorted = flags.sort(
        (a, b) =>
          ({ high: 0, medium: 1, low: 2 }[a.severity] ?? 3) -
          ({ high: 0, medium: 1, low: 2 }[b.severity] ?? 3),
      );

      return res.status(200).json({
        success: true,
        total: sorted.length + tamperedChains.length,
        flags: sorted,
        tamperedChains,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Fraud Flags Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to scan for anomalies.',
      });
    }
  },
);

/*
 * ==========================================
 * Parchi audit (chain + deductions)
 * ==========================================
 *
 * GET
 * /api/admin/analytics/parchi-audit/:id
 */

router.get(
  '/parchi-audit/:id',
  async (req, res) => {
    try {
      const { id } = req.params;

      const parchi = await Parchi.findById(id).lean();

      if (!parchi) {
        return res.status(404).json({
          success: false,
          message: 'Parchi not found.',
        });
      }

      const [chain, deductionCheck] = await Promise.all([
        ledgerService.verifyChain('parchi', String(id)).catch(() => null),
        Promise.resolve(
          analyticsService.checkParchiDeductions(parchi),
        ),
      ]);

      return res.status(200).json({
        success: true,
        parchi: {
          parchiNumber: parchi.parchiNumber,
          status: parchi.status,
          paymentStatus: parchi.paymentStatus,
          total: parchi.totalAmount || parchi.amount,
          deductions: parchi.deductions || parchi.commission,
          createdAt: parchi.createdAt,
        },
        chainValid: chain?.valid ?? null,
        chain,
        deductionCheck,
      });
    } catch (error) {
      console.error('Parchi Audit Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to audit parchi.',
      });
    }
  },
);

module.exports = router;