import {
  useEffect,
  useState,
} from 'react';

import {
  Wallet,
  TrendingDown,
  PiggyBank,
  Sparkles,
  Scale,
  Percent,
  Truck,
  Package,
  Loader,
  ReceiptText,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';

import { getDashboardAnalytics } from '../services/analyticsService';

import API_URL from '../config/api';

import { useLanguage } from '../context/LanguageContext';

import './InsightPages.css';

// ==========================================
// Net Realization — proper mandi (APMC)
// calculation with a full charge breakdown
// ==========================================
//
// Prices from the market-prices feed are modal
// prices PER QUINTAL (100 kg) — the standard
// APMC unit. The calculator works in quintals
// and deducts realistic market charges:
//   market fee, commission (arthiya), hamali &
//   weighing, loading/unloading, packaging and
//   transport — then shows the farmer's net.

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(Number(amount) || 0));

const formatNum = (n) =>
  new Intl.NumberFormat('en-IN').format(Number(n) || 0);

function NetRealization() {
  const { t } = useLanguage();

  const [net, setNet] = useState(null);
  const [prices, setPrices] = useState([]);
  const [ready, setReady] = useState(false);

  // sale inputs
  const [commodity, setCommodity] = useState('');
  const [unit, setUnit] = useState('quintal');
  const [qty, setQty] = useState(20); // quintals
  const [price, setPrice] = useState('');

  // charge inputs (₹ or % as noted)
  const [marketFeePct, setMarketFeePct] = useState(1);
  const [commissionPct, setCommissionPct] = useState(1.5);
  const [hamaliQ, setHamaliQ] = useState(10);
  const [loadingQ, setLoadingQ] = useState(5);
  const [packagingQ, setPackagingQ] = useState(15);
  const [transport, setTransport] = useState(500);
  const [productionCost, setProductionCost] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const analytics = await getDashboardAnalytics();

        setNet(analytics.netRealization || null);
      } catch {
        // keep empty
      }

      try {
        const res = await fetch(
          `${API_URL}/market-prices`,
        ).then((r) => r.json());

        const list = res.data || [];

        setPrices(list);

        if (list.length) {
          const first = list[0];

          setCommodity(first.commodity);
          setUnit(first.unit || 'quintal');
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

    const match = prices.find(
      (p) => p.commodity === name,
    );

    if (match) {
      setUnit(match.unit || 'quintal');
      setPrice(String(match.modalPrice || ''));
    }
  };

  /* ------------------------------------------
     Calculation (all in the price unit — APMC
     modal price is per quintal by default)
  ------------------------------------------ */

  const qtyValue = Number(qty) || 0;
  const priceValue = Number(price) || 0;

  const kgQty = unit === 'kg' ? qtyValue : qtyValue * 100;

  const gross = qtyValue * priceValue;

  const marketFee = (gross * (Number(marketFeePct) || 0)) / 100;
  const commission =
    (gross * (Number(commissionPct) || 0)) / 100;
  const hamali = qtyValue * (Number(hamaliQ) || 0);
  const loading = qtyValue * (Number(loadingQ) || 0);
  const packaging = qtyValue * (Number(packagingQ) || 0);
  const transportCost =
    unit === 'kg'
      ? Number(transport) || 0
      : Number(transport) || 0;

  const totalCharges =
    marketFee +
    commission +
    hamali +
    loading +
    packaging +
    transportCost;

  const netRealization = gross - totalCharges;

  const perQuintal =
    qtyValue > 0 ? netRealization / qtyValue : 0;
  const perKg = kgQty > 0 ? netRealization / kgQty : 0;
  const retainedPct =
    gross > 0 ? (netRealization / gross) * 100 : 0;

  const profit = netRealization - (Number(productionCost) || 0);

  const commodities = [
    ...new Set(prices.map((p) => p.commodity)),
  ].sort();

  const lines = [
    {
      label: t('Gross sale value'),
      detail: `${formatNum(qtyValue)} ${unit} × ${formatNum(priceValue)}`,
      amount: gross,
      kind: 'gross',
    },
    {
      label: t('APMC market fee'),
      detail: t('{0}% of gross', formatNum(marketFeePct)),
      amount: marketFee,
      kind: 'fee',
    },
    {
      label: t('Commission (arthiya)'),
      detail: t('{0}% of gross', formatNum(commissionPct)),
      amount: commission,
      kind: 'fee',
    },
    {
      label: t('Weighing + hamali'),
      detail: t('₹{0} /{1}', formatNum(hamaliQ), unit),
      amount: hamali,
      kind: 'fee',
    },
    {
      label: t('Loading & unloading'),
      detail: t('₹{0} /{1}', formatNum(loadingQ), unit),
      amount: loading,
      kind: 'fee',
    },
    {
      label: t('Packaging (bags)'),
      detail: t('₹{0} /{1}', formatNum(packagingQ), unit),
      amount: packaging,
      kind: 'fee',
    },
    {
      label: t('Transport to mandi'),
      detail: t('Lump sum per trip'),
      amount: transportCost,
      kind: 'fee',
    },
    {
      label: t('Total mandi charges'),
      detail: t('{0} items', 6),
      amount: totalCharges,
      kind: 'total',
    },
    {
      label: t('Net realization (to you)'),
      detail: t(
        '{0}% of gross retained',
        formatNum(Number(retainedPct.toFixed(1))),
      ),
      amount: netRealization,
      kind: 'net',
    },
  ];

  return (
    <main className="dashboard insight-page">
      <PageHeader
        title={t('Net Realization')}
        description={t(
          'Mandis quote prices per quintal (100 kg). This calculates your true take-home after every APMC charge.',
        )}
      />

      {/* ================================== */}
      {/* Your recorded position */}
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
              <Wallet
                size={13}
                style={{ verticalAlign: -2 }}
              />{' '}
              {t('Income')}
            </div>
            <div className="insight-stat-value good">
              {net ? formatINR(net.income) : '—'}
            </div>
          </div>

          <div className="insight-stat">
            <div className="insight-stat-label">
              <TrendingDown
                size={13}
                style={{ verticalAlign: -2 }}
              />{' '}
              {t('Expenses')}
            </div>
            <div className="insight-stat-value bad">
              {net ? formatINR(net.expense) : '—'}
            </div>
          </div>

          <div className="insight-stat">
            <div className="insight-stat-label">
              <PiggyBank
                size={13}
                style={{ verticalAlign: -2 }}
              />{' '}
              {t('Net')}
            </div>
            <div className="insight-stat-value">
              {net ? formatINR(net.net) : '—'}
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
                {formatINR(net.expectedRealization)}
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
          <h2>{t('Calculate a mandi sale')}</h2>
          <p>
            {t(
              'Price auto-fills from today’s live mandi rate. Edit quantities and charges to see your real take-home.',
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
              <label>
                {t('Quantity')} ({unit})
              </label>
              <input
                type="number"
                min="0"
                value={qty}
                onChange={(e) =>
                  setQty(Number(e.target.value))
                }
              />
              {kgQty > 0 && unit === 'quintal' && (
                <small
                  style={{
                    color: 'var(--text-muted)',
                    fontSize: 11,
                  }}
                >
                  = {formatNum(kgQty)} kg
                </small>
              )}
            </div>

            <div className="insight-field">
              <label>
                {t('Modal price')} (₹/{unit})
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>

            <div className="insight-field">
              <label>
                <Percent
                  size={12}
                  style={{ verticalAlign: -2 }}
                />{' '}
                {t('APMC market fee')} (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={marketFeePct}
                onChange={(e) =>
                  setMarketFeePct(Number(e.target.value))
                }
              />
            </div>

            <div className="insight-field">
              <label>
                <HandShake /> {t('Commission (arthiya)')} (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={commissionPct}
                onChange={(e) =>
                  setCommissionPct(Number(e.target.value))
                }
              />
            </div>

            <div className="insight-field">
              <label>
                <Scale
                  size={12}
                  style={{ verticalAlign: -2 }}
                />{' '}
                {t('Weighing + hamali')} (₹/{unit})
              </label>
              <input
                type="number"
                min="0"
                value={hamaliQ}
                onChange={(e) =>
                  setHamaliQ(Number(e.target.value))
                }
              />
            </div>

            <div className="insight-field">
              <label>
                <Loader
                  size={12}
                  style={{ verticalAlign: -2 }}
                />{' '}
                {t('Loading & unloading')} (₹/{unit})
              </label>
              <input
                type="number"
                min="0"
                value={loadingQ}
                onChange={(e) =>
                  setLoadingQ(Number(e.target.value))
                }
              />
            </div>

            <div className="insight-field">
              <label>
                <Package
                  size={12}
                  style={{ verticalAlign: -2 }}
                />{' '}
                {t('Packaging')} (₹/{unit})
              </label>
              <input
                type="number"
                min="0"
                value={packagingQ}
                onChange={(e) =>
                  setPackagingQ(Number(e.target.value))
                }
              />
            </div>

            <div className="insight-field">
              <label>
                <Truck
                  size={12}
                  style={{ verticalAlign: -2 }}
                />{' '}
                {t('Transport to mandi')} (₹)
              </label>
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
              <label>
                {t('Production cost (optional)')} (₹)
              </label>
              <input
                type="number"
                min="0"
                value={productionCost}
                onChange={(e) =>
                  setProductionCost(Number(e.target.value))
                }
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================================== */}
      {/* Line-item breakdown */}
      {/* ================================== */}

      <section className="insight-section">
        <div className="insight-section-head">
          <h2>{t('Charge breakdown')}</h2>
          <p>
            {t(
              'Every rupee — gross sale value, each mandi charge, and what reaches you.',
            )}
          </p>
        </div>

        <div className="insight-card nrl-table-wrap">
          <table className="nrl-table">
            <tbody>
              {lines.map((line) => (
                <tr
                  key={line.label}
                  className={`nrl-row nrl-${line.kind}`}
                >
                  <td className="nrl-label">
                    {line.label}
                    <small>{line.detail}</small>
                  </td>
                  <td className="nrl-amount">
                    {line.kind === 'fee'
                      ? `− ${formatINR(line.amount)}`
                      : formatINR(line.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="nrl-result-grid">
            <div className="nrl-result">
              <span>{t('Net per quintal')}</span>
              <strong>{formatINR(perQuintal)}</strong>
            </div>
            <div className="nrl-result">
              <span>{t('Net per kg')}</span>
              <strong>{formatINR(perKg)}</strong>
            </div>
            <div className="nrl-result">
              <span>{t('You keep')}</span>
              <strong>
                {formatNum(Number(retainedPct.toFixed(1)))}%
              </strong>
            </div>
            <div className="nrl-result">
              <span>{t('Profit after production')}</span>
              <strong>{formatINR(profit)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* ================================== */}
      {/* Live price note */}
      {/* ================================== */}

      {prices.length > 0 && price && (
        <p
          className="insight-section"
          style={{
            marginTop: 16,
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          <ReceiptText
            size={12}
            style={{ verticalAlign: -2 }}
          />{' '}
          {t(
            'Live mandi price for {0} is ₹{1}/{2} today.',
            commodity,
            formatNum(price),
            unit,
          )}
        </p>
      )}
    </main>
  );
}

export default NetRealization;

// tiny helper icon (avoids pulling a new import)
function HandShake() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ verticalAlign: -2 }}
    >
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
      <path d="M3 4h8" />
    </svg>
  );
}