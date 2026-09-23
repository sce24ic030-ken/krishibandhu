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

const round1 = (value) =>
  Math.round(value * 10) / 10;

/*
 * =========================================
 * Localization (en / mr / hi)
 * Verdict copy is generated server-side so it
 * matches the app language exactly.
 * =========================================
 */

const fmtIn = (value) =>
  Math.round(value || 0).toLocaleString('en-IN');

const L10N = {
  en: {
    level: {
      heavy_glut: 'Heavy supply',
      normal: 'Normal supply',
      thin_supply: 'Thin supply',
    },
    headline: (kg, crop, mkt) =>
      `Already ${kg} of ${crop} in ${mkt} today`,
    detail: (kg, crop, mkt, ratio, avg, levelLabel) => {
      const base = `${kg} kg of ${crop} has already arrived in ${mkt} today`;

      if (ratio !== null && avg) {
        return `${base}. That is ${ratio.toFixed(1)}x the recent daily average of ${fmtIn(avg)} kg — ${levelLabel.toLowerCase()}.`;
      }

      return `${base}. This is the first day in the ledger for this market (baseline forming).`;
    },
    priceNote: (modal, ratio, avgArrivalKg) => {
      if (!modal) {
        return 'No modal price recorded today.';
      }

      const m = fmtIn(modal);

      if (avgArrivalKg && ratio !== null) {
        if (ratio >= 1.5) {
          return `Modal ₹${m}/quintal — ${ratio}x of the recent daily arrival average; heavy supply is visibly pressing prices.`;
        }

        if (ratio <= 0.6) {
          return `Modal ₹${m}/quintal with only ${ratio}x of the usual arrivals — thin supply supports the price.`;
        }

        return `Modal ₹${m}/quintal — arrivals close to the recent average.`;
      }

      return `Modal ₹${m}/quintal today.`;
    },
    advice: {
      heavy_glut:
        'Arrivals are far above the recent average — expect strong price pressure. If you still deliver, the mandi ledger below is your record for a price dispute.',
      thin_supply:
        'Arrivals are low — prices have room to hold. Do not negotiate at the day-and-open rate until you confirm the modal price from the APMC board.',
      normal:
        'Supply is in line with recent days. Sell at the day\u2019s modal rate and keep the ledger screenshot as your price record.',
    },
  },
  mr: {
    level: {
      heavy_glut: 'जास्त पुरवठा',
      normal: 'सामान्य पुरवठा',
      thin_supply: 'कमी पुरवठा',
    },
    headline: (kg, crop, mkt) =>
      `आज ${mkt} मध्ये ${crop} चे ${kg} आधीच दाखल झाले आहे`,
    detail: (kg, crop, mkt, ratio, avg, levelLabel) => {
      const base = `${kg} किलो ${crop} आज ${mkt} मध्ये आधीच दाखल झाले आहे`;

      if (ratio !== null && avg) {
        return `${base}. हे अलीकडील सरासरी (${fmtIn(avg)} किलो) च्या ${ratio.toFixed(1)}x इतके आहे — ${levelLabel}.`;
      }

      return `${base}. या मंडईसाठी नोंदवहीतील हा पहिला दिवस आहे (आधार तयार होत आहे).`;
    },
    priceNote: (modal, ratio, avgArrivalKg) => {
      if (!modal) {
        return 'आज मॉडेल भाव नोंदवला गेला नाही.';
      }

      const m = fmtIn(modal);

      if (avgArrivalKg && ratio !== null) {
        if (ratio >= 1.5) {
          return `मॉडेल भाव ₹${m}/क्विंटल — अलीकडील सरासरी आवकच्या ${ratio}x; जास्त पुरवठा किमतीवर दबाव आणत आहे.`;
        }

        if (ratio <= 0.6) {
          return `मॉडेल भाव ₹${m}/क्विंटल, नेहमीच्या आवकच्या केवळ ${ratio}x — कमी पुरवठ्यामुळे किंमत टिकून आहे.`;
        }

        return `मॉडेल भाव ₹${m}/क्विंटल — आवक अलीकडील सरासरीच्या जवळ आहे.`;
      }

      return `आज मॉडेल भाव ₹${m}/क्विंटल.`;
    },
    advice: {
      heavy_glut:
        'आवक अलीकडील सरासरीपेक्षा खूप जास्त आहे — किमतीवर तीव्र दबाव अपेक्षित. तरीही पुरवठा करत असल्यास, खालील मंडई नोंदवही तुमच्या दर-विवादासाठी पुरावा आहे.',
      thin_supply:
        'आवक कमी आहे — किमती टिकण्यासाठी जागा आहे. APMC मंडळाकडून मॉडेल भाव निश्चित होईपर्यंत दिवसाच्या सुरुवातीच्या दरावर वाटाघाट करू नका.',
      normal:
        'पुरवठा अलीकडील दिवसांप्रमाणे आहे. दिवसाच्या मॉडेल दराने विक्री करा आणि नोंदवहीचा स्क्रीनशॉट किंमत-पुरावा म्हणून जतन करा.',
    },
  },
  hi: {
    level: {
      heavy_glut: 'भारी आपूर्ति',
      normal: 'सामान्य आपूर्ति',
      thin_supply: 'कम आपूर्ति',
    },
    headline: (kg, crop, mkt) =>
      `आज ${mkt} में ${crop} के ${kg} पहले ही आ चुके हैं`,
    detail: (kg, crop, mkt, ratio, avg, levelLabel) => {
      const base = `${kg} किलो ${crop} आज ${mkt} में पहले ही आ चुके हैं`;

      if (ratio !== null && avg) {
        return `${base}. यह हाल की औसत (${fmtIn(avg)} किलो) का ${ratio.toFixed(1)}x है — ${levelLabel}।`;
      }

      return `${base}. इस मंडी के रिकॉर्ड में यह पहला दिन है (आधार बन रहा है)।`;
    },
    priceNote: (modal, ratio, avgArrivalKg) => {
      if (!modal) {
        return 'आज मॉडल भाव दर्ज नहीं हुआ।';
      }

      const m = fmtIn(modal);

      if (avgArrivalKg && ratio !== null) {
        if (ratio >= 1.5) {
          return `मॉडल भाव ₹${m}/क्विंटल — हाल की औसत आवक का ${ratio}x; भारी आपूर्ति कीमतों पर दबाव डाल रही है।`;
        }

        if (ratio <= 0.6) {
          return `मॉडल भाव ₹${m}/क्विंटल, सामान्य आवक का केवल ${ratio}x — कम आपूर्ति कीमत को थाम रही है।`;
        }

        return `मॉडल भाव ₹${m}/क्विंटल — आवक हाल की औसत के करीब है।`;
      }

      return `आज मॉडल भाव ₹${m}/क्विंटल।`;
    },
    advice: {
      heavy_glut:
        'आवक हाल की औसत से काफी अधिक है — कीमतों पर मजबूत दबाव की उम्मीद है। फिर भी आपूर्ति करते हैं तो नीचे दी गई मंडी रिकॉर्ड कीमत विवाद के लिए आपका सबूत है।',
      thin_supply:
        'आवक कम है — कीमतें टिक सकती हैं। APMC बोर्ड से मॉडल भाव की पुष्टि से पहले शुरुआती दर पर सौदा न करें।',
      normal:
        'आपूर्ति हाल के दिनों के अनुरूप है। दिन के मॉडल भाव पर बेचें और कीमत रिकॉर्ड के लिए दर्ज रिकॉर्ड का स्क्रीनशॉट रखें।',
    },
  },
};

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
    const {
      commodity,
      market,
      date,
      lang,
    } = req.query;

    const locale =
      lang === 'mr' || lang === 'hi'
        ? L10N[lang]
        : L10N.en;

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
          locale.level[
            ratio === null
              ? 'normal'
              : levelForRatio(ratio)
          ],
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
          priceNote: locale.priceNote(
            modal,
            ratio,
            avgArrivalKg,
          ),
          headline: locale.headline(
            formatKg(arrivalKg, 'kg'),
            commodityName,
            marketInfo.name,
          ),
          detail: locale.detail(
            fmtIn(arrivalKg),
            commodityName,
            marketInfo.name,
            ratio,
            avgArrivalKg,
            targetRow.levelLabel,
          ),
          advice: locale.advice[targetRow.level],
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

module.exports = {
  getMarketGlut,
};