import {
  useEffect,
  useState,
} from 'react';

import {
  ShieldCheck,
  BadgeCheck,
  Sprout,
  ReceiptText,
  HandCoins,
  Scale,
  TriangleAlert,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';

import { getCreditScore } from '../services/analyticsService';

import { useLanguage } from '../context/LanguageContext';

import './InsightPages.css';

// ==========================================
// Credit Score — score, basis factors & flags
// ==========================================

const FACTORS = [
  {
    key: 'verified',
    label: 'Verified profile',
    points: 10,
  },
  {
    key: 'crops',
    label: 'Crop records',
    points: 10,
  },
  {
    key: 'transactions',
    label: 'Payment history',
    points: 15,
  },
  {
    key: 'parchis',
    label: 'Parchi (agreement) history',
    points: 15,
  },
  {
    key: 'settlements',
    label: 'Completed settlements',
    points: 20,
  },
];

const FACTOR_ICONS = [BadgeCheck, Sprout, HandCoins, ReceiptText, Scale];

function CreditScorePage() {
  const { t } = useLanguage();

  const [credit, setCredit] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCreditScore();

        setCredit(data);
      } catch {
        // keep empty
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  const score = credit?.score ?? null;
  const grade = credit?.grade ?? null;
  const riskFlags = credit?.riskFlags || [];
  const factors = credit?.factors || {};

  const earned = (key) => {
    switch (key) {
      case 'verified':
        return factors.verified ? 10 : 0;
      case 'crops':
        return Number(factors.crops) >= 1 ? 10 : 0;
      case 'transactions':
        return Number(factors.transactions) >= 1 ? 15 : 0;
      case 'parchis':
        return Number(factors.parchis) >= 1 ? 15 : 0;
      case 'settlements': {
        const parchis = Number(factors.parchis) || 0;
        const completed = Number(factors.completedSettlements) || 0;
        return parchis
          ? Math.round((completed / parchis) * 20)
          : 0;
      }
      default:
        return 0;
    }
  };

  return (
    <main className="dashboard insight-page">
      <PageHeader
        title={t('Credit Score')}
        description={t(
          'How your score is built — from verified profile and settlement history.',
        )}
      />

      {/* ================================== */}
      {/* Score hero */}
      {/* ================================== */}

      <section className="insight-section">
        <div className="score-hero">
          <div
            className={`score-circle ${
              score !== null && score < 40 ? 'bad' : ''
            }`}
          >
            {score !== null ? `${score}` : '—'}
          </div>

          <div className="score-info">
            <div className="score-grade">
              {score !== null
                ? t('Grade {0} — {1}/100', grade, score)
                : t('No score yet')}
            </div>
            <p className="score-sub">
              {score !== null
                ? t(
                    'Built from settlement history, verified profile and activity.',
                  )
                : t(
                    'Complete your profile and record parchis to start building credit.',
                  )}
            </p>
          </div>
        </div>
      </section>

      {/* ================================== */}
      {/* Basis factors */}
      {/* ================================== */}

      <section className="insight-section">
        <div className="insight-section-head">
          <h2>{t('Score basis')}</h2>
          <p>
            {t(
              'Points you currently earn for each factor (max 70 before settlement history).',
            )}
          </p>
        </div>

        <div className="insight-card">
          {FACTORS.map((factor, index) => {
            const Icon = FACTOR_ICONS[index];
            const got = earned(factor.key);

            return (
              <div className="factor-row" key={factor.key}>
                <span className="factor-label">
                  <Icon size={15} color="var(--primary)" />
                  {t(factor.label)}
                </span>
                <span
                  className={`factor-points ${
                    got >= factor.points ? 'good' : 'missed'
                  }`}
                >
                  +{got}/{factor.points}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ================================== */}
      {/* Risk flags */}
      {/* ================================== */}

      <section className="insight-section">
        <div className="insight-section-head">
          <h2>{t('Risk flags')}</h2>
          <p>
            {t(
              'Things pulling your score down — fix these to improve.',
            )}
          </p>
        </div>

        {ready && riskFlags.length === 0 && (
          <div className="insight-card">
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              <ShieldCheck
                size={14}
                style={{ verticalAlign: -2, color: '#237651' }}
              />{' '}
              {t('No risk flags. Keep it up!')}
            </p>
          </div>
        )}

        {riskFlags.map((flag) => (
          <div
            className="insight-row"
            key={flag}
            style={{ cursor: 'default' }}
          >
            <span className="insight-row-icon warning">
              <TriangleAlert size={18} />
            </span>

            <span className="insight-row-body">
              <span className="insight-row-title">
                {t(flag)}
              </span>
              <span className="insight-row-meta">
                {t(
                  'Complete more parchment settlements to build reliable payment history.',
                )}
              </span>
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}

export default CreditScorePage;