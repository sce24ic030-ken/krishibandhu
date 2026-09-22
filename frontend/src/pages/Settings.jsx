import PageHeader from '../components/PageHeader';

import { useLanguage } from '../context/LanguageContext';

import {
  KeyRound,
  Database,
  Bot,
  CloudSun,
  Smartphone,
  ShieldCheck,
  Boxes,
  MessageSquareText,
  Image,
} from 'lucide-react';

import './Settings.css';

// ==========================================
// Settings — Platform Setup & API Keys
// ==========================================

const REQUIRED_KEYS = [
  {
    icon: Database,
    name: 'MONGO_URI',
    what: 'MongoDB connection string',
    where: 'MongoDB Atlas → Database → Connect',
    why: 'Stores all farmers, markets, bids, parchis, trace scans and ledger blocks.',
  },
  {
    icon: Bot,
    name: 'GEMINI_API_KEY',
    what: 'Google AI Studio API key',
    where: 'aistudio.google.com → Get API key',
    why: 'Powers the AI Nursery Assistant chat and crop-image analysis.',
  },
  {
    icon: CloudSun,
    name: 'OPENWEATHER_API_KEY',
    what: 'OpenWeather API key',
    where: 'openweathermap.org → API keys',
    why: 'Live weather + sowing alerts on the Dashboard and Weather page.',
  },
  {
    icon: KeyRound,
    name: 'JWT_SECRET',
    what: 'Login token signing secret',
    where: 'Already generated for you in backend/.env',
    why: 'Secures every authenticated request (QR issue, analytics, admin).',
  },
];

const OPTIONAL_KEYS = [
  {
    icon: Boxes,
    name: 'REDIS_URL',
    what: 'Cache layer',
    fallback: 'In-memory cache is used automatically when not set.',
  },
  {
    icon: MessageSquareText,
    name: 'TWILIO_ACCOUNT_SID / AUTH_TOKEN',
    what: 'SMS notifications',
    fallback: 'Notifications appear in-app instead of SMS.',
  },
  {
    icon: MessageSquareText,
    name: 'EXOTEL_API_KEY / SID / SENDER_ID',
    what: 'India SMS gateway',
    fallback: 'Notifications appear in-app instead of SMS.',
  },
  {
    icon: Image,
    name: 'CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET',
    what: 'Image hosting',
    fallback: 'Images are stored locally on the server.',
  },
  {
    icon: Smartphone,
    name: 'SENTINEL (satellite)',
    what: 'Satellite crop monitoring',
    fallback: 'Weather-based advisory is used as the demo signal.',
  },
];

function Settings() {
  const { t } = useLanguage();

  return (
    <main className="dashboard settings-page">
      <PageHeader
        title={t('Settings')}
        description={t('Platform setup, API keys and feature readiness.')}
      />

      {/* ================================== */}
      {/* Required keys */}
      {/* ================================== */}

      <section className="settings-section">
        <div className="settings-section-head">
          <div>
            <h2>{t('Required setup — provide these keys')}</h2>
            <p>
              {t('Without these four, the platform runs in demo mode and live data features stay disabled.')}
            </p>
          </div>

          <span className="settings-pill required">
            {t('Required')}
          </span>
        </div>

        <div className="settings-grid">
          {REQUIRED_KEYS.map((key) => {
            const Icon = key.icon;

            return (
              <div
                className="settings-card"
                key={key.name}
              >
                <div className="settings-card-top">
                  <div className="settings-key-icon">
                    <Icon size={19} />
                  </div>

                  <code>{key.name}</code>
                </div>

                <p className="settings-card-what">
                  {t(key.what)}
                </p>

                <p className="settings-card-why">
                  {t(key.why)}
                </p>

                <div className="settings-card-where">
                  {t('Get it at:')}{' '}
                  <strong>{t(key.where)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================== */}
      {/* Optional keys */}
      {/* ================================== */}

      <section className="settings-section">
        <div className="settings-section-head">
          <div>
            <h2>{t('Optional — graceful demo fallbacks')}</h2>
            <p>
              {t('These enhance the experience. When missing, the app automatically falls back so nothing breaks.')}
            </p>
          </div>

          <span className="settings-pill optional">
            {t('Optional')}
          </span>
        </div>

        <div className="settings-grid">
          {OPTIONAL_KEYS.map((key) => {
            const Icon = key.icon;

            return (
              <div
                className="settings-card"
                key={key.name}
              >
                <div className="settings-card-top">
                  <div className="settings-key-icon alt">
                    <Icon size={19} />
                  </div>

                  <code>{key.name}</code>
                </div>

                <p className="settings-card-what">
                  {t(key.what)}
                </p>

                <div className="settings-card-where">
                  {t('Fallback:')}{' '}
                  <strong>{t(key.fallback)}</strong>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================== */}
      {/* Feature readiness */}
      {/* ================================== */}

      <section className="settings-section">
        <div className="settings-section-head">
          <div>
            <h2>{t('Feature readiness')}</h2>
            <p>
              {t('Everything below works out of the box, with or without the optional keys.')}
            </p>
          </div>

          <span className="settings-pill ready">
            {t('Ready')}
          </span>
        </div>

        <div className="settings-readiness-grid">
          {[
            t('QR traceability on crops, bids, parchis, backhaul & cold storage'),
            t('Tamper-proof hash-chained ledger for every Parchi'),
            t('Offline QR scanning — queued and synced automatically'),
            t('Admin control tower, government analytics & fraud flags'),
            t('AI Nursery Assistant (Gemini)'),
            t('Weather & sowing alerts'),
            t('Market prices + price-trend forecast'),
            t('Credit score for farmers'),
            t('Multilingual EN / मराठी / हिंदी'),
            t('PWA — installable, works offline'),
          ].map((feature) => (
            <div
              className="settings-feature"
              key={feature}
            >
              <ShieldCheck size={15} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ================================== */}
      {/* Demo accounts */}
      {/* ================================== */}

      <section className="settings-section">
        <div className="settings-section-head">
          <div>
            <h2>{t('Demo accounts')}</h2>
            <p>
              {t('Use these to explore all three roles.')}
            </p>
          </div>
        </div>

        <div className="settings-grid">
          {[
            {
              role: 'Farmer',
              email: 'farmer@krishibandhu.com',
              password: 'Farmer123',
            },
            {
              role: 'Trader',
              email: 'trader@krishibandhu.com',
              password: 'Trader123',
            },
            {
              role: 'Admin',
              email: 'admin@krishibandhu.com',
              password: 'Admin123',
            },
          ].map((account) => (
            <div
              className="settings-card"
              key={account.role}
            >
              <div className="settings-card-top">
                <div className="settings-role-badge">
                  {t(account.role)}
                </div>
              </div>

              <p className="settings-card-what">
                {account.email}
              </p>

              <div className="settings-card-where">
                {t('Password:')}{' '}
                <strong>{account.password}</strong>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================== */}
      {/* Where to put the keys */}
      {/* ================================== */}

      <section className="settings-section">
        <div className="settings-code-box">
          <p>
            <strong>{t('Where to paste the keys')}</strong>{' '}
            {t('— open')}{' '}
            <code>backend/.env</code>{' '}
            {t('and fill in the values:')}
          </p>

          <pre>{`MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/krishibandhu
GEMINI_API_KEY=AIza...
OPENWEATHER_API_KEY=abcdef...
JWT_SECRET=<already generated>`}</pre>

          <p className="settings-code-note">
            {t('Then restart the backend:')}{' '}
            <code>cd backend && npm run dev</code>
          </p>
        </div>
      </section>
    </main>
  );
}

export default Settings;