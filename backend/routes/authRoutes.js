const express = require('express');

const {
  register,
  login,
  getMe,
  refreshAccessToken,
  logout,
} = require('../controllers/authController');

const {
  protect,
  requireRole,
} = require('../middleware/authMiddleware');

const router = express.Router();

// ==========================================
// PUBLIC ROUTES
// ==========================================

router.post('/register', register);

router.post('/login', login);

router.post('/refresh', refreshAccessToken);

router.post('/logout', logout);

// ==========================================
// AUTHENTICATED ROUTES
// ==========================================

router.get('/me', protect, getMe);

// ==========================================
// ROLE TEST ROUTES
// ==========================================

// Farmer only
router.get(
  '/farmer',
  protect,
  requireRole('farmer'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Farmer access granted.',
      role: req.user.role,
      user: req.user.name,
    });
  },
);

// Trader only
router.get(
  '/trader',
  protect,
  requireRole('trader'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Trader access granted.',
      role: req.user.role,
      user: req.user.name,
    });
  },
);

// Admin only
router.get(
  '/admin',
  protect,
  requireRole('admin'),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Admin access granted.',
      role: req.user.role,
      user: req.user.name,
    });
  },
);

module.exports = router;