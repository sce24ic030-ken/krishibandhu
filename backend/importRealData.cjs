require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Market = require('./models/Market');
const MarketPrice = require('./models/MarketPrice');

/*
 * ==========================================
 * Import REAL market & price data from
 * Agmarknet (agmarknet.gov.in) for Maharashtra
 * ==========================================
 * Pulls live, per-market daily price records
 * (variety, min/max/modal price, arrivals)
 * for EVERY Maharashtra APMC in the platform's
 * market list and stores them as MarketPrice
 * documents (source: MSAMB via Agmarknet).
 *
 * Re-runnable: existing observations are
 * replaced with the freshest real set.
 */

const API = 'https://api.agmarknet.gov.in/v1/';
const HEADERS = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

/* Correct districts for markets that may be created on the fly. */
const DISTRICT_BY_NAME = {
  'Malegaon APMC': 'Nashik',
  'Chhatrapati Sambhajinagar APMC': 'Chhatrapati Sambhajinagar',
  'Akola APMC': 'Akola',
  'Chandrapur APMC': 'Chandrapur',
  'Jalgaon APMC': 'Jalgaon',
  'Nanded APMC': 'Nanded',
  'Satara APMC': 'Satara',
  'Buldhana APMC': 'Buldhana',
  'Hingoli APMC': 'Hingoli',
  'Wardha APMC': 'Wardha',
  'Yavatmal APMC': 'Yavatmal',
  'Washim APMC': 'Washim',
  'Parbhani APMC': 'Parbhani',
  'Osmanabad APMC': 'Osmanabad',
  'Beed APMC': 'Beed',
  'Dhule APMC': 'Dhule',
  'Ratnagiri APMC': 'Ratnagiri',
  'Sindhudurg APMC': 'Sindhudurg',
  'Gondia APMC': 'Gondia',
  'Bhandara APMC': 'Bhandara',
  'Gadchiroli APMC': 'Gadchiroli',
  'Raigad APMC': 'Raigad',
  'Mumbai APMC': 'Mumbai',
  'Thane APMC': 'Thane',
  'Palghar APMC': 'Palghar',
  'Mira Bhayandar APMC': 'Thane',
};

/* Manual id -> market-name pairs for centers whose
   spelling differs from Agmarknet (e.g. Chhatrapati). */
const MANUAL_IDS = [[557, 'Chhatrapati Sambhajinagar APMC']];

const COMMODITY_RENAME = {
  'Bajra(Pearl Millet/Cumbu)': 'Bajra',
  'Jowar(Sorghum)': 'Jowar',
  'Paddy(Common)': 'Paddy',
  'Paddy(Basmati)': 'Paddy',
  'Soyabean': 'Soybean',
  'Tur(Pigeon Pea)': 'Tur',
  'Moong(Green Gram)': 'Green Gram',
  'Chana(Dal)': 'Gram',
  'Gram(Harbjara Kala)': 'Gram',
  'Arhar (Tur/Red Gram)': 'Tur',
  'Tomato(Hybrid)': 'Tomato',
  'Tomato(Deshi)': 'Tomato',
  'Onion(Nasik)': 'Onion',
  'Onion(Other)': 'Onion',
  'Potato(Puja)': 'Potato',
  'Potato(Other)': 'Potato',
  'Green Chilli': 'Chilli',
  'Dry Chillies': 'Chilli',
  'Red Chilli': 'Chilli',
  'Coriander(Dhania)': 'Coriander',
  'Mustard': 'Mustard Seed',
};

function cleanCommodity(name) {
  if (!name) return name;
  const n = String(name).trim();
  return COMMODITY_RENAME[n] || n;
}

const norm = (s) => String(s || '')
  .toUpperCase()
  .replace(/APMC/g, ' ')
  .replace(/\([^)]*\)/g, ' ')
  .replace(/[^A-Z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

async function fetchJson(path, opts) {
  const res = await fetch(API + path, { headers: HEADERS, ...opts });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${path}`);
  return res.json();
}

async function fetchDaily(dateStr, ids) {
  const res = await fetch(API + 'prices-and-arrivals/market-report/daily', {
    method: 'POST',
    headers: { ...HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ date: dateStr, stateIds: [20], marketIds: ids, includeExcel: false }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

const parseNumber = (v) => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = Number(String(v).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : undefined;
};

async function main() {
  await connectDB();

  const filters = await fetchJson('daily-price-arrival/filters');
  const data = filters.data || {};
  const mktArr = Array.isArray(data.market_data)
    ? data.market_data
    : Object.values(data.market_data)[0];
  const mh = (Array.isArray(mktArr) ? mktArr : []).filter(
    (m) => String(m.state_id) === '20' && m.id && m.id !== 100002,
  );

  // Every Maharashtra market we have, mapped to a real Agmarknet center id.
  const markets = await Market.find({ state: 'Maharashtra' });
  const idMap = new Map();   // agmarknetId -> market _id
  const nameById = new Map(); // agmarknetId -> market name
  const matchedNames = new Set();

  for (const mk of markets) {
    const key = norm(mk.name);
    if (!key) continue;
    const cands = mh.filter((m) => {
      const mn = norm(m.mkt_name);
      return mn === key || mn.startsWith(key + ' ') || mn.endsWith(' ' + key) || mn.includes(key);
    });
    const primary =
      cands.find((m) => norm(m.mkt_name) === key) ||
      cands.find((m) => /^APMC/.test(String(m.mkt_name).trim())) ||
      cands[0];
    if (primary) {
      idMap.set(primary.id, mk._id);
      nameById.set(primary.id, mk.name);
      matchedNames.add(mk.name);
    }
  }

  // Manual spelling-override pairs
  for (const [id, name] of MANUAL_IDS) {
    const mk = markets.find((m) => m.name === name);
    if (mk) {
      idMap.set(id, mk._id);
      nameById.set(id, mk.name);
      matchedNames.add(mk.name);
    }
  }

  console.log('🔗 Markets matched to real centers:', matchedNames.size, '/', markets.length);
  for (const [id, name] of nameById) console.log(`   ${id} -> ${name}`);

  const unmatched = markets.filter((m) => !matchedNames.has(m.name)).map((m) => m.name);
  if (unmatched.length) console.log('⚠️  No Agmarknet center for:', unmatched.join(', '));

  // Fix districts on any freshly created markets
  for (const mk of markets) {
    if (DISTRICT_BY_NAME[mk.name] && mk.district !== DISTRICT_BY_NAME[mk.name]) {
      mk.district = DISTRICT_BY_NAME[mk.name];
      await mk.save();
    }
  }

  const ids = [...idMap.keys()];
  const dates = [
    '2026-09-20', '2026-09-19', '2026-09-18',
    '2026-09-17', '2026-09-16', '2026-09-15',
  ];

  const rows = [];
  const seen = new Set();
  for (const date of dates) {
    try {
      const report = await fetchDaily(date, ids);
      let got = 0;
      for (const st of report.states || []) {
        for (const m of st.markets || []) {
          const mkId = idMap.get(m.marketId);
          if (!mkId) continue;
          const mName = nameById.get(m.marketId);
          for (const c of m.commodities || []) {
            const commodity = cleanCommodity(c.commodityName);
            for (const v of c.data || []) {
              const key = `${mName}|${commodity}|${v.variety || ''}|${date}`;
              if (seen.has(key)) continue;
              seen.add(key);
              rows.push({ market: mkId, marketName: mName, commodity, v, date });
              got++;
            }
          }
        }
      }
      console.log(`📅 ${date}: ${got} rows`);
    } catch (e) {
      console.log(`⚠️  ${date}: ${e.message}`);
    }
  }

  if (rows.length === 0) {
    console.log('❌ No real price rows harvested. Aborting (existing data kept).');
    await mongoose.connection.close();
    process.exit(1);
  }

  const removed = await MarketPrice.deleteMany({});
  console.log(`🗑️  Removed ${removed.deletedCount} old price observations`);

  let inserted = 0, skipped = 0;
  for (const { market, commodity, v, date } of rows) {
    const minP = parseNumber(v.minimumPrice);
    const maxP = parseNumber(v.maximumPrice);
    const modalP = parseNumber(v.modalPrice);
    if (minP === undefined && modalP === undefined) { skipped++; continue; }
    try {
      await MarketPrice.create({
        market,
        commodity,
        variety: v.variety ? String(v.variety).trim().slice(0, 80) : undefined,
        unit: 'quintal',
        arrivalQuantity: parseNumber(v.arrivals),
        minimumPrice: minP,
        maximumPrice: maxP,
        modalPrice: modalP,
        priceDate: new Date(date + 'T00:00:00.000Z'),
        source: 'MSAMB',
      });
      inserted++;
    } catch (e) {
      skipped++;
      console.log('⚠️  skip', commodity, v.variety, '->', e.message.slice(0, 80));
    }
  }

  const byMarket = {};
  for (const r of rows) byMarket[r.marketName] = (byMarket[r.marketName] || 0) + 1;
  console.log('\n✅ Imported', inserted, 'real price observations (skipped', skipped, ')');
  for (const [k, v] of Object.entries(byMarket).sort((a, b) => b[1] - a[1])) console.log(`   • ${k}: ${v}`);
  console.log('\n🧰 Re-run anytime to refresh from Agmarknet.');

  await mongoose.connection.close();
}

main().catch((e) => {
  console.error('❌ Import failed:', e);
  process.exit(1);
});