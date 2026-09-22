const express = require('express');

const {
  issueQrForEntity,
  verifyQr,
  getTimeline,
  getUserScans,
} = require('../services/traceService');

const Checkpoint = require('../models/Checkpoint');

const {
  protect,
  requireRole,
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
 * ==========================================
 * Authentication
 * ==========================================
 *
 * Every trace / QR endpoint requires login.
 */

router.use(protect);

/*
 * ==========================================
 * Issue QR for an entity
 * ==========================================
 *
 * POST
 * /api/trace/qr/issue
 *
 * Body:  { entityType, entityId }
 * Roles: farmer, trader, admin
 */

router.post(
  '/qr/issue',
  async (req, res) => {
    try {
      const { entityType, entityId } = req.body;

      if (!entityType || !entityId) {
        return res.status(400).json({
          success: false,
          message: 'entityType and entityId are required.',
        });
      }

      const issued = await issueQrForEntity({
        entityType,
        entityId,
      });

      return res.status(200).json({
        success: true,
        ...issued,
      });
    } catch (error) {
      console.error('QR Issue Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to issue QR.',
      });
    }
  },
);

/*
 * ==========================================
 * Verify a QR token
 * ==========================================
 *
 * Logs a trace checkpoint when a user scans.
 *
 * POST
 * /api/trace/qr/verify
 *
 * Body:
 * {
 *   token,
 *   location?, notes?, syncId?
 * }
 */

router.post(
  '/qr/verify',
  async (req, res) => {
    try {
      const {
        token,
        location,
        notes,
        syncId,
      } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'QR token is required.',
        });
      }

      const result = await verifyQr({
        token,
        scannedBy: req.user,
        location,
        notes,
        syncId,
      });

      if (!result.verified) {
        return res.status(400).json({
          success: false,
          message: `QR verification failed: ${result.reason}`,
          reason: result.reason,
        });
      }

      return res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('QR Verify Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to verify QR.',
      });
    }
  },
);

/*
 * ==========================================
 * Offline QR sync
 * ==========================================
 *
 * Bulk-append checkpoints captured while the
 * farmer was offline. Dedupes by syncId.
 *
 * POST
 * /api/trace/offline-sync
 *
 * Body: { checkpoints: [{ token, syncId, location, notes }] }
 */

router.post(
  '/offline-sync',
  async (req, res) => {
    try {
      const checkpoints = Array.isArray(req.body?.checkpoints)
        ? req.body.checkpoints
        : [];

      if (!checkpoints.length) {
        return res.status(400).json({
          success: false,
          message: 'No checkpoints to sync.',
        });
      }

      const results = [];

      for (const entry of checkpoints.slice(0, 200)) {
        const existing = entry.syncId
          ? await Checkpoint.findOne({ syncId: entry.syncId }).lean()
          : null;

        if (existing) {
          results.push({ syncId: entry.syncId, synced: true, duplicate: true });
          continue;
        }

        const { token, location, notes, syncId } = entry;

        try {
          await verifyQr({
            token,
            scannedBy: req.user,
            location,
            notes,
            syncId,
          });

          results.push({ syncId, synced: true, duplicate: false });
        } catch (err) {
          results.push({ syncId, synced: false, error: err.message });
        }
      }

      return res.status(200).json({
        success: true,
        synced: results.filter((r) => r.synced).length,
        failed: results.filter((r) => !r.synced).length,
        results,
      });
    } catch (error) {
      console.error('Offline Sync Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to sync offline checkpoints.',
      });
    }
  },
);

/*
 * ==========================================
 * Trace timeline for an entity
 * ==========================================
 *
 * Checkpoints + hash-chain ledger + integrity
 * status for one crop / listing / parchi / etc.
 *
 * GET
 * /api/trace/:entityType/:entityId
 */

router.get(
  '/:entityType/:entityId',
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;

      const timeline = await getTimeline({ entityType, entityId });

      return res.status(200).json({
        success: true,
        ...timeline,
      });
    } catch (error) {
      console.error('Timeline Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load trace timeline.',
      });
    }
  },
);

/*
 * ==========================================
 * My scans
 * ==========================================
 *
 * GET
 * /api/trace/mine
 */

router.get(
  '/mine',
  async (req, res) => {
    try {
      const scans = await getUserScans(req.user._id);

      return res.status(200).json({
        success: true,
        count: scans.length,
        scans,
      });
    } catch (error) {
      console.error('My Scans Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load your scans.',
      });
    }
  },
);

module.exports = router;