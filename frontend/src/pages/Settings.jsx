import PageHeader from '../components/PageHeader';

import { useLanguage } from '../context/LanguageContext';

import { ShieldCheck } from 'lucide-react';

import './Settings.css';

// ==========================================
// Settings — feature readiness & demo accounts
// ==========================================

function Settings() {
  const { t } = useLanguage();

  return (
    <main className="dashboard settings-page">
      <PageHeader
        title={t('Settings')}
        description={t('Feature readiness and demo accounts for all roles.')}
      />

      {/* ================================== */}
      {/* Feature readiness */}
      {/* ================================== */}

      <section className="settings-section">
        <div className="settings-section-head">
          <div>
            <h2>{t('Feature readiness')}</h2>
            <p>
              {t('Everything below works out of the box.')}
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
    </main>
  );
}

export default Settings;