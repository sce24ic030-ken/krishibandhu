const express = require('express');

const {
  getMarketGlut,
} = require('../controllers/marketGlutController');

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Glut Engine — Mandi arrival intelligence
|--------------------------------------------------------------------------
|
| Examples:
|   GET /api/market-glut?commodity=Tomato
|   GET /api/market-glut?commodity=Tomato&market=6ab140ec74e8ec7a9a1c6be2
|   GET /api/market-glut?commodity=Tomato&date=2026-09-21
|
| Tells a farmer how many kg of their crop has ALREADY
| arrived in a market today, and whether that is a glut,
| normal, or thin-supply situation vs the recent average.
|--------------------------------------------------------------------------
*/

router.get('/', getMarketGlut);

module.exports = router;