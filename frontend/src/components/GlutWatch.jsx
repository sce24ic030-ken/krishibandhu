import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  ArrowRight,
  Loader2,
  PackageCheck,
  RefreshCw,
  Scale,
  ShieldCheck,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import API_URL from '../config/api';

import './GlutWatch.css';

/*
 * =========================================
 * Glut Watch — Mandi arrival intelligence
 * =========================================
 * Tells a farmer how many kg of their crop has
 * ALREADY arrived in a market today (official MSAMB
 * arrival ledger), and whether that is heavy supply,
 * normal, or thin supply vs the recent average.
 */

const LEVEL_META = {
  heavy_glut: {
    emoji: '🔴',
    label: 'Heavy supply',
    cls: 'glut-level-heavy',
  },
  normal: {
    emoji: '🟢',
    label: 'Normal supply',
    cls: 'glut-level-normal',
  },
  thin_supply: {
    emoji: '🔵',
    label: 'Thin supply',
    cls: 'glut-level-thin',
  },
};

const formatKg = (value) =>
  `${Math.round(value || 0).toLocaleString(
    'en-IN',
  )} kg`;

const formatQuintal = (value) =>
  `${Math.round(value || 0).toLocaleString(
    'en-IN',
  )} q`;

const formatRs = (value) =>
  `₹${Math.round(value || 0).toLocaleString(
    'en-IN',
  )}`;

function GlutWatch() {
  const { token } = useAuth();
  const { t, lang } = useLanguage();

  const [commodityOptions, setCommodityOptions] =
    useState([]);

  const [commodity, setCommodity] = useState('');
  const [marketId, setMarketId] = useState('all');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  /* ====================================
     Load markets + commodities + my crops
  ==================================== */

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [pricesRes, cropsRes] =
          await Promise.all([
            fetch(`${API_URL}/market-prices`)
              .then((r) => r.json())
              .catch(() => ({})),
            token
              ? fetch(`${API_URL}/crops`, {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                })
                  .then((r) => r.json())
                  .catch(() => ({}))
              : Promise.resolve({}),
          ]);

        if (!active) {
          return;
        }

        const inMandi = [
          ...new Set(
            (pricesRes.data || [])
              .map((p) => p.commodity)
              .filter(Boolean),
          ),
        ].sort();

        const myCrops = [
          ...new Set(
            (cropsRes.data || [])
              .map((c) => c.name)
              .filter(Boolean),
          ),
        ];

        // Preferred order: my crops visible on the
        // official mandi ledger, then my crops, then
        // the full mandi commodity list.
        const mineInMandi = myCrops.filter((crop) =>
          inMandi.some(
            (name) =>
              name.toLowerCase() ===
              crop.toLowerCase(),
          ),
        );

        const options = [
          ...new Set([
            ...mineInMandi,
            ...myCrops,
            ...inMandi,
          ]),
        ];

        setCommodityOptions(options);

        setCommodity((previous) => {
          if (previous && options.includes(previous)) {
            return previous;
          }

          return options[0] || '';
        });
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [token]);

  /* ====================================
     Fetch glut data
  ==================================== */

  const fetchGlut = async (
    crop,
    market,
    isRefresh = false,
  ) => {
    if (!crop) {
      setData(null);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const params = new URLSearchParams({
        commodity: crop,
      });

      if (lang && lang !== 'en') {
        params.set('lang', lang);
      }

      if (market && market !== 'all') {
        params.set('market', market);
      }

      const response = await fetch(
        `${API_URL}/market-glut?${params.toString()}`,
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
            t('Unable to load glut data.'),
        );
      }

      setData(result.data);

      setMarketId((current) => {
        if (market !== 'all') {
          return market;
        }

        // When browsing "all markets", keep any valid
        // previous single-market selection only if it
        // still appears in the fresh snapshot.
        if (
          current !== 'all' &&
          (result.data.markets || []).some(
            (m) => m.market._id === current,
          )
        ) {
          return current;
        }

        return 'all';
      });
    } catch (err) {
      console.error('Glut fetch error:', err);
      setError(err.message || t('Failed to load.'));
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (commodity) {
      fetchGlut(commodity, marketId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commodity, marketId, lang]);

  /* ====================================
     Derived
  ==================================== */

  const modes = useMemo(() => {
    if (!data || !data.markets) {
      return [];
    }

    return data.markets.map((row) => ({
      id: row.market._id,
      name: row.market.name,
      district: row.market.district,
      arrivalKg: row.arrivalKg,
      modal: row.modal,
      ratio: row.ratio,
      level: row.level,
      levelLabel: row.levelLabel,
    }));
  }, [data]);

  const target =
    data && data.target ? data.target : null;

  /* ====================================
     Render
  ==================================== */

  const renderControls = () => (
    <div className="glut-controls">
      <div className="glut-field">
        <label htmlFor="glutCommodity">
          🧺 {t('Crop / commodity')}
        </label>

        <select
          id="glutCommodity"
          value={commodity}
          onChange={(event) =>
            setCommodity(event.target.value)
          }
        >
          {commodityOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="glut-field">
        <label htmlFor="glutMarket">
          🏪 {t('Market')}
        </label>

        <select
          id="glutMarket"
          value={marketId}
          onChange={(event) =>
            setMarketId(event.target.value)
          }
        >
          <option value="all">
            {t('All markets (overview)')}
          </option>

          {modes.map((mode) => (
            <option
              key={mode.id}
              value={mode.id}
            >
              {mode.name} —{' '}
              {t('{0} today', [formatKg(mode.arrivalKg)])}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="glut-refresh"
        onClick={() => fetchGlut(commodity, marketId, true)}
        disabled={refreshing || loading}
      >
        <RefreshCw
          size={15}
          className={refreshing ? 'glut-spin' : ''}
        />
        {t('Refresh')}
      </button>
    </div>
  );

  const renderVerdict = () => {
    if (!target) {
      return null;
    }

    const meta =
      LEVEL_META[target.level] ||
      LEVEL_META.normal;

    return (
      <div
        className={`glut-verdict ${meta.cls}`}
      >
        <div className="glut-verdict-top">
          <span className="glut-verdict-emoji">
            {meta.emoji}
          </span>

          <div>
            <h3>
              {target.market.name}, {target.market.district}
            </h3>

            <p>
              {target.levelLabel} ·{' '}
              {t('{0} per quintal modal', [formatRs(target.modal)])}
            </p>
          </div>

          <span className="glut-level-chip">
            {t(meta.label)}
          </span>
        </div>

        <div className="glut-big-number">
          <div>
            <span className="glut-big-kg">
              {formatKg(target.arrivalKg)}
            </span>

            <span className="glut-big-label">
              {t('already in this market today')}
            </span>
          </div>
        </div>

        <p className="glut-detail">
          {target.detail}
        </p>

        <p className="glut-pricenote">
          {target.priceNote}
        </p>

        <div className="glut-advice">
          <ShieldCheck size={16} />
          <span>{target.advice}</span>
        </div>

        {target.varieties && target.varieties.length > 0 && (
          <div className="glut-varieties">
            {target.varieties.map((variety) => (
              <span
                key={variety.variety}
                className="glut-variety-chip"
              >
                {variety.variety} ·{' '}
                {variety.quantity !== null
                  ? `${formatQuintal(variety.quantity)} @ ${formatRs(variety.modalPrice)}`
                  : formatRs(variety.modalPrice)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderRanking = () => {
    if (modes.length === 0) {
      return null;
    }

    return (
      <div className="glut-ranking">
        <div className="glut-ranking-header">
          <div>
            <h3>
              {t('Where is {0} flowing today?', [commodity])}
            </h3>

            <p>
              {t('{0} markets · {1} total arrival (official MSAMB ledger)', [
                data.totals.marketsReported,
                formatKg(data.totals.totalArrivalKg),
              ])}
            </p>
          </div>
        </div>

        <div className="glut-ranking-list">
          {modes.map((mode) => {
            const level = LEVEL_META[mode.level] ||
              LEVEL_META.normal;

            const selected =
              marketId !== 'all' &&
              marketId === mode.id;

            return (
              <button
                type="button"
                key={mode.id}
                className={`glut-rank-row ${
                  selected ? 'selected' : ''
                }`}
                onClick={() =>
                  setMarketId(mode.id)
                }
              >
                <div className="glut-rank-main">
                  <span className="glut-rank-name">
                    {mode.name}
                    <small>
                      {t('{0}, Maharashtra', [mode.district])}
                    </small>
                  </span>

                  <span
                    className={`glut-rank-level ${level.cls}`}
                  >
                    {level.emoji} {t(level.label)}
                  </span>
                </div>

                <div className="glut-rank-stats">
                  <span>
                    {t('Arrived today {0}', [formatKg(mode.arrivalKg)])}
                  </span>

                  <span>
                    {t('Modal {0}/q', [formatRs(mode.modal)])}
                  </span>

                  {mode.ratio !== null &&
                    mode.ratio !== undefined && (
                      <span>
                        {t('vs avg {0}x', [mode.ratio])}
                      </span>
                    )}
                </div>

                {selected && (
                  <span className="glut-rank-cta">
                    {t('Showing verdict')}{' '}
                    <ArrowRight size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="glut-watch">
      <div className="glut-header">
        <div>
          <h2>📊 {t('Glut Watch')}</h2>

          <p>
            {t('How many kg of your crop have')}{' '}
            <strong>{t('already arrived')}</strong>{' '}
            {t('in each mandi today — before you decide where to sell.')}
          </p>
        </div>

        {data && (
          <span className="glut-asof">
            {t('Ledger date:')}{' '}
            <strong>{data.asOfDate}</strong>
            {data.isStale && t(' (latest recorded)')}
          </span>
        )}
      </div>

      {renderControls()}

      {loading && (
        <div className="glut-message">
          <Loader2 size={18} className="glut-spin" />
          <p>{t('Reading the official mandi arrival ledger...')}</p>
        </div>
      )}

      {error && (
        <div className="glut-message glut-error">
          <AlertTriangle size={18} />
          <p>{error}</p>
        </div>
      )}

      {!loading &&
        !error &&
        data &&
        data.markets.length === 0 && (
          <div className="glut-message">
            <PackageCheck size={18} />
            <p>
              {t('No official arrival records for')}{' '}
              <strong>{data.commodity}</strong>{' '}
              {t('yet. Try another crop — MSAMB covers items like Tomato, Onion, Chilli, Cotton, Soyabean.')}
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        data &&
        data.markets.length > 0 && (
          <>
            {marketId !== 'all' && renderVerdict()}
            {renderRanking()}
          </>
        )}

      {!loading &&
        !error &&
        data &&
        data.markets.length > 0 && (
          <div className="glut-transparency">
            <Scale size={15} />
            <p>
              <strong>{t('Fair-price record (grievance-ready):')}</strong>{' '}
              {t("this is the official MSAMB arrival ledger. If the rate offered to you is much lower than today's modal at a market with thin arrivals, capture this screen — it is evidence you can attach when raising a price dispute with your APMC.")}
            </p>
          </div>
        )}
    </section>
  );
}

export default GlutWatch;