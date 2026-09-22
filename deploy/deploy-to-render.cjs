/*
 * deploy-to-render.cjs
 *
 * Creates BOTH KrishiBandhu services on Render.com via its REST API:
 *   1. krishibandhu-api         → Node Web Service (backend)
 *   2. krishibandhu-frontend    → Static Site (frontend)
 *
 * Reads secret env values from backend/.env (never prints them).
 *
 * Usage:
 *   $env:RENDER_API_KEY = "rnd_..."        (from Render → Account → API Keys)
 *   $env:GITHUB_REPO    = "https://github.com/<you>/krishibandhu"
 *   node deploy/deploy-to-render.cjs
 */

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.RENDER_API_KEY;
if (!API_KEY) {
  console.error('✖ Set RENDER_API_KEY first (Render → Account Settings → API Keys).');
  process.exit(1);
}

const REPO = process.env.GITHUB_REPO;
if (!REPO) {
  console.error('✖ Set GITHUB_REPO env to "https://github.com/<you>/krishibandhu".');
  process.exit(1);
}

// ---- read local .env for secret values ----
const envPath = path.join(__dirname, '..', 'backend', '.env');
const envRaw = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const SECRET_KEYS = [
  'MONGO_URI', 'JWT_SECRET',
  'LLM_API_KEYS', 'GROQ_API_KEYS', 'GROQ_API_KEY',
  'WHISPER_API_KEYS', 'WHISPER_API_KEY', 'WHISPER_MODEL', 'GROQ_MODEL',
  'VISION_LLM_API_KEYS', 'GEMINI_API_KEY', 'GEMINI_MODEL',
  'OPENWEATHER_API_KEY', 'ANCHORED_GENESIS_HASH',
  'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_WHATSAPP_FROM',
  'EXOTEL_API_KEY', 'EXOTEL_API_ID', 'REDIS_URL',
];
const secrets = SECRET_KEYS.filter((k) => env[k]).map((k) => ({ key: k, value: env[k] }));
console.log(`✔ Read ${secrets.length} secret env vars from backend/.env (values hidden)`);

async function api(method, url, body) {
  const res = await fetch('https://api.render.com/v1' + url, {
    method,
    headers: { Authorization: 'Bearer ' + API_KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  if (!res.ok) {
    console.error(`✖ ${method} ${url} -> ${res.status}`);
    console.error(text.slice(0, 2000));
    return { status: res.status, json: null };
  }
  console.log(`✔ ${method} ${url} -> ${res.status}`);
  return { status: res.status, json };
}

async function main() {
  // 1) find the owner/team id (API can return {cursor, owner} or {owners: [...]})
  const owners = await api('GET', '/owners');
  const list = Array.isArray(owners.json)
    ? owners.json
    : owners.json?.owners
      ? owners.json.owners
      : owners.json?.owner
        ? [owners.json.owner]
        : [];
  const owner = list.find((o) => o.type === 'personal') || list[0];
  if (!owner?.id) {
    console.error('✖ Could not find an owner for this account:', JSON.stringify(list).slice(0, 500));
    process.exit(1);
  }
  console.log(`✔ Owner: ${owner.name} (${owner.id})`);

  // 2) backend web service
  const backend = await api('POST', '/services', {
    type: 'web',
    name: 'krishibandhu-api',
    ownerId: owner.id,
    repo: REPO,
    branch: 'main',
    region: 'singapore',
    plan: 'free',
    rootDir: 'backend',
    envVars: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'FRONTEND_URL', value: 'https://krishibandhu-frontend.onrender.com' },
      ...secrets,
    ],
    serviceDetails: {
      env: 'node',
      buildCommand: 'npm install',
      startCommand: 'node server.js',
      healthCheckPath: '/api/health',
      autoDeploy: true,
    },
  });
  const backendId = backend.json?.id;
  const backendUrl = backend.json?.serviceDetails?.url;
  console.log(`✔ Backend service: ${backendId} -> ${backendUrl || '(creating…)'}`);

  // 3) frontend static site
  const frontend = await api('POST', '/services', {
    type: 'static_site',
    name: 'krishibandhu-frontend',
    ownerId: owner.id,
    repo: REPO,
    branch: 'main',
    region: 'singapore',
    plan: 'free',
    rootDir: 'frontend',
    envVars: [
      { key: 'VITE_API_URL', value: 'https://krishibandhu-api.onrender.com/api' },
    ],
    serviceDetails: {
      env: 'static',
      buildCommand: 'npm install && npm run build',
      staticPublishPath: 'dist',
      autoDeploy: true,
    },
  });
  const frontendId = frontend.json?.id;
  const frontendUrl = frontend.json?.serviceDetails?.url;
  console.log(`✔ Frontend service: ${frontendId} -> ${frontendUrl || '(creating…)'}`);

  console.log('\n==== DONE ====');
  console.log(`Backend:  ${backendUrl || 'https://krishibandhu-api.onrender.com'}`);
  console.log(`Frontend: ${frontendUrl || 'https://krishibandhu-frontend.onrender.com'}`);
  console.log('\nNext: open the services in Render to check deploys, and make sure');
  console.log('Atlas Network Access allows 0.0.0.0/0 (see DEPLOY.md).');
}

main().catch((e) => { console.error(e); process.exit(1); });