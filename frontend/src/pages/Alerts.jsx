import {
  useEffect,
  useState,
} from 'react';

import {
  TriangleAlert,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';

import { Link } from 'react-router-dom';

import PageHeader from '../components/PageHeader';

import {
  getDashboardAnalytics,
  getCreditScore,
} from '../services/analyticsService';

import { useLanguage } from '../context/LanguageContext';

import './InsightPages.css';

// ==========================================
// Alerts — sowing/market signals + credit flags
// ==========================================

const SIGNAL_LABELS = {
  GLUT_WARNING: 'Glut warning',
  GOOD_SOWING_WINDOW: 'Good sowing window',
  PRICE_DIP: 'Price dip',
  NEUTRAL: 'Neutral',
};

const SIGNAL_TIPS = {
  GLUT_WARNING:
    'Prices are falling. Hold stock or sell early — storage may pay off.',
  GOOD_SOWING_WINDOW:
    'Prices are rising. Consider sowing this crop now.',
  PRICE_DIP:
    'Prices are dipping. Delay selling if you can store, or find better mandis.',
  NEUTRAL:
    'Prices are stable. No urgent action needed.',
};

function Alerts() {
  const { t } = useLanguage();

  const [signals, setSignals] = useState([]);
  const [riskFlags, setRiskFlags] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const analytics = await getDashboardAnalytics();

        setSignals(analytics.signals?.signals || []);
      } catch {
        // keep empty
      }

      try {
        const credit = await getCreditScore();

        setRiskFlags(credit.riskFlags || []);
      } catch {
        // optional
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  const total = signals.length + riskFlags.length;

  return (
    <main className="dashboard insight-page">
      <PageHeader
        title={t('Alerts')}
        description={t(
          '{0} alerts need attention — market signals and credit flags.',
          total,
        )}
      />

      {/* ================================== */}
      {/* Market & sowing signals */}
      {/* ================================== */}

      <section className="insight-section">
        <div className="insight-section-head">
          <h2>{t('Market & sowing signals')}</h2>
          <p>
            {t(
              'Computed from live mandi prices — tap a signal to open the market page.',
            )}
          </p>
        </div>

        {ready && signals.length === 0 && (
          <div className="insight-card">
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              {t('No active market signals right now. Conditions are stable.')}
            </p>
          </div>
        )}

        {signals.map((signal) => {
          const label =
            SIGNAL_LABELS[signal.signal] || signal.signal;
          const level = signal.level;

          const Icon =
            level === 'good'
              ? TrendingUp
              : level === 'caution'
                ? TrendingDown
                : TriangleAlert;

          return (
            <Link
              className="insight-row"
              key={signal.commodity}
              to="/market"
            >
              <span
                className={`insight-row-icon ${level}`}
              >
                <Icon size={18} />
              </span>

              <span className="insight-row-body">
                <span className="insight-row-title">
                  {t(label)} — {signal.commodity}
                </span>
                <span className="insight-row-meta">
                  {t(
                    '{0}% {1} vs earlier',
                    Math.abs(signal.deltaPercent),
                    signal.deltaPercent > 0
                      ? t('up')
                      : t('down'),
                  )}
                  {' · '}
                  {t(
                    '₹{0} @ {1}',
                    Number(signal.lastPrice || 0).toLocaleString(
                      'en-IN',
                    ),
                    signal.lastMarket || t('mandi'),
                  )}
                  <br />
                  {t(SIGNAL_TIPS[signal.signal] || '')}
                </span>
              </span>

              <ChevronRight
                className="insight-row-arrow"
                size={17}
              />
            </Link>
          );
        })}
      </section>

      {/* ================================== */}
      {/* Credit flags */}
      {/* ================================== */}

      <section className="insight-section">
        <div className="insight-section-head">
          <h2>{t('Credit & settlement flags')}</h2>
          <p>
            {t(
              'Flags raised by the credit scoring engine — tap to see your score basis.',
            )}
          </p>
        </div>

        {ready && riskFlags.length === 0 && (
          <div className="insight-card">
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              {t('No credit flags right now.')}
            </p>
          </div>
        )}

        {riskFlags.map((flag) => (
          <Link
            className="insight-row"
            key={flag}
            to="/credit-score"
          >
            <span className="insight-row-icon warning">
              <ShieldAlert size={18} />
            </span>

            <span className="insight-row-body">
              <span className="insight-row-title">
                {t(flag)}
              </span>
              <span className="insight-row-meta">
                {t(
                  'Improve by completing settlements and keeping your profile verified.',
                )}
              </span>
            </span>

            <ChevronRight
              className="insight-row-arrow"
              size={17}
            />
          </Link>
        ))}
      </section>
    </main>
  );
}

export default Alerts;