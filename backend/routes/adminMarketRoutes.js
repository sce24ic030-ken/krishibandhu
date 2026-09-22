const express = require('express');

const {
  getAdminMarkets,
  getAdminMarketStats,
  getAdminMarketById,
  updateMarketVerification,
  deleteAdminMarket,
} = require('../controllers/adminMarketController');

const {
  protect,
  requireRole,
} = require('../middleware/authMiddleware');

const {
  syncMSAMBPrices,
} = require('../services/marketPriceService');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| All Admin Market routes require Admin access
|--------------------------------------------------------------------------
*/

router.use(
  protect,
  requireRole('admin'),
);

/*
|--------------------------------------------------------------------------
| Trigger official MSAMB ledger sync
|--------------------------------------------------------------------------
|
| POST /api/admin/markets/sync-prices
|
| Fetches the official MSAMB daily rate sheet and replaces
| the daily snapshot for every market we track. This keeps
| the Glut Engine (arrival intelligence) on real data.
|--------------------------------------------------------------------------
*/

router.post(
  '/sync-prices',
  async (req, res) => {
    try {
      const result = await syncMSAMBPrices();

      return res.status(200).json({
        success: true,
        message: 'MSAMB ledger sync completed.',
        ...result,
      });
    } catch (error) {
      console.error(
        'MSAMB sync error:',
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          'MSAMB sync failed.',
      });
    }
  },
);

/*
|--------------------------------------------------------------------------
| Market Statistics
|--------------------------------------------------------------------------
*/

router.get(
  '/stats',
  getAdminMarketStats,
);

/*
|--------------------------------------------------------------------------
| Get All Markets
|--------------------------------------------------------------------------
|
| Supports:
| ?search=Lasalgaon
| ?district=Nashik
| ?status=pending
| ?status=verified
| ?status=rejected
| ?source=MSAMB
| ?source=user_submitted
|
|--------------------------------------------------------------------------
*/

router.get(
  '/',
  getAdminMarkets,
);

/*
|--------------------------------------------------------------------------
| Get Single Market
|--------------------------------------------------------------------------
*/

router.get(
  '/:id',
  getAdminMarketById,
);

/*
|--------------------------------------------------------------------------
| Verify / Reject User-Submitted Market
|--------------------------------------------------------------------------
*/

router.patch(
  '/:id/verification',
  updateMarketVerification,
);

/*
|--------------------------------------------------------------------------
| Delete User-Submitted Market
|--------------------------------------------------------------------------
*/

router.delete(
  '/:id',
  deleteAdminMarket,
);

module.exports = router;