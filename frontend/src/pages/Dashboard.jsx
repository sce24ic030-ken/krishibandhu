import {
  useEffect,
  useState,
} from 'react';

import {
  Sprout,
  TrendingUp,
  Calculator,
  MapPinned,
  Bell,
  BookOpen,
  ShieldCheck,
  Archive,
} from 'lucide-react';

import GreetingCard from '../components/GreetingCard';
import DashboardCard from '../components/DashboardCard';

import {
  getDashboardAnalytics,
  getCreditScore,
} from '../services/analyticsService';

import API_URL from '../config/api';

import { useLanguage } from '../context/LanguageContext';

import './Dashboard.css';

const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatKg = (value, unitLabel = 'kg') =>
  `${Math.round(Number(value || 0)).toLocaleString(
    'en-IN',
  )} ${unitLabel}`;

const SIGNAL_LABELS = {
  GLUT_WARNING: 'Glut warning',
  GOOD_SOWING_WINDOW: 'Good sowing window',
  PRICE_DIP: 'Price dip',
  NEUTRAL: 'Neutral',
};

const SIGNAL_LEVELS = {
  warning: 'sowing-warning',
  good: 'sowing-good',
  caution: 'sowing-caution',
};

function Dashboard() {
  const { t } = useLanguage();

  const [marketPrices, setMarketPrices] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [signals, setSignals] = useState([]);
  const [netRealization, setNetRealization] = useState(null);
  const [creditScore, setCreditScore] = useState(null);
  const [ready, setReady] = useState(false);
  const [glutTotal, setGlutTotal] = useState(null);
  const [glutCommodity, setGlutCommodity] = useState('');

  /* =========================================
     Load real data
  ========================================= */

  useEffect(() => {
    const load = async () => {
      try {
        const [pricesRes, txnRes] = await Promise.all([
          fetch(`${API_URL}/market-prices`).then((r) => r.json()),
          fetch(`${API_URL}/transactions`).then((r) => r.json()),
        ]);

        setMarketPrices(pricesRes.data || []);
        setTransactions(txnRes.data || []);

        const topCommodity = (pricesRes.data || []).reduce(
          (best, entry) =>
            Number(entry.modalPrice || 0) >
            Number(best?.modalPrice || 0)
              ? entry
              : best,
          null,
        );

        if (topCommodity?.commodity) {
          try {
            const glut = await fetch(
              `${API_URL}/market-glut?commodity=${encodeURIComponent(
                topCommodity.commodity,
              )}`,
            ).then((r) => r.json());

            if (
              glut.data?.totals?.totalArrivalKg != null
            ) {
              setGlutTotal(
                glut.data.totals.totalArrivalKg,
              );
              setGlutCommodity(
                topCommodity.commodity,
              );
            }
          } catch {
            // card falls back to neutral
          }
        }
      } catch {
        // keep empty states
      }

      try {
        const analytics = await getDashboardAnalytics();

        setSignals(analytics.signals?.signals || []);
        setNetRealization(analytics.netRealization || null);
      } catch {
        // analytics unavailable — cards fall back to neutral
      }

      try {
        const credit = await getCreditScore();

        setCreditScore(credit);
      } catch {
        // optional
      } finally {
        setReady(true);
      }
    };

    load();
  }, []);

  /* =========================================
     Derived values
  ========================================= */

  const topSignal = signals[0] || null;

  const latestPrice = marketPrices.reduce(
    (best, entry) =>
      Number(entry.modalPrice || 0) > Number(best?.modalPrice || 0)
        ? entry
        : best,
    null,
  );

  const marketCount = new Set(
    (marketPrices || [])
      .map((entry) => entry.market?._id || entry.market?.name)
      .filter(Boolean),
  ).size;

  const passbook = transactions.reduce(
    (totals, transaction) => {
      if (transaction.type === 'income') {
        totals.balance += Number(transaction.amount || 0);
        totals.income += Number(transaction.amount || 0);
      } else {
        totals.balance -= Number(transaction.amount || 0);
        totals.expense += Number(transaction.amount || 0);
      }

      return totals;
    },
    { balance: 0, income: 0, expense: 0 },
  );

  const alertCount =
    signals.length + (creditScore?.riskFlags?.length || 0);

  return (
    <main className="dashboard">

      <GreetingCard />

      <section className="dashboard-grid">

        <DashboardCard
          icon={<Sprout size={21} />}
          title={t('Sowing Signal')}
          value={
            topSignal
              ? t(
                  SIGNAL_LABELS[topSignal.signal] ||
                    topSignal.signal,
                )
              : ready
                ? t('Neutral')
                : t('Loading...')
          }
          description={
            topSignal
              ? t('{0}% {1} vs earlier.', Math.abs(topSignal.deltaPercent), topSignal.deltaPercent > 0 ? t('up') : t('down'))
              : ready
                ? t('Conditions stable — no strong signal right now.')
                : t('Checking mandi prices for planting conditions.')
          }
          action={t('View')}
          to="/weather"
        />

        <DashboardCard
          icon={<TrendingUp size={21} />}
          title={t("Today's Market Price")}
          value={
            latestPrice
              ? formatCurrency(latestPrice.modalPrice)
              : '—'
          }
          description={
            latestPrice
              ? t('{0} @ {1}', latestPrice.commodity, latestPrice.market?.name || t('mandi'))
              : t('Current indicative market price.')
          }
          action={t('Markets')}
          to="/market"
        />

        <DashboardCard
          icon={<Calculator size={21} />}
          title={t('Net Realization')}
          value={
            netRealization
              ? formatCurrency(netRealization.net)
              : '—'
          }
          description={
            netRealization
              ? `${t('{0} income − {1} expenses', formatCurrency(netRealization.income), formatCurrency(netRealization.expense))}${
                  netRealization.expectedRealization
                    ? t(' · {0} expected from open listings', formatCurrency(netRealization.expectedRealization))
                    : ''
                }`
              : t('Estimated amount after selling costs.')
          }
          action={t('Calculate')}
          to="/net-realization"
        />

        <DashboardCard
          icon={<MapPinned size={21} />}
          title={t('Mandi Comparison')}
          value={
            marketCount
              ? marketCount === 1
                ? t('{0} Market', marketCount)
                : t('{0} Markets', marketCount)
              : '—'
          }
          description={t('Compare prices across nearby mandis.')}
          action={t('Compare')}
          to="/market"
        />

        <DashboardCard
          icon={<Archive size={21} />}
          title={t('Mandi Glut Watch')}
          value={
            glutTotal != null
              ? formatKg(glutTotal, t('kg'))
              : glutCommodity
                ? '—'
                : t('Check arrivals')
          }
          description={
            glutTotal != null
              ? t(
                  '{0} has already arrived across Maharashtra mandis today.',
                  glutCommodity,
                )
              : t(
                  'See how many kg of your crop are already in each mandi today — before you decide where to sell.',
                )
          }
          action={t('Check arrivals')}
          to="/market?tab=glut"
        />

        <DashboardCard
          icon={<Bell size={21} />}
          title={t('Alerts')}
          value={String(alertCount)}
          description={
            alertCount
              ? t('Market signals and credit flags need attention.')
              : t('No outstanding alerts right now.')
          }
          action={t('View all')}
          to="/alerts"
        />

        <DashboardCard
          icon={
            creditScore ? (
              <ShieldCheck size={21} />
            ) : (
              <BookOpen size={21} />
            )
          }
          title={
            creditScore ? t('Credit Score') : t('Passbook')
          }
          value={
            creditScore
              ? t('{0}/100 ({1})', creditScore.score, creditScore.grade)
              : formatCurrency(passbook.balance)
          }
          description={
            creditScore
              ? `${t('Built from settlement history, verified profile and activity.')}${
                  creditScore.riskFlags.length
                    ? t(' Flags: {0}', creditScore.riskFlags.join(', '))
                    : ''
                }`
              : t('Your recent agricultural transactions.')
          }
          action={creditScore ? t('Score basis') : t('Open')}
          to={creditScore ? '/credit-score' : '/passbook'}
        />

      </section>

    </main>
  );
}

export default Dashboard;