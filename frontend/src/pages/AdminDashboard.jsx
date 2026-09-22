import {
  Users,
  Sprout,
  Store,
  Gavel,
  WalletCards,
  IndianRupee,
  ShieldCheck,
  BriefcaseBusiness,
  RefreshCw,
  ScanLine,
  ShieldAlert,
  Landmark,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import {
  getControlTower,
  getGovAnalytics,
  getFraudFlags,
} from '../services/analyticsService';

import './AdminDashboard.css';

const API_BASE_URL = API_URL;

function AdminDashboard() {
  const { t } = useLanguage();

  const {
    token,
    user,
  } = useAuth();

  const [stats, setStats] = useState(null);

  const [controlTower, setControlTower] =
    useState(null);

  const [govData, setGovData] =
    useState(null);

  const [fraudData, setFraudData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/admin/dashboard`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Unable to fetch dashboard statistics.'),
        );
      }

      setStats(data.stats);
    } catch (err) {
      console.error(
        'Admin Dashboard Error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to load dashboard statistics.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStats();

      getControlTower()
        .then(setControlTower)
        .catch(() => null);

      getGovAnalytics()
        .then(setGovData)
        .catch(() => null);

      getFraudFlags()
        .then(setFraudData)
        .catch(() => null);
    }
  }, [token]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      },
    ).format(value || 0);
  };

  const statCards = [
    {
      title: t('Total Users'),
      value: stats?.users ?? 0,
      description:
        t('Registered platform users'),
      icon: Users,
    },

    {
      title: t('Farmers'),
      value: stats?.farmers ?? 0,
      description:
        t('Registered farmers'),
      icon: Sprout,
    },

    {
      title: t('Traders'),
      value: stats?.traders ?? 0,
      description:
        t('Registered traders'),
      icon: BriefcaseBusiness,
    },

    {
      title: t('Markets'),
      value: stats?.markets ?? 0,
      description:
        t('Available market locations'),
      icon: Store,
    },

    {
      title: t('Crop Listings'),
      value: stats?.crops ?? 0,
      description:
        t('Crop records on platform'),
      icon: Sprout,
    },

    {
      title: t('Bids'),
      value: stats?.bids ?? 0,
      description:
        t('Bids recorded'),
      icon: Gavel,
    },

    {
      title: t('Transactions'),
      value:
        stats?.transactions ?? 0,
      description:
        t('Recorded transactions'),
      icon: WalletCards,
    },

    {
      title: t('Transaction Value'),
      value: formatCurrency(
        stats?.transactionAmount,
      ),
      description:
        t('Total recorded transaction value'),
      icon: IndianRupee,
    },
  ];

  return (
    <div className="admin-dashboard">

      {/* Header */}

      <div className="admin-dashboard-header">

        <div>
          <p className="admin-dashboard-label">
            {t('Administration')}
          </p>

          <h1>
            {t('Admin Dashboard')}
          </h1>

          <p>
            {t('Monitor and manage the KrishiBandhu platform from one place.')}
          </p>
        </div>

        <div className="admin-profile-status">

          <div className="admin-profile-icon">
            <ShieldCheck size={21} />
          </div>

          <div>

            <span>
              {t('Signed in as')}
            </span>

            <strong>
              {user?.name ||
                t('System Admin')}
            </strong>

            <small>
              {t('Administrator')}
            </small>

          </div>

        </div>

      </div>

      {/* Error */}

      {error && (
        <div className="admin-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={fetchStats}
          >
            <RefreshCw size={15} />

            {t('Retry')}
          </button>

        </div>
      )}

      {/* Statistics */}

      <div className="admin-stats-grid">

        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              className="admin-stat-card"
              key={card.title}
            >

              <div className="admin-stat-top">

                <div className="admin-stat-icon">
                  <Icon size={20} />
                </div>

              </div>

              <div className="admin-stat-value">

                {loading ? (
                  <span className="admin-loading">
                    ...
                  </span>
                ) : (
                  card.value
                )}

              </div>

              <div className="admin-stat-title">
                {card.title}
              </div>

              <div className="admin-stat-description">
                {card.description}
              </div>

            </div>
          );
        })}

      </div>

      {/* Lower content */}

      <div className="admin-content-grid">

        {/* User Overview */}

        <section className="admin-panel">

          <div className="admin-panel-header">

            <div>
              <h2>
                {t('User Overview')}
              </h2>

              <p>
                {t('Current platform user distribution')}
              </p>
            </div>

            <Users size={20} />

          </div>

          <div className="admin-user-overview">

            <div className="admin-user-row">

              <div className="admin-user-label">

                <span className="admin-user-dot farmer" />

                <span>
                  {t('Farmers')}
                </span>

              </div>

              <strong>
                {loading
                  ? '...'
                  : stats?.farmers ?? 0}
              </strong>

            </div>

            <div className="admin-user-row">

              <div className="admin-user-label">

                <span className="admin-user-dot trader" />

                <span>
                  {t('Traders')}
                </span>

              </div>

              <strong>
                {loading
                  ? '...'
                  : stats?.traders ?? 0}
              </strong>

            </div>

            <div className="admin-user-row">

              <div className="admin-user-label">

                <span className="admin-user-dot admin" />

                <span>
                  {t('Administrators')}
                </span>

              </div>

              <strong>
                {loading
                  ? '...'
                  : stats?.admins ?? 0}
              </strong>

            </div>

          </div>

        </section>

        {/* Platform Overview */}

        <section className="admin-panel">

          <div className="admin-panel-header">

            <div>
              <h2>
                {t('Platform Overview')}
              </h2>

              <p>
                {t('Current operational records')}
              </p>
            </div>

            <Store size={20} />

          </div>

          <div className="admin-platform-list">

            <div>
              <span>
                {t('Markets')}
              </span>

              <strong>
                {loading
                  ? '...'
                  : stats?.markets ?? 0}
              </strong>
            </div>

            <div>
              <span>
                {t('Crop Listings')}
              </span>

              <strong>
                {loading
                  ? '...'
                  : stats?.crops ?? 0}
              </strong>
            </div>

            <div>
              <span>
                {t('Bids')}
              </span>

              <strong>
                {loading
                  ? '...'
                  : stats?.bids ?? 0}
              </strong>
            </div>

            <div>
              <span>
                {t('Transactions')}
              </span>

              <strong>
                {loading
                  ? '...'
                  : stats?.transactions ?? 0}
              </strong>
            </div>

          </div>

        </section>

      </div>

      {/* ==========================================
          Analytics: control tower, gov, fraud
      ========================================== */}

      <div className="admin-analytics-grid">

        {/* Tracking Control Tower */}

        <section className="admin-panel">

          <div className="admin-panel-header">

            <div>
              <h2>
                {t('Tracking Control Tower')}
              </h2>

              <p>
                {t('Trace scans, chain integrity & audit trail')}
              </p>
            </div>

            <ScanLine size={20} />

          </div>

          {controlTower && (
            <div className="admin-chain-summary">

              <div className="admin-chain-metric ok">

                <ShieldCheck size={18} />

                <div>
                  <strong>
                    {controlTower.verifiedChains?.valid ?? '—'}
                  </strong>

                  <span>
                    {t('Chains intact')}
                  </span>
                </div>

              </div>

              <div className="admin-chain-metric bad">

                <ShieldAlert size={18} />

                <div>
                  <strong>
                    {controlTower.verifiedChains?.tampered ?? '—'}
                  </strong>

                  <span>
                    {t('Tampered')}
                  </span>
                </div>

              </div>

              <div className="admin-chain-metric">

                <ScanLine size={18} />

                <div>
                  <strong>
                    {controlTower.recentScans?.length ?? '—'}
                  </strong>

                  <span>
                    {t('Recent scans')}
                  </span>
                </div>

              </div>

            </div>
          )}

          <div className="admin-audit-list">

            <h3>
              {t('Recent trace scans')}
            </h3>

            {(controlTower?.recentScans || [])
              .length === 0 ? (
              <p className="admin-empty-note">
                {t('No scans recorded yet.')}
              </p>
            ) : (
              (controlTower.recentScans || [])
                .slice(0, 5)
                .map((scan) => (
                  <div
                    className="admin-audit-row"
                    key={scan._id}
                  >
                    <span className="admin-audit-dot" />

                    <div>
                      <strong>
                        {t('{0} scan', scan.qrType)}
                      </strong>

                      <p>
                        {scan.scannedBy?.name ||
                          t('user')}{' '}
                        ·{' '}
                        {new Date(
                          scan.createdAt,
                        ).toLocaleString(
                          'en-IN',
                        )}
                      </p>
                    </div>
                  </div>
                ))
            )}

          </div>

          <div className="admin-audit-list">

            <h3>
              {t('Parchi pipeline')}
            </h3>

            {(controlTower?.parchiByStatus || [])
              .length === 0 ? (
              <p className="admin-empty-note">
                {t('No parchis yet.')}
              </p>
            ) : (
              controlTower.parchiByStatus.map(
                (entry) => (
                  <div
                    className="admin-pipeline-row"
                    key={entry._id}
                  >
                    <span>
                      {entry._id}
                    </span>

                    <strong>
                      {entry.count}
                    </strong>
                  </div>
                ),
              )
            )}

          </div>

        </section>

        {/* Government Analytics */}

        <section className="admin-panel">

          <div className="admin-panel-header">

            <div>
              <h2>
                {t('Government Analytics')}
              </h2>

              <p>
                {t('Portfolio snapshot for policy dashboards')}
              </p>
            </div>

            <Landmark size={20} />

          </div>

          {govData ? (
            <>
              <div className="admin-gov-grid">

                {[
                  [t('Farmers'), govData.totals?.farmers ?? 0],
                  [t('Traders'), govData.totals?.traders ?? 0],
                  [t('Markets'), govData.totals?.markets ?? 0],
                  [t('Listings'), govData.totals?.listings ?? 0],
                  [t('Parchis'), govData.totals?.parchis ?? 0],
                  [t('Transactions'), govData.totals?.transactions ?? 0],
                ].map(([label, value]) => (
                  <div
                    className="admin-gov-item"
                    key={label}
                  >
                    <span>{label}</span>

                    <strong>{value}</strong>
                  </div>
                ))}

              </div>

              <div className="admin-audit-list">

                <h3>
                  {t('Top commodities by price observations')}
                </h3>

                {(govData.commoditySummary || [])
                  .slice(0, 6)
                  .map((entry) => (
                    <div
                      className="admin-pipeline-row"
                      key={entry._id}
                    >
                      <span>
                        {entry._id}
                      </span>

                      <strong>
                        {formatCurrency(
                          entry.latestAvg,
                        )}
                      </strong>
                    </div>
                  ))}

              </div>
            </>
          ) : (
            <p className="admin-empty-note">
              {t('Government analytics loading…')}
            </p>
          )}

        </section>

        {/* Fraud & Anomaly Flags */}

        <section className="admin-panel">

          <div className="admin-panel-header">

            <div>
              <h2>
                {t('Fraud & Anomaly Flags')}
              </h2>

              <p>
                {t('Automatically detected risks')}
              </p>
            </div>

            <ShieldAlert size={20} />

          </div>

          <div className="admin-chain-summary">

            <div className="admin-chain-metric bad">

              <ShieldAlert size={18} />

              <div>
                <strong>
                  {fraudData?.total ?? '—'}
                </strong>

                <span>
                  {t('Total flags')}
                </span>
              </div>

            </div>

            <div className="admin-chain-metric bad">

              <ShieldAlert size={18} />

              <div>
                <strong>
                  {fraudData?.tamperedChains?.length ?? 0}
                </strong>

                <span>
                  {t('Tampered chains')}
                </span>
              </div>

            </div>

          </div>

          <div className="admin-audit-list">

            {(fraudData?.flags || []).length === 0 ? (
              <p className="admin-empty-note">
                {t('No anomalies detected.')}
              </p>
            ) : (
              (fraudData.flags || [])
                .slice(0, 6)
                .map((flag, index) => (
                  <div
                    className="admin-flag-row"
                    key={`${flag.code}-${index}`}
                  >
                    <span
                      className={`admin-flag-severity ${flag.severity}`}
                    >
                      {flag.severity}
                    </span>

                    <div>
                      <strong>
                        {flag.message}
                      </strong>

                      <p>
                        {flag.details?.parchi ||
                          flag.category}
                      </p>
                    </div>
                  </div>
                ))
            )}

          </div>

        </section>

      </div>

      {/* Security information */}

      <section className="admin-security-panel">

        <div className="admin-security-icon">
          <ShieldCheck size={23} />
        </div>

        <div>

          <h2>
            {t('Administrator Access')}
          </h2>

          <p>
            {t('This dashboard is restricted to users with the administrator role. User, market, bid, transaction and payment management will be available from the administrator navigation.')}
          </p>

        </div>

      </section>

    </div>
  );
}

export default AdminDashboard;