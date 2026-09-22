// ==========================================
// ANALYTICS SERVICE
// Sowing signals, glut engine, net
// realization, price trends/forecasts,
// credit scoring, pest & weather alerts,
// deduction-anomaly heuristics.
// ==========================================

const MarketPrice = require('../models/MarketPrice');
const Market = require('../models/Market');
const Crop = require('../models/Crop');
const Transaction = require('../models/Transaction');
const SaleListing = require('../models/SaleListing');
const Parchi = require('../models/Parchi');
const User = require('../models/User');
const cacheService = require('./cacheService');

// -------------------------------------------------
// Helpers
// -------------------------------------------------

const average = (values) => {
  const nums = values.filter((v) => Number.isFinite(Number(v)));

  if (!nums.length) {
    return 0;
  }

  return nums.reduce((s, v) => s + Number(v), 0) / nums.length;
};

// -------------------------------------------------
// SOWING SIGNAL / GLUT ENGINE
// Compare latest MSAMB price vs the trailing
// average. A sharp recent drop => "glut warning";
// sustained strength => "good sowing window".
// -------------------------------------------------

const getSowingSignals = async () => {
  const cached = await cacheService.get('analytics:sowing-signals');

  if (cached) {
    return cached;
  }

  const prices = await MarketPrice.find({})
    .sort({ priceDate: -1 })
    .limit(2000)
    .lean();

  // Market name lookup (MarketPrice.market is an ObjectId)
  const marketIds = [
    ...new Set(
      prices.map((p) => String(p.market)).filter(Boolean),
    ),
  ];
  const marketDocs = await Market.find({ _id: { $in: marketIds } })
    .select('name')
    .lean();
  const marketById = Object.fromEntries(
    marketDocs.map((m) => [String(m._id), m.name]),
  );

  const byCommodity = {};

  prices.forEach((p) => {
    const key = (p.commodity || '').toLowerCase();

    if (!key) {
      return;
    }

    if (!byCommodity[key]) {
      byCommodity[key] = [];
    }

    byCommodity[key].push({
      date: p.priceDate,
      price: p.modalPrice,
      market: marketById[String(p.market)] || '',
    });
  });

  const signals = Object.entries(byCommodity)
    .map(([commodity, points]) => {
      points.sort((a, b) => new Date(a.date) - new Date(b.date));

      const recent = points.slice(-3);
      const older = points.slice(0, Math.max(1, points.length - 3));

      const recentAvg = average(recent.map((r) => r.price));
      const olderAvg = average(older.map((o) => o.price));
      const overallAvg = average(points.map((p) => p.price));

      const delta = olderAvg
        ? ((recentAvg - olderAvg) / olderAvg) * 100
        : 0;

      let signal = 'NEUTRAL';
      let level = 'moderate';

      if (delta <= -8) {
        signal = 'GLUT_WARNING';
        level = 'warning';
      } else if (delta >= 8) {
        signal = 'GOOD_SOWING_WINDOW';
        level = 'good';
      } else if (delta <= -3) {
        signal = 'PRICE_DIP';
        level = 'caution';
      }

      return {
        commodity: commodity.charAt(0).toUpperCase() + commodity.slice(1),
        recentAvg: Math.round(recentAvg),
        olderAvg: Math.round(olderAvg),
        overallAvg: Math.round(overallAvg),
        deltaPercent: Math.round(delta * 10) / 10,
        signal,
        level,
        lastPrice: recent.length ? Math.round(recent[recent.length - 1].price) : 0,
        lastMarket: recent.length ? recent[recent.length - 1].market : '',
        points: points.slice(-10),
      };
    })
    .filter((s) => s.level !== 'moderate')
    .sort((a, b) => Math.abs(b.deltaPercent) - Math.abs(a.deltaPercent))
    .slice(0, 8);

  const result = { signals, computedAt: new Date().toISOString() };

  await cacheService.set('analytics:sowing-signals', result, 900);

  return result;
};

// -------------------------------------------------
// NET REALIZATION CALCULATOR
// Actual: income recorded (positive txn) minus
// expenses (negative txn) for a farmer. Also
// estimated: expected income from accepted bids.
// -------------------------------------------------

const getNetRealization = async (userId, role = 'farmer') => {
  const transactions = await Transaction.find({ user: userId }).lean();

  let income = 0;
  let expense = 0;

  transactions.forEach((t) => {
    const amount = Number(t.amount) || 0;
    const tp = String(t.type || t.category || '').toLowerCase();

    if (
      amount > 0 &&
      (tp === 'income' || tp === 'credit' || tp === 'sale')
    ) {
      income += amount;
    } else if (
      amount < 0 ||
      tp === 'expense' || tp === 'debit'
    ) {
      expense += Math.abs(amount);
    } else if (amount > 0) {
      income += amount;
    }
  });

  const soldCopies = await SaleListing.find({
    status: { $in: ['open', 'active'] },
    ...(role === 'farmer' ? { farmer: userId } : {}),
  }).countDocuments();

  const expected = role === 'farmer'
    ? await SaleListing.aggregate([
        { $match: { farmer: userId, status: { $in: ['open', 'active'] } } },
        { $group: { _id: null, total: { $sum: '$expectedPrice' } } },
      ])
    : [];

  const net = income - expense;

  return {
    income: Math.round(income),
    expense: Math.round(expense),
    net: Math.round(net),
    openSaleListings: soldCopies,
    expectedRealization: expected.length
      ? Math.round(expected[0].total || 0)
      : 0,
  };
};

// -------------------------------------------------
// PRICE TRENDS & FORECAST (linear regression)
// -------------------------------------------------

const getPriceTrend = async ({ commodity, market, days = 30 }) => {
  const key = `analytics:trend:${commodity}:${market || 'all'}:${days}`;
  const cached = await cacheService.get(key);

  if (cached) {
    return cached;
  }

  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const query = {
    commodity: new RegExp(`^${commodity}$`, 'i'),
    priceDate: { $gte: since },
  };

  if (market) {
    const marketDocs = await Market.find({
      name: new RegExp(market, 'i'),
    })
      .select('_id name')
      .lean();

    query.market = { $in: marketDocs.map((m) => m._id) };
  }

  const points = await MarketPrice.find(query)
    .sort({ priceDate: 1 })
    .lean();

  // Market name lookup (MarketPrice.market is an ObjectId)
  const marketIds = [
    ...new Set(
      points.map((p) => String(p.market)).filter(Boolean),
    ),
  ];
  const marketDocs = await Market.find({ _id: { $in: marketIds } })
    .select('name')
    .lean();
  const marketById = Object.fromEntries(
    marketDocs.map((m) => [String(m._id), m.name]),
  );

  const series = points.map((p) => ({
    date: p.priceDate,
    price: Number(p.modalPrice),
    market: marketById[String(p.market)] || '',
  }));

  // Simple linear regression forecast (next 7 days)
  let forecast = null;

  if (series.length >= 3) {
    const xs = series.map((_, i) => i);
    const ys = series.map((p) => p.price);
    const n = xs.length;
    const meanX = average(xs);
    const meanY = average(ys);
    const slope =
      xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0) /
      xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
    const intercept = meanY - slope * meanX;

    forecast = Array.from({ length: 7 }, (_, i) => ({
      day: i + 1,
      price: Math.round(intercept + slope * (n + i)),
    }));
  }

  const result = {
    commodity,
    market: market || 'All markets',
    series,
    latest: series.length ? series[series.length - 1].price : 0,
    min: series.length ? Math.min(...series.map((p) => p.price)) : 0,
    max: series.length ? Math.max(...series.map((p) => p.price)) : 0,
    avg: Math.round(average(series.map((p) => p.price))),
    forecast,
    computedAt: new Date().toISOString(),
  };

  await cacheService.set(key, result, 1800);

  return result;
};

// -------------------------------------------------
// CREDIT SCORING (heuristic, 0-100)
// -------------------------------------------------

const getCreditScore = async (userId) => {
  const key = `analytics:credit:${userId}`;
  const cached = await cacheService.get(key);

  if (cached) {
    return cached;
  }

  const [user, transactions, parchis, ratings, crops] = await Promise.all([
    User.findById(userId).lean(),
    Transaction.find({ user: userId }).countDocuments(),
    Parchi.find({
      $or: [{ farmer: userId }, { trader: userId }],
    }).lean(),
    null,
    Crop.find({ owner: userId }).countDocuments(),
  ]);

  let score = 20;

  // Identity/activity
  if (user?.isVerified) score += 10;
  if (crops >= 1) score += 10;
  if (transactions >= 1) score += 15;
  if (parchis.length >= 1) score += 15;

  // Settlement reliability
  const completed = parchis.filter(
    (p) => p.paymentStatus === 'completed' || p.status === 'completed',
  ).length;

  const settled = parchis.filter(
    (p) => p.paymentStatus === 'payment-confirmed',
  ).length;

  if (parchis.length) {
    score += Math.round((completed / parchis.length) * 10);
    score += Math.round((settled / parchis.length) * 10);
  }

  const riskFlags = [];
  if (parchis.length >= 3 && completed / parchis.length < 0.4) {
    riskFlags.push('Low settlement rate');
  }

  const grade = score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D';

  const result = {
    score,
    grade,
    riskFlags,
    factors: {
      verified: Boolean(user?.isVerified),
      crops,
      transactions,
      parchis: parchis.length,
      completedSettlements: completed,
    },
  };

  await cacheService.set(key, result, 3600);

  return result;
};

// -------------------------------------------------
// PEST & WEATHER ALERTS (rule based)
// -------------------------------------------------

const getWeatherAlerts = ({ weather, crop = '' }) => {
  const alerts = [];

  if (!weather || typeof weather !== 'object') {
    return alerts;
  }

  const temp = weather.temperature || weather.temp;
  const humidity = weather.humidity;
  const rain = weather.rain || 0;

  if (temp !== undefined && temp > 38) {
    alerts.push({
      level: 'warning',
      title: 'Heat stress risk',
      body: `Temperature at ${temp}°C — irrigate during cooler hours and mulch to retain moisture.`,
    });
  }

  if (temp !== undefined && temp < 8) {
    alerts.push({
      level: 'warning',
      title: 'Cold / frost risk',
      body: `Temperature at ${temp}°C — protect young seedlings with covers.`,
    });
  }

  if (humidity !== undefined && humidity > 85) {
    alerts.push({
      level: 'caution',
      title: 'High humidity — fungal risk',
      body: 'Watch for blight and powdery mildew. Avoid overhead irrigation in evenings.',
    });
  }

  if (rain !== undefined && rain > 20) {
    alerts.push({
      level: 'caution',
      title: 'Heavy rain expected',
      body: `${rain} mm forecast — delay harvesting and spraying; plan drainage.`,
    });
  }

  return alerts;
};

// -------------------------------------------------
// PARCHI DEDUCTION ANOMALY CHECK
// Compare recorded deductions/commission vs an
// expected reference (state floor of 1-2%) and
// flag outliers for admin review.
// -------------------------------------------------

const checkParchiDeductions = (parchi) => {
  const flags = [];

  if (!parchi) {
    return { ok: true, flags };
  }

  const total = Number(parchi.totalAmount || parchi.amount || 0);
  const deductions = Number(parchi.deductions || parchi.commission || 0);

  if (total > 0) {
    const ratio = (deductions / total) * 100;

    if (ratio > 5) {
      flags.push({
        severity: 'high',
        code: 'DEDUCTION_ANOMALY',
        message: `Commission/deductions at ${Math.round(ratio * 10) / 10}% of sale value (reference: 1-2%).`,
        ratio: Math.round(ratio * 10) / 10,
      });
    } else if (ratio > 3) {
      flags.push({
        severity: 'medium',
        code: 'DEDUCTION_ABOVE_REFERENCE',
        message: `Commission/deductions at ${Math.round(ratio * 10) / 10}% — above the usual 1-2% reference.`,
        ratio: Math.round(ratio * 10) / 10,
      });
    }
  }

  // Unusually round numbers stripped from a sale are suspicious
  if (
    deductions > 0 &&
    Number.isInteger(deductions) &&
    total > 0 &&
    deductions === total
  ) {
    flags.push({
      severity: 'high',
      code: 'DEDUCTION_EQUALS_VALUE',
      message: 'Recorded deductions equal the full sale value.',
    });
  }

  return { ok: flags.length === 0, flags };
};

// -------------------------------------------------
// DISTRICT COVERAGE (statewide overlay)
// -------------------------------------------------

const getStatewideCoverage = async () => {
  const cached = await cacheService.get('analytics:coverage');

  if (cached) {
    return cached;
  }

  // Grabbing Market model lazily to avoid circular import at top-level.
  const Market = require('../models/Market');

  const marketByDistrict = await Market.aggregate([
    { $group: { _id: '$district', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const farmerByDistrict = await User.aggregate([
    { $match: { role: 'farmer' } },
    { $group: { _id: '$location.district', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const result = {
    marketsByDistrict: marketByDistrict.map((m) => ({
      district: m._id || 'Unknown',
      count: m.count,
    })),
    farmersByDistrict: farmerByDistrict.map((f) => ({
      district: f._id || 'Unknown',
      count: f.count,
    })),
    computedAt: new Date().toISOString(),
  };

  await cacheService.set('analytics:coverage', result, 3600);

  return result;
};

module.exports = {
  getSowingSignals,
  getNetRealization,
  getPriceTrend,
  getCreditScore,
  getWeatherAlerts,
  checkParchiDeductions,
  getStatewideCoverage,
  average,
};