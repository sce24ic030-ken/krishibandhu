import { get } from './apiService';

// ==========================================
// ANALYTICS SERVICE
// ==========================================

const getDashboardAnalytics = async () => get('/analytics/dashboard');

const getPriceTrend = async ({ commodity, market = '', days = 30 }) => {
  const params = new URLSearchParams({
    commodity,
    market,
    days: String(days),
  });

  return get(`/analytics/price-trend?${params.toString()}`);
};

const getCreditScore = async () => get('/analytics/credit-score');

const getWeatherAlerts = async ({ temp, humidity, rain }) => {
  const params = new URLSearchParams();

  if (temp !== undefined && temp !== null) params.set('temp', String(temp));
  if (humidity !== undefined && humidity !== null) params.set('humidity', String(humidity));
  if (rain !== undefined && rain !== null) params.set('rain', String(rain));

  return get(`/analytics/weather-alerts?${params.toString()}`);
};

// Admin analytics
const getControlTower = async () => get('/admin/analytics/control-tower');

const getGovAnalytics = async () => get('/admin/analytics/gov');

const getDataDictionary = async () => get('/admin/analytics/data-dictionary');

const getFraudFlags = async () => get('/admin/analytics/fraud-flags');

const getParchiAudit = async (parchiId) =>
  get(`/admin/analytics/parchi-audit/${parchiId}`);

export {
  getDashboardAnalytics,
  getPriceTrend,
  getCreditScore,
  getWeatherAlerts,
  getControlTower,
  getGovAnalytics,
  getDataDictionary,
  getFraudFlags,
  getParchiAudit,
};