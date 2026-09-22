/*
 * update-env.cjs — update ALL env vars on a Render service
 * Usage: $env:RENDER_API_KEY=...; node deploy/update-env.cjs <serviceId>
 */
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.RENDER_API_KEY;
const SERVICE_ID = process.argv[2];
if (!API_KEY || !SERVICE_ID) {
  console.error('Usage: RENDER_API_KEY=... node deploy/update-env.cjs <serviceId>');
  process.exit(1);
}

const envPath = path.join(__dirname, '..', 'backend', '.env');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const envVars = [
  { key: 'NODE_ENV', value: 'production' },
  { key: 'FRONTEND_URL', value: 'https://krishibandhu-frontend-833m.onrender.com,https://krishibandhu-frontend.onrender.com,http://localhost:5173' },
];
for (const k of ['MONGO_URI', 'JWT_SECRET', 'LLM_API_KEYS', 'GROQ_API_KEYS', 'GROQ_API_KEY',
  'WHISPER_API_KEYS', 'WHISPER_API_KEY', 'WHISPER_MODEL', 'GROQ_MODEL',
  'VISION_LLM_API_KEYS', 'GEMINI_API_KEY', 'GEMINI_MODEL',
  'OPENWEATHER_API_KEY', 'ANCHORED_GENESIS_HASH',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM',
  'EXOTEL_API_KEY', 'EXOTEL_API_ID', 'REDIS_URL']) {
  if (env[k]) envVars.push({ key: k, value: env[k] });
}

(async () => {
  const res = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(envVars),
  });
  const text = await res.text();
  console.log(`PUT /services/${SERVICE_ID}/env-vars -> ${res.status}`);
  if (!res.ok) console.error(text.slice(0, 1500));
  else console.log(`✔ ${envVars.length} env vars set (incl. corrected FRONTEND_URL)`);
})().catch((e) => { console.error(e); process.exit(1); });