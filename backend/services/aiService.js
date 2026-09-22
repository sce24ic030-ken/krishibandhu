const {
  GoogleGenAI,
} = require('@google/genai');

const {
  groqChat,
  isGroqConfigured,
} = require('./groqService');

const Market = require('../models/Market');
const MarketPrice = require('../models/MarketPrice');
const Crop = require('../models/Crop');
const SaleListing = require('../models/SaleListing');
const Parchi = require('../models/Parchi');
const Transaction = require('../models/Transaction');
const StorageFacility = require('../models/StorageFacility');
const Backhaul = require('../models/Backhaul');

/* =========================================================
   GEMINI
========================================================= */

const ai = new GoogleGenAI({
  apiKey:
    process.env.GEMINI_API_KEY,
});

const GEMINI_MODEL =
  'gemini-3.6-flash';

const LANGUAGE_NAMES = {
  en: 'English',
  mr: 'Marathi',
  hi: 'Hindi',
};

/* =========================================================
   COMMODITY ALIASES
========================================================= */

const commodityAliases = [
  // ---- two-word / specific names first (avoid short-word collisions) ----
  {
    commodity: 'Green Gram(Moong)(Whole)',
    keywords: ['green gram', 'moong', 'mung', 'मूग', 'मूंग'],
  },
  {
    commodity: 'Black Gram(Urd Beans)(Whole)',
    keywords: ['black gram', 'urad', 'udid', 'उडीद', 'उड़द'],
  },
  {
    commodity: 'Bengal Gram(Gram)(Whole)',
    keywords: ['bengal gram', 'gram', 'chana', 'chickpea', 'harbara', 'हरबरा', 'चना'],
  },
  {
    commodity: 'Red gram/Arhar/Tur(whole)',
    keywords: ['tur', 'toor', 'arhar', 'pigeon pea', 'tur dal', 'toor dal', 'तूर', 'अरहर'],
  },
  {
    commodity: 'Bottle gourd',
    keywords: ['bottle gourd', 'lauki', 'dudhi', 'दुधी', 'लौकी'],
  },
  {
    commodity: 'Bitter gourd',
    keywords: ['bitter gourd', 'karela', 'करले', 'करेला'],
  },
  {
    commodity: 'Ridgeguard(Tori)',
    keywords: ['ridge gourd', 'ridgeguard', 'tori', 'dodka', 'तोरी'],
  },
  {
    commodity: 'Bhindi(Ladies Finger)',
    keywords: ['bhindi', 'okra', 'lady finger', 'ladyfinger', 'भिंडी', 'भेंडी'],
  },
  {
    commodity: 'Cucumbar(Kheera)',
    keywords: ['cucumber', 'cucumbar', 'kakdi', 'kheera', 'काकडी', 'खीरा'],
  },
  {
    commodity: 'Chilly Capsicum',
    keywords: ['capsicum', 'bell pepper', 'shimla mirch', 'ढोवळी मिरची', 'शिमला मिर्च'],
  },
  {
    commodity: 'Mustard Seed',
    keywords: ['mustard', 'mustard seed', 'mohri', 'sarson', 'मोहरी', 'सरसों'],
  },
  {
    commodity: 'Sesamum(Sesame,Gingelly,Til)',
    keywords: ['sesame', 'sesamum', 'til', 'gingelly', 'तीळ', 'तिल'],
  },
  {
    commodity: 'Sunflower/Sunflower Seed',
    keywords: ['sunflower', 'सूर्यफूल', 'सूरजमुखी'],
  },
  {
    commodity: 'Mousambi(Sweet Lime)',
    keywords: ['sweet lime', 'mosambi', 'mousambi', 'मोसंबी'],
  },
  {
    commodity: 'Karbuja(Musk Melon)',
    keywords: ['musk melon', 'kharbooja', 'kharabuj', 'खरबूज'],
  },
  {
    commodity: 'Water Melon',
    keywords: ['watermelon', 'water melon', 'kalingad', 'टरबूज', 'तरबूज'],
  },
  {
    commodity: 'Mango(Raw-Ripe)',
    keywords: ['mango', 'aam', 'आंबा', 'आम'],
  },
  {
    commodity: 'Ginger(Green)',
    keywords: ['ginger', 'adrak', 'aale', 'आले', 'अदरक'],
  },
  {
    commodity: 'Coriander(Leaves)',
    keywords: ['coriander', 'dhania', 'kothimbir', 'धणे', 'धनिया'],
  },
  {
    commodity: 'Methi(Leaves)',
    keywords: ['methi', 'fenugreek', 'मेथी'],
  },
  {
    commodity: 'Mint(Pudina)',
    keywords: ['mint', 'pudina', 'पुदिना'],
  },
  {
    commodity: 'Ragi(Finger Millet)',
    keywords: ['ragi', 'nachani', 'finger millet', 'नाचणी'],
  },
  {
    commodity: 'Gur(Jaggery)',
    keywords: ['jaggery', 'gur', 'गूळ', 'गुड़'],
  },
  {
    commodity: 'Sweet Potato',
    keywords: ['sweet potato', 'ratalu', 'शकरकंद'],
  },
  {
    commodity: 'Amla(Nelli Kai)',
    keywords: ['amla', 'nelli', 'आवळा', 'आंवला'],
  },
  // ---- cereals ----
  {
    commodity: 'Wheat',
    keywords: ['wheat', 'gehu', 'gahu', 'गहू', 'गेहूं'],
  },
  {
    commodity: 'Rice',
    keywords: ['rice', 'paddy', 'chawal', 'tandul', 'चावल', 'भात', 'धान', 'तांदूळ'],
  },
  {
    commodity: 'Bajra',
    keywords: ['bajra', 'bajri', 'बाजरी', 'बाजरा'],
  },
  {
    commodity: 'Jowar',
    keywords: ['jowar', 'jwari', 'sorghum', 'ज्वारी', 'ज्वार'],
  },
  {
    commodity: 'Maize',
    keywords: ['maize', 'corn', 'makka', 'mokka', 'मका', 'मक्का'],
  },
  {
    commodity: 'Soybean',
    keywords: ['soybean', 'soyabean', 'soya', 'सोयाबीन'],
  },
  {
    commodity: 'Groundnut',
    keywords: ['groundnut', 'peanut', 'moongfali', 'shingdana', 'शेंगदाणे', 'मूंगफली'],
  },
  {
    commodity: 'Safflower',
    keywords: ['safflower', 'kardai', 'करडई'],
  },
  // ---- vegetables ----
  {
    commodity: 'Tomato',
    keywords: ['tomato', 'tomatoes', 'टमाटर'],
  },
  {
    commodity: 'Onion',
    keywords: ['onion', 'onions', 'red onion', 'white onion', 'yellow onion', 'kanda', 'कांदा', 'प्याज'],
  },
  {
    commodity: 'Potato',
    keywords: ['potato', 'potatoes', 'batata', 'बटाटा', 'आलू'],
  },
  {
    commodity: 'Brinjal',
    keywords: ['brinjal', 'eggplant', 'aubergine', 'vangi', 'baingan', 'वांगी', 'बैंगन'],
  },
  {
    commodity: 'Cabbage',
    keywords: ['cabbage', 'कोबी', 'पत्ता गोभी'],
  },
  {
    commodity: 'Cauliflower',
    keywords: ['cauliflower', 'फ्लॉवर', 'फूल गोभी'],
  },
  {
    commodity: 'Carrot',
    keywords: ['carrot', 'gajar', 'गाजर'],
  },
  {
    commodity: 'Beetroot',
    keywords: ['beetroot', 'beet', 'बीट', 'चुकंदर'],
  },
  {
    commodity: 'Raddish',
    keywords: ['radish', 'raddis', 'moola', 'muli', 'मुळा', 'मूली'],
  },
  {
    commodity: 'Pumpkin',
    keywords: ['pumpkin', 'squash', 'भोपळा', 'कद्दू'],
  },
  {
    commodity: 'Green Peas',
    keywords: ['green peas', 'peas', 'matar', 'वाटाणे', 'मटर'],
  },
  {
    commodity: 'Spinach',
    keywords: ['spinach', 'palak', 'पालक'],
  },
  {
    commodity: 'Drumstick',
    keywords: ['drumstick', 'shevga', 'शेवगा'],
  },
  // ---- fruits ----
  {
    commodity: 'Banana',
    keywords: ['banana', 'केळे', 'केला'],
  },
  {
    commodity: 'Apple',
    keywords: ['apple', 'सफरचंद', 'सेब'],
  },
  {
    commodity: 'Orange',
    keywords: ['orange', 'संत्रे', 'संतरा'],
  },
  {
    commodity: 'Pomegranate',
    keywords: ['pomegranate', 'dalimb', 'अनार', 'डाळिंब'],
  },
  {
    commodity: 'Grapes',
    keywords: ['grapes', 'draksha', 'द्राक्षे', 'अंगूर'],
  },
  {
    commodity: 'Papaya',
    keywords: ['papaya', 'पपई', 'पपीता'],
  },
  {
    commodity: 'Guava',
    keywords: ['guava', 'peru', 'अमरूद'],
  },
  {
    commodity: 'Lime',
    keywords: ['lemon', 'lime', 'limbu', 'नींबू', 'लिंबू'],
  },
  {
    commodity: 'Garlic',
    keywords: ['garlic', 'lasun', 'लसूण', 'लहसुन'],
  },
  {
    commodity: 'Chilli',
    keywords: ['chilli', 'chili', 'mirchi', 'mirch', 'मिरची', 'मिर्च'],
  },
  {
    commodity: 'Turmeric',
    keywords: ['turmeric', 'halad', 'haldi', 'हळद', 'हल्दी'],
  },
  {
    commodity: 'Guar',
    keywords: ['guar', 'गवार'],
  },
];

/* =========================================================
   NORMALIZE TEXT
========================================================= */

function normalizeText(
  value = '',
) {
  return String(value)
    .toLowerCase()
    .replace(/[(),.*_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Bound a keyword so "rice" does not match inside
   "price", "tur" inside "turmeric", etc. */
const escapeRegExp = (value) =>
  String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );

const matchesKeyword = (
  normalized,
  keyword,
) => {
  const k = normalizeText(keyword);

  if (!k) {
    return false;
  }

  return new RegExp(
    `(^|[^a-z0-9])${escapeRegExp(
      k,
    )}([^a-z0-9]|$)`,
    'i',
  ).test(normalized);
};

/* =========================================================
   DETECT COMMODITY
========================================================= */

function detectCommodity(
  message,
) {
  const normalized =
    normalizeText(message);

  for (
    const item of commodityAliases
  ) {
    const matched =
      item.keywords.some(
        (keyword) =>
          matchesKeyword(
            normalized,
            keyword,
          ),
      );

    if (matched) {
      return item.commodity;
    }
  }

  return null;
}

/* =========================================================
   DETECT MARKET
========================================================= */

async function detectMarket(
  message,
) {
  const normalized =
    normalizeText(message);

  try {
    const markets =
      await Market.find({
        state: 'Maharashtra',
      })
        .select(
          '_id name district state isOfficial',
        )
        .lean();

    if (!markets.length) {
      return null;
    }

    /*
      First check complete market name.

      Example:
      "Pune APMC"
    */

    for (
      const market of markets
    ) {
      const marketName =
        normalizeText(
          market.name,
        );

      if (
        marketName &&
        normalized.includes(
          marketName,
        )
      ) {
        return market;
      }
    }

    /*
      Then check district.

      Example:
      "tomato price in Pune"
      -> Pune APMC
    */

    for (
      const market of markets
    ) {
      const district =
        normalizeText(
          market.district,
        );

      if (
        district &&
        normalized.includes(
          district,
        )
      ) {
        return market;
      }
    }

    return null;
  } catch (error) {
    console.error(
      'Market Detection Error:',
      error,
    );

    return null;
  }
}

/* =========================================================
   GET VERIFIED MARKET PRICE
========================================================= */

async function getVerifiedMarketPrice(
  message,
) {
  const commodity =
    detectCommodity(
      message,
    );

  /*
    Not every farming question is a
    market-price question.

    Example:
    "How do I grow onions?"
  */

  if (!commodity) {
    return null;
  }

  const market =
    await detectMarket(
      message,
    );

  /*
    Commodity detected but market
    not mentioned.
  */

  if (!market) {
    return {
      commodity,
      market: null,
      prices: null,
    };
  }

  try {
    const latestPrice =
      await MarketPrice.findOne({
        market: market._id,
        commodity,
      })
        .sort({
          priceDate: -1,
          createdAt: -1,
        })
        .lean();

    if (!latestPrice) {
      return {
        commodity,
        market,
        prices: null,
      };
    }

    return {
      commodity,
      market,
      prices: latestPrice,
    };
  } catch (error) {
    console.error(
      'Market Price Lookup Error:',
      error,
    );

    return {
      commodity,
      market,
      prices: null,
    };
  }
}

/* =========================================================
   BUILD MARKET CONTEXT
========================================================= */

function buildMarketContext(
  marketData,
) {
  if (!marketData) {
    return '';
  }

  /*
    Commodity found but no market.
  */

  if (!marketData.market) {
    return `
VERIFIED MARKET DATA

Commodity:
${marketData.commodity}

The farmer mentioned this commodity but did not specify
a market.

IMPORTANT:
Do not invent a market or market price.
If the farmer asks for a price, ask which market they mean.
`;
  }

  /*
    Market found but price unavailable.
  */

  if (!marketData.prices) {
    return `
VERIFIED MARKET DATA

Market:
${marketData.market.name}

District:
${marketData.market.district || 'Unknown'}

State:
${marketData.market.state || 'Maharashtra'}

Commodity:
${marketData.commodity}

No verified market-price record was found for this
commodity at this market.

IMPORTANT:
Do not invent or estimate a market price.
Tell the farmer that a verified price was not found.
`;
  }

  const {
    market,
    commodity,
    prices,
  } = marketData;

  const priceDate =
    prices.priceDate
      ? new Date(
          prices.priceDate,
        ).toLocaleDateString(
          'en-IN',
        )
      : 'Unknown';

  return `
VERIFIED MARKET DATA

Source:
${prices.source || 'MSAMB'}

Market:
${market.name}

District:
${market.district || 'Unknown'}

State:
${market.state || 'Maharashtra'}

Commodity:
${commodity}

Variety:
${prices.variety || 'Not specified'}

Unit:
${prices.unit || 'quintal'}

Minimum Price:
₹${prices.minimumPrice}

Modal Price:
₹${prices.modalPrice}

Maximum Price:
₹${prices.maximumPrice}

Price Date:
${priceDate}

MARKET PRICE RULES:

1. These prices come from KrishiBandhu's verified market database.
2. Do not invent, alter or replace these values.
3. Clearly mention the price date.
4. Clearly distinguish minimum, modal and maximum prices.
5. The stored MSAMB unit is generally quintal.
6. 1 quintal = 100 kg.
7. If the farmer asks for ₹/kg, divide the price by 100.
8. Never present these prices as guaranteed selling prices.
9. Actual selling price can vary based on quality, quantity,
   buyer, arrivals and auction conditions.
`;
}

/* =========================================================
   SYSTEM GUIDE
========================================================= */

const SYSTEM_GUIDE = `
SYSTEM GUIDE - how to use the KrishiBandhu app:

The app helps farmers run the whole farming-to-sale journey and works in English, Marathi and Hindi.

1) Crops: add each of your crops (name, variety, area, sowing date, expected harvest date) in the Crops page to track the lot from sowing to sale. Every crop gets a QR code for traceability.
2) Markets & Prices: the Markets page lists live Maharashtra APMC mandis and their daily verified prices (Agmarknet/MSAMB). You can filter by district or crop (for example Wheat, Onion, Tomato, Soybean) to compare mandi rates before selling.
3) Storage: the Storage page shows cold storages and warehouses with capacity, available space and charges, and lets the farmer request storage for produce.
4) Sell: Sale Listings lets a farmer list produce (quantity, market, expected price). Traders place bids and the farmer accepts the best offer.
5) Parchi: every accepted sale automatically creates a digital Parchi (sale receipt) with price, quantity, market and both parties.
6) Passbook: the app keeps an income and expense ledger for the farm.
7) Backhaul: arrange transport of produce between markets.
8) Weather: the Weather page gives forecasts for planning sowing, irrigation and spraying.
9) AI Vision: on this page a farmer can upload a crop photo; the AI checks visible quality and gives an indicative price range in rupees per kg.
10) This chat: the farmer can ask about any feature, or ask for live data from the app (their crops, storage, today's prices, listings, parchi, passbook and more). The AI fetches real data from the app's own database and shares exactly what the app has.

When the farmer asks how to do something in the app, explain using this guide with simple steps.
` ;

/* =========================================================
   APP LIVE DATA (fetched from the app's database)
========================================================= */

const APP_TOPIC_WORDS = {
  storage: [
    'storage',
    'warehouse',
    'warehouses',
    'godown',
    'cold storage',
    'facility',
    'गोदाम',
    'भांडार',
    'शीतगृह',
  ],
  crops: [
    'crop',
    'crops',
    'my farm',
    'सोय',
    'पीक',
    'पिके',
    'फसल',
    'पेरणी',
  ],
  markets: [
    'market',
    'markets',
    'mandi',
    'mandis',
    'apmc',
    'बाजार',
    'मंडई',
    'मार्केट',
  ],
  prices: [
    'price',
    'prices',
    'rate',
    'rates',
    'rate list',
    'भाव',
    'किंमत',
    'मूल्य',
  ],
  listings: [
    'listing',
    'listings',
    'sale listing',
    'sell my',
    'sell',
    'selling',
    'विक्री',
    'विक्रय',
    'लिस्टिंग',
  ],
  parchi: [
    'parchi',
    'परची',
    'बील',
    'receipt',
    'bill',
  ],
  transactions: [
    'transaction',
    'transactions',
    'passbook',
    'income',
    'expense',
    'spent',
    'व्यवहार',
    'पासबुक',
    'उत्पन्न',
    'खर्च',
  ],
  backhaul: [
    'backhaul',
    'transport',
    'transportation',
    'logistics',
    'वाहतूक',
    'ट्रान्सपोर्ट',
  ],
};

// Words that signal the farmer wants to understand or
// navigate the app itself (how-to / guide questions).
const APP_GUIDE_WORDS = [
  'guide',
  'help',
  'how',
  'how to',
  'use',
  'using',
  'app',
  'app feature',
  'features',
  'what can',
  'कसे',
  'कैसे',
  'कशी',
  'कसा',
  'मदत',
  'गाईड',
  'सुविधा',
];

const gatherAppData = async (
  message,
  userId,
  hasCommodity,
) => {
  try {
    const normalized =
      normalizeText(message);

    const hit = (words) =>
      words.some((word) =>
        normalized.includes(word),
      );

    const showGuide =
      hit(APP_GUIDE_WORDS);

    const sections = [];

    // ---------------- storage ----------------

    if (
      hit(
        APP_TOPIC_WORDS.storage,
      )
    ) {
      const total =
        await StorageFacility.countDocuments(
          {},
        );

      if (total) {
        const facilities =
          await StorageFacility.find(
            {},
          )
            .select(
              'name type location.district capacity capacityUnit availableCapacity storageCharges.amount',
            )
            .sort({ name: 1 })
            .limit(12)
            .lean();

        const lines = facilities.map(
          (f) =>
            `- ${f.name}${
              f.location?.district
                ? ` (${f.location.district})`
                : ''
            }: ${
              f.type === 'cold_storage'
                ? 'Cold storage'
                : 'Warehouse'
            }, capacity ${f.capacity} ${
              f.capacityUnit
            }, available ${
              f.availableCapacity ?? 0
            } ${f.capacityUnit}, charges ₹${
              f.storageCharges?.amount ?? 0
            }`,
        );

        sections.push(
          `STORAGE: the app has ${total} storage facility record(s)${
            total > 12
              ? ' (first 12 shown)'
              : ''
          }:\n${lines.join('\n')}`,
        );
      }
    }

    // ---------------- markets ----------------

    if (
      hit(
        APP_TOPIC_WORDS.markets,
      )
    ) {
      const total =
        await Market.countDocuments(
          {},
        );

      if (total) {
        const markets =
          await Market.find(
            {},
          )
            .select(
              'name district state',
            )
            .sort({ name: 1 })
            .limit(12)
            .lean();

        const lines = markets.map(
          (m) =>
            `- ${m.name}${
              m.district
                ? ` (${m.district})`
                : ''
            }`,
        );

        sections.push(
          `MARKETS: the app has ${total} market record(s)${
            total > 12
              ? ' (first 12 shown)'
              : ''
          }:\n${lines.join('\n')}`,
        );
      }
    }

    // ---------------- prices overview ----------------

    if (
      !hasCommodity &&
      hit(
        APP_TOPIC_WORDS.prices,
      )
    ) {
      const total =
        await MarketPrice.countDocuments(
          {},
        );

      if (total) {
        const latest =
          await MarketPrice.findOne(
            {},
          )
            .sort({ priceDate: -1 })
            .select('priceDate')
            .lean();

        const top =
          await MarketPrice.aggregate(
            [
              {
                $group: {
                  _id: '$commodity',
                  avgModal: {
                    $avg: '$modalPrice',
                  },
                  n: { $sum: 1 },
                },
              },
              {
                $sort: {
                  n: -1,
                  avgModal: -1,
                },
              },
              { $limit: 6 },
            ],
          );

        const lines = top.map(
          (t) =>
            `- ${t._id}: ₹${Math.round(
              t.avgModal,
            )} average (${t.n} observation${
              t.n === 1 ? '' : 's'
            })`,
        );

        sections.push(
          `PRICES: latest price date in the app is ${
            latest?.priceDate
              ? new Date(
                  latest.priceDate,
                ).toISOString()
                  .slice(0, 10)
              : 'unknown'
          }, with ${total} total price observation(s). Top commodities by observations:\n${lines.join(
            '\n',
          )}`,
        );
      }
    }

    // ---------------- user crops ----------------

    if (
      userId &&
      hit(
        APP_TOPIC_WORDS.crops,
      )
    ) {
      const total =
        await Crop.countDocuments({
          owner: userId,
        });

      if (total) {
        const crops =
          await Crop.find({
            owner: userId,
          })
            .select(
              'name variety area areaUnit status expectedHarvestDate',
            )
            .sort({ createdAt: -1 })
            .limit(10)
            .lean();

        const lines = crops.map(
          (c) =>
            `- ${c.name}${
              c.variety
                ? ` (${c.variety})`
                : ''
            }: ${c.area} ${c.areaUnit}, status ${
              c.status
            }${
              c.expectedHarvestDate
                ? `, expected harvest ${new Date(
                    c.expectedHarvestDate,
                  )
                    .toISOString()
                    .slice(0, 10)}`
                : ''
            }`,
        );

        sections.push(
          `CROPS: this farmer has ${total} crop record(s):\n${lines.join(
            '\n',
          )}`,
        );
      }
    }

    // ---------------- user listings ----------------

    if (
      userId &&
      hit(
        APP_TOPIC_WORDS.listings,
      )
    ) {
      const total =
        await SaleListing.countDocuments({
          farmer: userId,
        });

      if (total) {
        const listings =
          await SaleListing.find({
            farmer: userId,
          })
            .populate('crop', 'name')
            .sort({ listedAt: -1 })
            .limit(5)
            .lean();

        const lines = listings.map(
          (l) =>
            `- ${
              l.crop?.name || 'Crop'
            }: ${l.quantity} ${l.unit}, asking ₹${
              l.askingPrice
            }, status ${l.status}`,
        );

        sections.push(
          `SALE_LISTINGS: this farmer has ${total} listing record(s):\n${lines.join(
            '\n',
          )}`,
        );
      }
    }

    // ---------------- user parchi ----------------

    if (
      userId &&
      hit(
        APP_TOPIC_WORDS.parchi,
      )
    ) {
      const total =
        await Parchi.countDocuments({
          farmer: userId,
        });

      if (total) {
        const parchis =
          await Parchi.find({
            farmer: userId,
          })
            .select(
              'parchiNumber quantity createdAt',
            )
            .sort({ createdAt: -1 })
            .limit(5)
            .lean();

        const lines = parchis.map(
          (p) =>
            `- ${p.parchiNumber}: ${p.quantity} qty, dated ${
              p.createdAt
                ? new Date(
                    p.createdAt,
                  )
                    .toISOString()
                    .slice(0, 10)
                : 'unknown'
            }`,
        );

        sections.push(
          `PARCHI: this farmer has ${total} parchi record(s):\n${lines.join(
            '\n',
          )}`,
        );
      }
    }

    // ---------------- transactions ----------------

    if (
      hit(
        APP_TOPIC_WORDS.transactions,
      )
    ) {
      const total =
        await Transaction.countDocuments(
          {},
        );

      if (total) {
        const sums =
          await Transaction.aggregate(
            [
              {
                $group: {
                  _id: '$type',
                  total: {
                    $sum: '$amount',
                  },
                  n: { $sum: 1 },
                },
              },
            ],
          );

        const income = sums.find(
          (s) => s._id === 'income',
        );
        const expense = sums.find(
          (s) => s._id === 'expense',
        );

        sections.push(
          `TRANSACTIONS: the app has ${total} passbook record(s): income ₹${
            income?.total ?? 0
          } (${income?.n ?? 0}), expense ₹${
            expense?.total ?? 0
          } (${expense?.n ?? 0})`,
        );
      }
    }

    // ---------------- user backhaul ----------------

    if (
      userId &&
      hit(
        APP_TOPIC_WORDS.backhaul,
      )
    ) {
      const total =
        await Backhaul.countDocuments({
          $or: [
            { farmer: userId },
            { trader: userId },
          ],
        });

      sections.push(
        `BACKHAUL: this user has ${total} transport record(s).`,
      );
    }

    if (!sections.length) {
      return { appContext: '', showGuide };
    }

    return {
      appContext: `
APP LIVE DATA (fetched just now from the KrishiBandhu app database - use these numbers exactly, never invent any additional record, and if something is missing say it is not in the app yet):

${sections.join('\n\n')}
`,
      showGuide: true,
    };
  } catch (error) {
    console.error(
      'Gather app data error:',
      error,
    );

    return { appContext: '', showGuide: false };
  }
};

/* =========================================================
   SYSTEM INSTRUCTION
========================================================= */

function buildSystemInstruction(
  marketContext,
  language,
  systemGuide,
  appContext,
) {
  const languageName =
    LANGUAGE_NAMES[language] ||
    'English';

  const languageDirective = (
    language && language !== 'en'
  )
    ? `
LANGUAGE:

- Respond entirely in ${languageName}.
- Use simple, clear ${languageName} that a rural
  farmer easily understands.
- Keep numbers, prices, dates and market names
  exactly as provided.
- Do not mix languages unless quoting a term.
`
    : '';

  return `
You are KrishiBandhu AI, an agricultural assistant
for farmers.

Your role is to provide practical, clear and trustworthy
agricultural information.

GENERAL RULES:

1. Use simple farmer-friendly language.
2. Give practical and actionable advice.
3. Use headings and bullet points when useful.
4. Keep answers reasonably concise.
5. Do not make unsupported claims.
6. Do not pretend to perform laboratory tests.
7. Do not give definitive plant disease diagnoses from
   symptoms alone.
8. Explain uncertainty when necessary.
9. Never fabricate market prices.
10. Never fabricate weather information.
11. Never claim an estimated selling price is guaranteed.

ANSWER FORMAT - always follow:

1. Keep sentences short and simple for a farmer.
2. Never answer with one long unbroken paragraph of text.
3. Structure every answer with small emoji headers and
   bullet lists. Use these emojis as section markers:
   🌱 crops, 📈 or 💰 prices and money, 🏬 storage and
   warehouses, 📋 listings and parchi, 🚚 transport and
   backhaul, 🌤 weather, ⚠️ cautions, ✅ summary, 📌 tips
   and next steps.
4. Prefer bullet lists (use - symbols) for facts and
   numbered steps (1. 2. 3.) for any how-to guidance.
5. Bold important numbers, for example **₹3,777**.
6. When explaining how to use an app feature, give clear
   numbered steps and name the exact app page (Crops,
   Markets, Storage, Sale Listings, Parchi, Passbook,
   Backhaul, Weather, AI Assistant).
7. After answering, act as a guide through the whole app:
   when it fits, end with a short ✅ one-line summary
   (such as "✅ Done - I showed your crop schedule.") and
   then a 📌 one-line follow-up question offering the
   natural next step (such as "📌 Want me to check what
   price this crop fetches at your market?").

MARKET PRICE RULES:

When verified market data is provided:

- Use the supplied numbers exactly.
- Mention the market.
- Mention the commodity.
- Mention minimum price.
- Mention modal price.
- Mention maximum price.
- Mention the price date.
- Mention MSAMB as the source when appropriate.
- Stored prices are generally per quintal.
- 1 quintal = 100 kg.
- If asked for ₹/kg, divide the quintal price by 100.

When verified market data is NOT provided:

- Never invent a price.
- Explain that a verified price was not found.
- If no market was specified, ask the farmer for the market.

IMAGE ANALYSIS:

If discussing crop-image analysis:

- Explain that image analysis evaluates visible characteristics.
- Do not claim to detect internal problems that cannot be seen.
- Do not claim a definitive disease diagnosis.
- Any market-price estimate based on image quality is indicative only.
- Actual selling prices can differ.
${systemGuide}
${languageDirective}
${marketContext}
${appContext}
`;
}

/* =========================================================
   BUILD CHAT HISTORY
========================================================= */

function buildChatContents(
  history,
  message,
) {
  const contents = [];

  if (Array.isArray(history)) {
    for (
      const item of history
    ) {
      if (
        !item ||
        !item.content
      ) {
        continue;
      }

      const role =
        item.role === 'user'
          ? 'user'
          : 'model';

      contents.push({
        role,

        parts: [
          {
            text: String(
              item.content,
            ),
          },
        ],
      });
    }
  }

  /*
    Add current user message.
  */

  contents.push({
    role: 'user',

    parts: [
      {
        text: String(
          message,
        ),
      },
    ],
  });

  return contents;
}

/* =========================================================
   GENERATE AI RESPONSE
========================================================= */

async function generateAIResponse(
  message,
  history = [],
  language,
  userId,
) {
  if (
    !message ||
    typeof message !== 'string' ||
    !message.trim()
  ) {
    throw new Error(
      'A valid message is required.',
    );
  }

  console.log('');
  console.log(
    '========================================',
  );
  console.log(
    '🤖 KrishiBandhu AI Chat',
  );
  console.log(
    '========================================',
  );

  console.log(
    `💬 Question: ${message}`,
  );

  /*
    Get verified market information
    before asking Gemini.
  */

  const marketData =
    await getVerifiedMarketPrice(
      message,
    );

  if (marketData?.commodity) {
    console.log(
      `🌱 Commodity: ${marketData.commodity}`,
    );
  }

  if (marketData?.market) {
    console.log(
      `📍 Market: ${marketData.market.name}`,
    );
  }

  if (marketData?.prices) {
    console.log(
      '✅ Verified market price found',
    );

    console.log(
      `📅 Date: ${marketData.prices.priceDate}`,
    );

    console.log(
      `💰 Minimum: ${marketData.prices.minimumPrice}`,
    );

    console.log(
      `💰 Modal: ${marketData.prices.modalPrice}`,
    );

    console.log(
      `💰 Maximum: ${marketData.prices.maximumPrice}`,
    );
  }

  const marketContext =
    buildMarketContext(
      marketData,
    );

  const {
      appContext,
      showGuide,
    } = await gatherAppData(
      message,
      userId,
      Boolean(
        marketData?.commodity,
      ),
    );

    if (appContext) {
      console.log(
        '📊 App data context added',
      );
    }

    const systemInstruction =
      buildSystemInstruction(
        marketContext,
        language,
        showGuide
          ? SYSTEM_GUIDE
          : '',
        appContext,
      );

  const contents =
    buildChatContents(
      history,
      message.trim(),
    );

  try {
    /*
      PRIMARY: Groq — rotates across all configured
      chat keys (LLM_API_KEYS + WHISPER_API_KEYS)
      whenever a rate limit or 5xx occurs.
    */

    if (isGroqConfigured()) {
      try {
        const groqResponse =
          await groqChat({
            systemInstruction,

            contents,

            temperature: 0.4,

            maxTokens: 1200,
          });

        console.log(
          '✅ Groq response received',
        );

        console.log(
          '========================================',
        );
        console.log('');

        return groqResponse;
      } catch (groqError) {
        console.error(
          '❌ Groq failed — falling back to Gemini:',
          groqError.message,
        );
      }
    }

    /*
      FALLBACK: Gemini — try the configured model, then
      gemini-flash-latest (different capacity pool).
    */

    const geminiFallbackModels = [
      GEMINI_MODEL,
      'gemini-flash-latest',
    ];

    let lastGeminiError = null;

    for (
      const fallbackModel of geminiFallbackModels
    ) {
      try {
        const response =
          await ai.models.generateContent({
            model:
              fallbackModel,

            contents,

            config: {
              systemInstruction,

              temperature: 0.4,

              maxOutputTokens: 1200,
            },
          });

        const responseText =
          response?.text;

        if (
          !responseText ||
          typeof responseText !==
            'string'
        ) {
          throw new Error(
            'Gemini returned an empty response.',
          );
        }

        console.log(
          `✅ Gemini response received (${fallbackModel})`,
        );

        console.log(
          '========================================',
        );
        console.log('');

        return responseText.trim();
      } catch (geminiModelError) {
        lastGeminiError =
          geminiModelError;

        console.error(
          `❌ Gemini ${fallbackModel} failed:`,
          geminiModelError.message,
        );
      }
    }

    throw lastGeminiError || new Error(
      'Gemini returned an empty response.',
    );
  } catch (error) {
    console.error('');
    console.error(
      '========================================',
    );
    console.error(
      '❌ Gemini AI Error',
    );
    console.error(
      '========================================',
    );
    console.error(
      error,
    );
    console.error(
      '========================================',
    );
    console.error('');

    throw new Error(
      'Unable to get a response from AI.',
    );
  }
}

/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  generateAIResponse,
};