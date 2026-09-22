const {
  generateVision,
} = require('./visionService');

const Market = require('../models/Market');
const MarketPrice = require('../models/MarketPrice');

/* =========================================================
   GEMINI CROP ANALYSIS INSTRUCTIONS
========================================================= */

const CROP_ANALYSIS_INSTRUCTION = `
You are KrishiBandhu Crop Vision AI.

Analyze the uploaded crop or agricultural produce image.

Your assessment must focus ONLY on visible information.

Analyze:

- Likely crop/produce
- Visual quality
- Leaf condition if visible
- Fruit/produce condition if visible
- Visible color
- Visible size and shape
- Visible uniformity
- Visible damage
- Visible pest or disease indicators
- Visible spoilage
- Visible maturity indicators
- Practical recommendations

IMPORTANT:

- This is a visual assessment only.
- Do not claim laboratory-level accuracy.
- Do not claim soil quality.
- Do not claim nutrient levels.
- Do not claim pesticide residue.
- Do not claim actual yield.
- Do not claim internal produce quality that cannot be seen.
- Do not make a definitive disease diagnosis from an image alone.
- Use "possible", "may indicate", or "appears consistent with" when discussing diseases or pests.
- If the crop cannot be identified confidently, say so.
- If image quality is poor, say so.
- Do not invent observations.

QUALITY SCORE:

Give a visual quality score from 1 to 10.

1 = very poor visible condition
10 = excellent visible condition

The score represents ONLY visible quality in the uploaded image.

Return the response using exactly this structure:

CROP:
<crop name>

QUALITY SCORE:
<number>/10

OVERALL QUALITY:
<Excellent / Good / Fair / Poor / Unable to assess>

LEAF CONDITION:
<visual assessment>

FRUIT / PRODUCE CONDITION:
<visual assessment>

VISIBLE CONCERNS:
<visible concerns>

POSSIBLE ISSUES:
<possible pest, disease, spoilage or stress indicators>

RECOMMENDATIONS:
1. <recommendation>
2. <recommendation>
3. <recommendation>
4. <recommendation>

CONFIDENCE:
<High / Medium / Low>

NOTE:
This is a visual assessment from the uploaded image and is not a laboratory test or definitive disease diagnosis.
`;

/* =========================================================
   TEXT NORMALIZATION
========================================================= */

const normalizeText = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase();
};

/* =========================================================
   REGEX ESCAPE
========================================================= */

const escapeRegex = (value) => {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
};

/* =========================================================
   EXTRACT CROP NAME
========================================================= */

const extractCrop = (analysis) => {
  const match = analysis.match(
    /CROP:\s*([^\n]+)/i,
  );

  if (!match) {
    return null;
  }

  const crop = match[1]
    .trim()
    .replace(/^<|>$/g, '');

  if (
    !crop ||
    crop.toLowerCase().includes('unable')
  ) {
    return null;
  }

  return crop;
};

/* =========================================================
   EXTRACT QUALITY SCORE
========================================================= */

const extractQualityScore = (
  analysis,
) => {
  const match = analysis.match(
    /QUALITY SCORE:\s*(\d+(?:\.\d+)?)\s*\/\s*10/i,
  );

  if (!match) {
    return null;
  }

  const score = Number(match[1]);

  if (
    Number.isNaN(score) ||
    score < 1 ||
    score > 10
  ) {
    return null;
  }

  return score;
};

/* =========================================================
   CROP NAME → MSAMB COMMODITY
========================================================= */

/*
 * Gemini can return different descriptions
 * for the same crop.
 *
 * Examples:
 *
 * Red Onion
 * Red Onion (Allium cepa)
 * Red Onion (Harvested Bulbs)
 * Onion Bulbs
 *
 * All should map to:
 *
 * Onion
 */

const normalizeCropToCommodity = (
  crop,
) => {
  const normalizedCrop =
    normalizeText(crop);

  if (!normalizedCrop) {
    return null;
  }

  /*
   * Remove punctuation so matching is
   * more tolerant.
   *
   * Example:
   *
   * "Red Onion (Harvested Bulbs)"
   *
   * becomes approximately:
   *
   * "red onion harvested bulbs"
   */

  const simplifiedCrop =
    normalizedCrop
      .replace(/[()[\],.-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  console.log('');
  console.log(
    '🔎 Original AI crop:',
    crop,
  );

  console.log(
    '🔎 Normalized AI crop:',
    simplifiedCrop,
  );

  const cropAliases = [
    {
      keywords: [
        'red onion',
        'white onion',
        'yellow onion',
        'pink onion',
        'bulb onion',
        'onion bulb',
        'onion bulbs',
        'onion',
        'onions',
        'allium cepa',
      ],

      commodity: 'Onion',
    },

    {
      keywords: [
        'tomato',
        'tomatoes',
        'solanum lycopersicum',
      ],

      commodity: 'Tomato',
    },

    {
      keywords: [
        'potato',
        'potatoes',
        'potato tuber',
        'potato tubers',
        'solanum tuberosum',
      ],

      commodity: 'Potato',
    },

    {
      keywords: [
        'brinjal',
        'eggplant',
        'aubergine',
        'egg plants',
        'solanum melongena',
      ],

      commodity: 'Brinjal',
    },

    {
      keywords: [
        'cabbage',
        'cabbages',
        'brassica oleracea',
      ],

      commodity: 'Cabbage',
    },

    {
      keywords: [
        'cauliflower',
        'cauliflowers',
        'brassica oleracea botrytis',
      ],

      commodity: 'Cauliflower',
    },

    {
      keywords: [
        'capsicum',
        'capsicums',
        'bell pepper',
        'bell peppers',
        'green pepper',
        'green peppers',
        'shimla mirch',
      ],

      commodity: 'Chilly Capsicum',
    },

    {
      keywords: [
        'bottle gourd',
        'bottle gourds',
        'lauki',
        'calabash',
        'opo squash',
      ],

      commodity: 'Bottle gourd',
    },

    {
      keywords: [
        'pumpkin',
        'pumpkins',
        'squash',
        'cucurbita',
      ],

      commodity: 'Pumpkin',
    },

    {
      keywords: [
        'garlic',
        'garlic bulb',
        'garlic bulbs',
        'allium sativum',
      ],

      commodity: 'Garlic',
    },

    {
      keywords: [
        'ginger',
        'ginger rhizome',
        'ginger rhizomes',
        'zingiber officinale',
      ],

      commodity: 'Ginger(Green)',
    },

    {
      keywords: [
        'paddy',
        'paddy grain',
        'rice',
        'rice grain',
        'oryza sativa',
      ],

      commodity: 'Rice',
    },
  ];

  for (const alias of cropAliases) {
    const matched =
      alias.keywords.some(
        (keyword) =>
          simplifiedCrop.includes(
            keyword,
          ),
      );

    if (matched) {
      console.log(
        '✅ Database commodity:',
        alias.commodity,
      );

      return alias.commodity;
    }
  }

  console.log(
    '⚠️ No predefined crop mapping found.',
  );

  return crop;
};

/* =========================================================
   FIND MARKET
========================================================= */

const findMarket = async (
  marketId,
) => {
  if (!marketId) {
    console.log(
      '⚠️ No marketId supplied.',
    );

    return null;
  }

  const market =
    await Market.findOne({
      _id: marketId,
    }).select(
      '_id name district state location',
    );

  if (!market) {
    console.log(
      '⚠️ Market not found:',
      marketId,
    );

    return null;
  }

  console.log('');
  console.log(
    '📍 Selected Market:',
    market.name,
  );

  console.log(
    '📍 District:',
    market.district,
  );

  console.log(
    '📍 State:',
    market.state,
  );

  return market;
};

/* =========================================================
   FIND LATEST MARKET PRICE
========================================================= */

const findLatestMarketPrice = async ({
  market,
  crop,
}) => {
  if (!market || !crop) {
    return null;
  }

  const databaseCrop =
    normalizeCropToCommodity(
      crop,
    );

  if (!databaseCrop) {
    return null;
  }

  console.log('');
  console.log(
    '🔍 Searching market price...',
  );

  console.log(
    '🌱 Commodity:',
    databaseCrop,
  );

  console.log(
    '📍 Market ID:',
    market._id,
  );

  /*
   * First attempt:
   *
   * Exact commodity match.
   */

  const commodityRegex =
    new RegExp(
      `^${escapeRegex(
        databaseCrop,
      )}$`,
      'i',
    );

  let latestPrice =
    await MarketPrice.findOne({
      market: market._id,

      commodity:
        commodityRegex,
    })
      .sort({
        priceDate: -1,
      })
      .lean();

  /*
   * Second attempt:
   *
   * Case-insensitive exact
   * string comparison through
   * regex already handles case.
   *
   * If nothing was found, try
   * a broader commodity lookup.
   */

  if (!latestPrice) {
    console.log(
      '⚠️ Exact commodity match not found.',
    );

    console.log(
      '🔎 Trying broader commodity lookup...',
    );

    latestPrice =
      await MarketPrice.findOne({
        market: market._id,

        commodity: {
          $regex:
            escapeRegex(
              databaseCrop,
            ),

          $options: 'i',
        },
      })
        .sort({
          priceDate: -1,
        })
        .lean();
  }

  if (!latestPrice) {
    console.log(
      '❌ No market price found for:',
      databaseCrop,
    );

    /*
     * Helpful debugging:
     *
     * Show what commodities actually
     * exist for this market.
     */

    const availableCommodities =
      await MarketPrice.distinct(
        'commodity',
        {
          market: market._id,
        },
      );

    console.log(
      '📋 Available commodities:',
      availableCommodities.slice(
        0,
        50,
      ),
    );

    return null;
  }

  console.log('');
  console.log(
    '✅ Market price found!',
  );

  console.log(
    '🌱 Commodity:',
    latestPrice.commodity,
  );

  console.log(
    '📅 Date:',
    latestPrice.priceDate,
  );

  console.log(
    '💰 Minimum:',
    latestPrice.minimumPrice,
  );

  console.log(
    '💰 Modal:',
    latestPrice.modalPrice,
  );

  console.log(
    '💰 Maximum:',
    latestPrice.maximumPrice,
  );

  return latestPrice;
};

/* =========================================================
   CALCULATE INDICATIVE PRICE
========================================================= */

/*
 * IMPORTANT:
 *
 * This is an INDICATIVE estimate.
 *
 * It is NOT:
 *
 * - a guaranteed selling price
 * - an auction prediction
 * - a price guarantee
 *
 * It combines:
 *
 * 1. Visual quality score
 * 2. Latest MSAMB minimum price
 * 3. Latest MSAMB modal price
 * 4. Latest MSAMB maximum price
 */

const calculateIndicativePrice = ({
  minimumPrice,
  maximumPrice,
  modalPrice,
  qualityScore,
}) => {
  if (
    minimumPrice === undefined ||
    maximumPrice === undefined ||
    modalPrice === undefined ||
    qualityScore === null
  ) {
    return null;
  }

  let expectedMinimum;
  let expectedMaximum;

  /*
   * Quality 1–3
   */

  if (qualityScore <= 3) {
    expectedMinimum =
      minimumPrice;

    expectedMaximum =
      modalPrice;
  }

  /*
   * Quality 4–6
   */

  else if (qualityScore <= 6) {
    expectedMinimum =
      minimumPrice +
      (modalPrice -
        minimumPrice) *
        0.5;

    expectedMaximum =
      modalPrice;
  }

  /*
   * Quality 7–8
   */

  else if (qualityScore <= 8) {
    expectedMinimum =
      modalPrice;

    expectedMaximum =
      modalPrice +
      (maximumPrice -
        modalPrice) *
        0.7;
  }

  /*
   * Quality 9–10
   */

  else {
    expectedMinimum =
      modalPrice +
      (maximumPrice -
        modalPrice) *
        0.5;

    expectedMaximum =
      maximumPrice;
  }

  return {
    minimum: Math.round(
      expectedMinimum,
    ),

    maximum: Math.round(
      expectedMaximum,
    ),

    currency: 'INR',

    unit: 'quintal',

    methodology:
      'Indicative range based on visible quality score and the latest verified MSAMB minimum, maximum and modal market prices. It is not a guaranteed selling price.',
  };
};

/* =========================================================
   MAIN IMAGE ANALYSIS
========================================================= */

async function analyzeCropImage({
  imageBase64,
  mimeType,
  marketId,
}) {
  if (!imageBase64) {
    throw new Error(
      'Crop image data is required.',
    );
  }

  if (!mimeType) {
    throw new Error(
      'Image MIME type is required.',
    );
  }

  const supportedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];

  if (
    !supportedMimeTypes.includes(
      mimeType.toLowerCase(),
    )
  ) {
    throw new Error(
      'Unsupported image format. Please upload a JPEG, PNG, WebP, HEIC or HEIF image.',
    );
  }

  /* =======================================================
     GEMINI VISION — key rotation built in
  ======================================================= */

  const analysis =
    await generateVision({
      models: [
        'gemini-3.6-flash',
        'gemini-flash-latest',
      ],

      contents: [
        {
          role: 'user',

          parts: [
            {
              text:
                CROP_ANALYSIS_INSTRUCTION,
            },

            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
    });

  if (!analysis) {
    throw new Error(
      'Vision AI returned an empty crop analysis.',
    );
  }

  /* =======================================================
     EXTRACT AI DATA
  ======================================================= */

  const crop =
    extractCrop(analysis);

  const qualityScore =
    extractQualityScore(
      analysis,
    );

  console.log('');
  console.log(
    '========================================',
  );

  console.log(
    '🤖 Gemini Crop Analysis Complete',
  );

  console.log(
    '========================================',
  );

  console.log(
    '🌱 Crop:',
    crop,
  );

  console.log(
    '⭐ Quality:',
    qualityScore,
  );

  /* =======================================================
     MARKET PRICE
  ======================================================= */

  let marketData = null;

  if (marketId && crop) {
    try {
      const market =
        await findMarket(
          marketId,
        );

      if (market) {
        const marketPrice =
          await findLatestMarketPrice(
            {
              market,
              crop,
            },
          );

        if (marketPrice) {
          const indicativePrice =
            calculateIndicativePrice(
              {
                minimumPrice:
                  marketPrice.minimumPrice,

                maximumPrice:
                  marketPrice.maximumPrice,

                modalPrice:
                  marketPrice.modalPrice,

                qualityScore,
              },
            );

          marketData = {
            market: {
              id:
                market._id,

              name:
                market.name,

              district:
                market.district,

              state:
                market.state,
            },

            commodity:
              marketPrice.commodity,

            variety:
              marketPrice.variety ||
              null,

            unit:
              marketPrice.unit ||
              'quintal',

            minimumPrice:
              marketPrice.minimumPrice,

            maximumPrice:
              marketPrice.maximumPrice,

            modalPrice:
              marketPrice.modalPrice,

            priceDate:
              marketPrice.priceDate,

            source:
              marketPrice.source ||
              'MSAMB',

            indicativePrice,
          };

          console.log('');
          console.log(
            '========================================',
          );

          console.log(
            '💰 INDICATIVE PRICE CALCULATED',
          );

          console.log(
            '========================================',
          );

          console.log(
            'Market:',
            market.name,
          );

          console.log(
            'Commodity:',
            marketPrice.commodity,
          );

          console.log(
            'Quality:',
            `${qualityScore}/10`,
          );

          console.log(
            'Expected range:',
            `₹${indicativePrice.minimum} - ₹${indicativePrice.maximum} / ${indicativePrice.unit}`,
          );
        }
      }
    } catch (error) {
      /*
       * Market pricing should never
       * prevent crop analysis.
       */

      console.error('');
      console.error(
        '⚠️ Market price lookup failed:',
      );

      console.error(
        error.message,
      );

      console.error(
        error.stack,
      );
    }
  }

  /* =======================================================
     FINAL RESULT
  ======================================================= */

  return {
    analysis,

    crop,

    qualityScore,

    marketData,
  };
}

module.exports = {
  analyzeCropImage,
};