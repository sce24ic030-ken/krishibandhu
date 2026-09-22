import {
  useEffect,
  useState,
} from 'react';

import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Sparkles,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';

import {
  getDashboardAnalytics,
} from '../services/analyticsService';

import API_URL from '../config/api';

import { useLanguage } from '../context/LanguageContext';

import './InsightPages.css';

// ==========================================
// Net Realization — live mandi prices +
// a simple income/expense calculator
// ==========================================

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

function NetRealization() {
  const { t } = useLanguage();

  const [net, setNet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [ready, setReady] = useState(false);

  const [commodity, setCommodity] = useState('');
  const [qty, setQty] = useState(1000);
  const [price, setPrice] = useState('');
  const [productionCost, setProductionCost] = useState(0);
  const [transport, setTransport] = useState(0);
  const [commission, setCommission] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const analytics = await getDashboardAnalytics();

        setNet(analytics.netRealization || null);
      } catch {
        // keep empty
      }

      try {
        const res = await fetch(`${API_URL}/market-prices`).then(
          (r) => r.json(),
        );

        const list = res.data || [];

        setPrices(list);

        if (list.length) {
          const first = list[0];

          setCommodity(first.commodity);
          setPrice(String(first.modalPrice || ''));
        }
      } catch {
        // keep empty
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  const handleCommodity = (name) => {
    setCommodity(name);

    const match = prices.find((p) => p.commodity === name);

    setPrice(match ? String(match.modalPrice || '') : '');
  };

  const sellPrice = Number(price) || 0;
  const gross = qty * sellPrice;
  const commissionAmount = (gross * (Number(commission) || 0)) / 100;
  const totalExpense =
    (Number(productionCost) || 0) +
    (Number(transport) || 0) +
    commissionAmount;
  const netGain = gross - totalExpense;

  const commodities = [
    ...new Set(prices.map((p) => p.commodity)),
  ].sort();

  return (
    <main className="dashboard insight-page">
      <PageHeader
        title={t('Net Realization')}
        description={t(
          'See what you actually earn — live mandi prices and your selling costs.',
        )}
      />

      {/* ================================== */}
      {/* Actuals from your records */}
      {/* ================================== */}

      <section className="insight-section">
        <div className="insight-section-head">
          <h2>{t('Your recorded position')}</h2>
          <p>
            {t(
              'Computed from your recorded income, expenses and open listings.',
            )}
          </p>
        </div>

        <div className="insight-grid">
          <div className="insight-stat">
            <div className="insight-stat-label">
              <Wallet size={13} style={{ verticalAlign: -2 }} />{' '}
              {t('Income')}
            </div>
            <div className="insight-stat-value good">
              {net ? formatCurrency(net.income) : '—'}
            </div>
          </div>

          <div className="insight-stat">
            <div className="insight-stat-label">
              <TrendingDown size={13} style={{ verticalAlign: -2 }} />{' '}
              {t('Expenses')}
            </div>
            <div className="insight-stat-value bad">
              {net ? formatCurrency(net.expense) : '—'}
            </div>
          </div>

          <div className="insight-stat">
            <div className="insight-stat-label">
              <PiggyBank size={13} style={{ verticalAlign: -2 }} />{' '}
              {t('Net')}
            </div>
            <div className="insight-stat-value">
              {net ? formatCurrency(net.net) : '—'}
            </div>
          </div>

          {net?.expectedRealization ? (
            <div className="insight-stat">
              <div className="insight-stat-label">
                <Sparkles
                  size={13}
                  style={{ verticalAlign: -2 }}
                />{' '}
                {t('Expected')}
              </div>
              <div className="insight-stat-value good">
                {formatCurrency(net.expectedRealization)}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* ================================== */}
      {/* Calculator */}
      {/* ================================== */}

      <section className="insight-section">
        <div className="insight-section-head">
          <h2>{t('Calculate a sale')}</h2>
          <p>
            {t(
              'Uses today live mandi price — fill the quantity and your costs.',
            )}
          </p>
        </div>

        <div className="insight-card">
          <div className="insight-form">
            <div className="insight-field">
              <label>{t('Commodity')}</label>
              <select
                value={commodity}
                onChange={(e) =>
                  handleCommodity(e.target.value)
                }
              >
                {commodities.length === 0 && (
                  <option value="">
                    {t('Loading...')}
                  </option>
                )}
                {commodities.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="insight-field">
              <label>{t('Quantity (kg)')}</label>
              <input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
              />
            </div>

            <div className="insight-field">
              <label>{t('Selling price (₹/kg)')}</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="insight-field">
              <label>{t('Production cost (₹)')}</label>
              <input
                type="number"
                min="0"
                value={productionCost}
                onChange={(e) =>
                  setProductionCost(Number(e.target.value))
                }
              />
            </div>

            <div className="insight-field">
              <label>{t('Transport (₹)')}</label>
              <input
                type="number"
                min="0"
                value={transport}
                onChange={(e) =>
                  setTransport(Number(e.target.value))
                }
              />
            </div>

            <div className="insight-field">
              <label>{t('Commission (%)')}</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={commission}
                onChange={(e) =>
                  setCommission(Number(e.target.value))
                }
              />
            </div>
          </div>

          <div
            className={`insight-result ${
              netGain < 0 ? 'bad-result' : ''
            }`}
            style={
              netGain < 0
                ? { background: '#fdeeee', color: '#b42318' }
                : undefined
            }
          >
            {t(
              'Gross ₹{0} − expenses ₹{1} = net ₹{2}',
              formatCurrency(gross),
              formatCurrency(totalExpense),
              formatCurrency(netGain),
            )}
          </div>

          {prices.length > 0 && price && (
            <p
              style={{
                margin: '10px 0 0',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              <TrendingUp size={12} style={{ verticalAlign: -2 }} />{' '}
              {t(
                'Live mandi price for {0} is ₹{1}/kg today.',
                commodity,
                Number(price).toLocaleString('en-IN'),
              )}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default NetRealization;