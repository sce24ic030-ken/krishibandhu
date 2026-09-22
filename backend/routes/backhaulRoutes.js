const express = require('express');

const {
  getAvailableBackhaul,
  getMyBackhaul,
  getAllBackhaul,
  createBackhaul,
  selectTraderTransport,
  updateBackhaulStatus,
  cancelBackhaul,
} = require('../controllers/backhaulController');

const {
  protect,
  requireRole,
} = require('../middleware/authMiddleware');

const router =
  express.Router();

/* =========================================================
   Authentication
========================================================= */

router.use(protect);

/* =========================================================
   GET AVAILABLE TRADER TRANSPORT
========================================================= */

router.get(
  '/',
  getAvailableBackhaul,
);

/* =========================================================
   GET MY TRANSPORT RECORDS
========================================================= */

router.get(
  '/mine',
  getMyBackhaul,
);

/* =========================================================
   GET ALL TRANSPORT RECORDS (ADMIN)
========================================================= */

router.get(
  '/admin/all',
  requireRole('admin'),
  getAllBackhaul,
);

/* =========================================================
   CREATE OWN / TRADER TRANSPORT
========================================================= */

router.post(
  '/',
  requireRole(
    'farmer',
    'trader',
  ),
  createBackhaul,
);

/* =========================================================
   SELECT TRADER TRANSPORT
========================================================= */

router.post(
  '/:id/select',
  requireRole('farmer'),
  selectTraderTransport,
);

/* =========================================================
   UPDATE TRANSPORT STATUS
========================================================= */

router.patch(
  '/:id/status',
  requireRole(
    'farmer',
    'trader',
    'admin',
  ),
  updateBackhaulStatus,
);

/* =========================================================
   CANCEL TRANSPORT
========================================================= */

router.patch(
  '/:id/cancel',
  requireRole(
    'farmer',
    'trader',
    'admin',
  ),
  cancelBackhaul,
);

module.exports = router;