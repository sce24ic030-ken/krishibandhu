const MarketPrice = require('../models/MarketPrice');

/*
 * =========================================
 * Glut Engine — Mandi arrival intelligence
 * =========================================
 *
 * For a commodity (+ optional market + date), we answer:
 *   "How much of this crop has ALREADY arrived in this
 *    market today, and is that a lot or a little vs the
 *    recent daily average?"
 *
 * Data source: official MSAMB arrival ledgers synced into
 * MarketPrice (arrivalQuantity + unit + prices per day).
 *
 * This gives farmers a data-backed answer to the fairness
 * question behind the SIH grievance process — if the price
 * at their market collapsed while arrivals are thin, that is
 * a legitimate dispute signal worth recording.
 */

const UNIT_KG = {
  quintal: 100,
  ton: 1000,
  kg: 1,
};

const unitToKg = (quantity, unit) => {
  const factor =
    UNIT_KG[String(unit || 'quintal').toLowerCase()] ||
    100;

  return Number(quantity || 0) * factor;
};

const toDateStr = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Records are stored as UTC midnight of the ledger
  // date, so the UTC day string is the ledger day.
  return date.toISOString().slice(0, 10);
};

const levelForRatio = (ratio) => {
  if (ratio >= 1.5) {
    return 'heavy_glut';
  }

  if (ratio <= 0.6) {
    return 'thin_supply';
  }

  return 'normal';
};

const ratioToLabel = (ratio) => {
  if (ratio >= 1.5) {
    return 'Heavy supply';
  }

  if (ratio <= 0.6) {
    return 'Thin supply';
  }

  return 'Normal supply';
};

const round1 = (value) =>
  Math.round(value * 10) / 10;

/*
 * =========================================
 * GET /api/market-glut
 * =========================================
 * Query:
 *   commodity  - required (name, case-insensitive)
 *   market     - optional market _id (specific verdict)
 *   date       - optional YYYY-MM-DD (default: today)
 */

const getMarketGlut = async (req, res) => {
  try {
    const { commodity, market, date } = req.query;

    if (!commodity || !commodity.trim()) {
      return res.status(400).json({
        success: false,
        message:
          'commodity is required, e.g. /api/market-glut?commodity=Tomato',
      });
    }

    const commodityName = commodity.trim();

    const requested =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? new Date(`${date}T00:00:00`)
        : new Date();

    const commodityFilter = {
      commodity: {
        $regex: commodityName,
        $options: 'i',
      },
    };

    // Latest ledger date available for this commodity.
    const latest =
      await MarketPrice.findOne({
        ...commodityFilter,
        priceDate: { $lte: requested },
      })
        .sort({ priceDate: -1 })
        .populate('market');

    if (!latest) {
      return res.status(200).json({
        success: true,
        data: {
          commodity: commodityName,
          asOfDate: null,
          hasTodayData: false,
          isStale: false,
          markets: [],
          bestMarket: null,
          target: null,
          totals: {
            marketsReported: 0,
            totalArrivalKg: 0,
          },
        },
      });
    }

    const effective = toDateStr(latest.priceDate);

    const records = await MarketPrice.find({
      ...commodityFilter,
      priceDate: { $lte: requested },
    }).populate('market');

    // =====================================
    // Aggregate by market
    // =====================================

    const byMarket = new Map();

    for (const record of records) {
      const marketDoc = record.market;

      if (!marketDoc) {
        continue;
      }

      const marketId = String(marketDoc._id);
      const day = toDateStr(record.priceDate);

      if (!byMarket.has(marketId)) {
        byMarket.set(marketId, {
          market: marketDoc,
          today: {
            arrivalKg: 0,
            modalWeighted: 0,
            records: 0,
            varieties: [],
          },
          history: new Map(), // day -> { arrivalKg, modalWeighted }
        });
      }

      const entry = byMarket.get(marketId);
      const kg = unitToKg(
        record.arrivalQuantity,
        record.unit,
      );

      if (day === effective) {
        entry.today.arrivalKg += kg;
        entry.today.modalWeighted +=
          kg * Number(record.modalPrice || 0);
        entry.today.records += 1;
        entry.today.varieties.push({
          variety: record.variety || '—',
          quantity: record.arrivalQuantity ?? null,
          unit: record.unit || 'quintal',
          modalPrice: record.modalPrice ?? null,
        });
      } else if (day) {
        const prior = entry.history.get(day) || {
          arrivalKg: 0,
          modalWeighted: 0,
        };

        prior.arrivalKg += kg;
        prior.modalWeighted +=
          kg * Number(record.modalPrice || 0);

        entry.history.set(day, prior);
      }
    }

    if (byMarket.size === 0) {
      return res.status(200).json({
        success: true,
        data: {
          commodity: commodityName,
          asOfDate: effective,
          hasTodayData: false,
          isStale: toDateStr(new Date()) !== effective,
          markets: [],
          bestMarket: null,
          target: null,
          totals: {
            marketsReported: 0,
            totalArrivalKg: 0,
          },
        },
      });
    }

    // =====================================
    // Build market snapshot rows
    // =====================================

    const snapshotRows = [];
    let totalArrivalKg = 0;

    for (const entry of byMarket.values()) {
      const { market, today, history } = entry;

      if (today.records === 0) {
        continue;
      }

      const arrivalKg = today.arrivalKg;
      const modal =
        arrivalKg > 0
          ? today.modalWeighted / arrivalKg
          : 0;

      totalArrivalKg += arrivalKg;

      // History average over distinct prior days.
      let avgArrivalKg = null;
      let ratio = null;

      if (history.size > 0) {
        const days = Array.from(history.values());

        avgArrivalKg =
          days.reduce(
            (sum, day) => sum + day.arrivalKg,
            0,
          ) / days.length;

        if (avgArrivalKg > 0) {
          ratio = arrivalKg / avgArrivalKg;
        }
      }

      snapshotRows.push({
        market: {
          _id: String(market._id),
          name: market.name,
          district: market.district,
        },
        arrivalKg,
        modal,
        records: today.records,
        varieties: today.varieties,
        avgArrivalKg,
        ratio: ratio === null ? null : round1(ratio),
        level:
          ratio === null
            ? 'normal'
            : levelForRatio(ratio),
        levelLabel:
          ratio === null
            ? 'Normal supply'
            : ratioToLabel(ratio),
      });
    }

    snapshotRows.sort(
      (a, b) => b.modal - a.modal,
    );

    const bestMarket =
      snapshotRows.length > 0
        ? snapshotRows[0]
        : null;

    // =====================================
    // Optional specific-market verdict
    // =====================================

    let target = null;

    if (market && market.trim()) {
      const targetRow = snapshotRows.find(
        (row) => row.market._id === market.trim(),
      );

      if (targetRow) {
        const {
          market: marketInfo,
          arrivalKg,
          modal,
          avgArrivalKg,
          ratio,
          varieties,
        } = targetRow;

        target = {
          market: marketInfo,
          asOfDate: effective,
          arrivalKg,
          modal,
          records: targetRow.records,
          varieties: varieties.slice(0, 4),
          avgArrivalKg,
          ratio,
          level: targetRow.level,
          levelLabel: targetRow.levelLabel,
          priceNote: buildPriceNote(
            modal,
            avgArrivalKg,
            ratio,
            snapshotRows,
          ),
          headline: `Already ${formatKg(arrivalKg, 'kg')} of ${commodityName} in ${marketInfo.name} today`,
          detail: buildDetail(
            commodityName,
            marketInfo.name,
            arrivalKg,
            avgArrivalKg,
            ratio,
            targetRow.levelLabel,
          ),
          advice:
            targetRow.level === 'heavy_glut'
              ? 'Arrivals are far above the recent average — expect strong price pressure. If you still deliver, the mandi ledger below is your record for a price dispute.'
              : targetRow.level === 'thin_supply'
                ? 'Arrivals are low — prices have room to hold. Do not negotiate at the day-and-open rate until you confirm the modal price from the APMC board.'
                : 'Supply is in line with recent days. Sell at the day\u2019s modal rate and keep the ledger screenshot as your price record.',
        };
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        commodity: commodityName,
        asOfDate: effective,
        hasTodayData: true,
        isStale: toDateStr(new Date()) !== effective,
        markets: snapshotRows,
        bestMarket,
        target,
        totals: {
          marketsReported: snapshotRows.length,
          totalArrivalKg,
        },
      },
    });
  } catch (error) {
    console.error('Glut engine error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to compute market glut.',
    });
  }
};

/* Helpers below are resolved at call time (function hoisting). */

function formatKg(kgValue, label) {
  return `${Math.round(kgValue).toLocaleString('en-IN')} ${label}`;
}

function buildPriceNote(modal, avgArrivalKg, ratio, rows) {
  if (!modal) {
    return 'No modal price recorded today.';
  }

  const parts = [];

  if (avgArrivalKg && ratio !== null) {
    if (ratio >= 1.5) {
      parts.push(
        `Modal ₹${Math.round(modal).toLocaleString('en-IN')}/quintal — ${ratio}x of the recent daily arrival average; heavy supply is visibly pressing prices.`,
      );
    } else if (ratio <= 0.6) {
      parts.push(
        `Modal ₹${Math.round(modal).toLocaleString('en-IN')}/quintal with only ${ratio}x of the usual arrivals — thin supply supports the price.`,
      );
    } else {
      parts.push(
        `Modal ₹${Math.round(modal).toLocaleString('en-IN')}/quintal — arrivals close to the recent average.`,
      );
    }
  } else {
    parts.push(
      `Modal ₹${Math.round(modal).toLocaleString('en-IN')}/quintal today.`,
    );
  }

  return parts.join(' ');
}

function buildDetail(
  commodityName,
  marketName,
  arrivalKg,
  avgArrivalKg,
  ratio,
  levelLabel,
) {
  const base = `${Math.round(arrivalKg).toLocaleString('en-IN')} kg of ${commodityName} has already arrived in ${marketName} today`;

  if (avgArrivalKg && ratio !== null) {
    return `${base}. That is ${ratio.toFixed(1)}x the recent daily average of ${Math.round(avgArrivalKg).toLocaleString('en-IN')} kg — ${levelLabel.toLowerCase()}.`;
  }

  return `${base}. This is the first day in the ledger for this market (baseline forming).`;
}

module.exports = {
  getMarketGlut,
};