const express = require('express');

const {
  getSowingSignals,
  getNetRealization,
  getPriceTrend,
  getCreditScore,
  getWeatherAlerts,
  getStatewideCoverage,
} = require('../services/analyticsService');

const {
  protect,
  requireRole,
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
 * ==========================================
 * Authentication
 * ==========================================
 */

router.use(protect);

/*
 * ==========================================
 * Dashboard analytics
 * ==========================================
 *
 * Sowing signals / glut engine + net
 * realization calculator for the user.
 *
 * GET
 * /api/analytics/dashboard
 */

router.get(
  '/dashboard',
  async (req, res) => {
    try {
      const source = req.query.source || 'live';

      const [signals, netRealization] = await Promise.all([
        source === 'demo'
          ? { signals: [], computedAt: new Date().toISOString(), demo: true }
          : getSowingSignals(),
        getNetRealization(req.user._id, req.user.role),
      ]);

      return res.status(200).json({
        success: true,
        signals,
        netRealization,
      });
    } catch (error) {
      console.error('Dashboard Analytics Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load dashboard analytics.',
      });
    }
  },
);

/*
 * ==========================================
 * Commodity price trend & forecast
 * ==========================================
 *
 * GET
 * /api/analytics/price-trend?commodity=Wheat&market=&days=30
 */

router.get(
  '/price-trend',
  async (req, res) => {
    try {
      const {
        commodity,
        market,
        days,
      } = req.query;

      if (!commodity) {
        return res.status(400).json({
          success: false,
          message: 'commodity is required.',
        });
      }

      const trend = await getPriceTrend({
        commodity,
        market: market || '',
        days: Number(days) || 30,
      });

      return res.status(200).json({
        success: true,
        ...trend,
      });
    } catch (error) {
      console.error('Price Trend Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load price trend.',
      });
    }
  },
);

/*
 * ==========================================
 * Credit score
 * ==========================================
 *
 * GET
 * /api/analytics/credit-score
 */

router.get(
  '/credit-score',
  async (req, res) => {
    try {
      const score = await getCreditScore(req.user._id);

      return res.status(200).json({
        success: true,
        ...score,
      });
    } catch (error) {
      console.error('Credit Score Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load credit score.',
      });
    }
  },
);

/*
 * ==========================================
 * Statewide coverage overlay
 * ==========================================
 *
 * Admin only.
 *
 * GET
 * /api/analytics/coverage
 */

router.get(
  '/coverage',
  requireRole('admin'),
  async (req, res) => {
    try {
      const coverage = await getStatewideCoverage();

      return res.status(200).json({
        success: true,
        ...coverage,
      });
    } catch (error) {
      console.error('Coverage Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to load coverage data.',
      });
    }
  },
);

/*
 * ==========================================
 * Pest & weather alert rules
 * ==========================================
 *
 * GET
 * /api/analytics/weather-alerts?temp=41&humidity=88&rain=25
 */

router.get(
  '/weather-alerts',
  async (req, res) => {
    try {
      const alerts = getWeatherAlerts({
        temperature: req.query.temp
          ? Number(req.query.temp)
          : undefined,
        humidity: req.query.humidity
          ? Number(req.query.humidity)
          : undefined,
        rain: req.query.rain
          ? Number(req.query.rain)
          : undefined,
      });

      return res.status(200).json({
        success: true,
        count: alerts.length,
        alerts,
      });
    } catch (error) {
      console.error('Weather Alerts Error:', error);

      return res.status(500).json({
        success: false,
        message: 'Unable to evaluate weather alerts.',
      });
    }
  },
);

module.exports = router;