import { useEffect, useState } from 'react';

import {
  FileText,
  IndianRupee,
  MapPin,
  Package,
  QrCode,
  User,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock3,
  CreditCard,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import API_URL from '../config/api';
import QrModal from '../components/QrModal';
import { useLanguage } from '../context/LanguageContext';

import './Parchi.css';

const API_BASE_URL = API_URL;

const Parchi = () => {
  const { t } = useLanguage();

  const { user, token } = useAuth();

  const [parchis, setParchis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [qrTarget, setQrTarget] = useState(null);

  // ==========================================
  // FETCH PARCHIS
  // ==========================================

  const fetchParchis = async () => {
    if (!token) {
      setParchis([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/parchi`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            t('Failed to fetch Parchis.'),
        );
      }

      setParchis(result.data || []);
    } catch (err) {
      console.error(
        'Parchi fetch error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to load Parchis.'),
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LOAD PARCHIS WHEN TOKEN IS AVAILABLE
  // ==========================================

  useEffect(() => {
    if (token) {
      fetchParchis();
    } else {
      setLoading(false);
    }
  }, [token]);

  // ==========================================
  // FORMAT DATE
  // ==========================================

  const formatDate = (date) => {
    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    );
  };

  // ==========================================
  // FORMAT CURRENCY
  // ==========================================

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      },
    ).format(Number(amount) || 0);
  };

  // ==========================================
  // STATUS LABEL
  // ==========================================

  const getStatusLabel = (status) => {
    switch (status) {
      case 'issued':
        return t('Issued');

      case 'payment_pending':
        return t('Payment Pending');

      case 'paid':
        return t('Paid');

      case 'completed':
        return t('Completed');

      case 'cancelled':
        return t('Cancelled');

      default:
        return status || t('Unknown');
    }
  };

  // ==========================================
  // PAYMENT STATUS LABEL
  // ==========================================

  const getPaymentLabel = (status) => {
    switch (status) {
      case 'pending':
        return t('Payment Pending');

      case 'initiated':
        return t('Payment Initiated');

      case 'success':
        return t('Payment Successful');

      case 'failed':
        return t('Payment Failed');

      case 'cancelled':
        return t('Payment Cancelled');

      default:
        return status || t('Unknown');
    }
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="parchi-page">

      {/* ====================================== */}
      {/* HEADER                                 */}
      {/* ====================================== */}

      <div className="parchi-page-header">

        <div className="parchi-title-row">

          <div className="parchi-title-icon">
            <FileText size={22} />
          </div>

          <div>
            <h1>{t('Parchi')}</h1>

            <p>
              {t('Your digital sale receipts and transaction records.')}
            </p>
          </div>

        </div>

        <button
          type="button"
          className="parchi-refresh-button"
          onClick={fetchParchis}
          disabled={loading}
        >
          {loading ? (
            <Loader2
              size={17}
              className="parchi-spin"
            />
          ) : (
            <RefreshCw size={17} />
          )}

          {t('Refresh')}
        </button>

      </div>

      {/* ====================================== */}
      {/* SUMMARY CARDS                          */}
      {/* ====================================== */}

      <div className="parchi-summary-grid">

        {/* Total Parchis */}

        <div className="parchi-summary-card">

          <div className="parchi-summary-icon">
            <FileText size={20} />
          </div>

          <div>
            <span>{t('Total Parchis')}</span>

            <strong>
              {parchis.length}
            </strong>
          </div>

        </div>

        {/* Total Value */}

        <div className="parchi-summary-card">

          <div className="parchi-summary-icon">
            <IndianRupee size={20} />
          </div>

          <div>
            <span>{t('Total Value')}</span>

            <strong>
              {formatCurrency(
                parchis.reduce(
                  (sum, parchi) =>
                    sum +
                    Number(
                      parchi.totalAmount ||
                        0,
                    ),
                  0,
                ),
              )}
            </strong>
          </div>

        </div>

        {/* Completed */}

        <div className="parchi-summary-card">

          <div className="parchi-summary-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>{t('Completed')}</span>

            <strong>
              {
                parchis.filter(
                  (parchi) =>
                    parchi.status ===
                    'completed',
                ).length
              }
            </strong>
          </div>

        </div>

        {/* Payment Pending */}

        <div className="parchi-summary-card">

          <div className="parchi-summary-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>{t('Payment Pending')}</span>

            <strong>
              {
                parchis.filter(
                  (parchi) =>
                    parchi.paymentStatus ===
                    'pending',
                ).length
              }
            </strong>
          </div>

        </div>

      </div>

      {/* ====================================== */}
      {/* ERROR                                  */}
      {/* ====================================== */}

      {error && (
        <div className="parchi-error">
          {error}
        </div>
      )}

      {/* ====================================== */}
      {/* LOADING                                */}
      {/* ====================================== */}

      {loading && (
        <div className="parchi-state">

          <Loader2
            size={28}
            className="parchi-spin"
          />

          <p>
            {t('Loading your Parchis...')}
          </p>

        </div>
      )}

      {/* ====================================== */}
      {/* EMPTY STATE                            */}
      {/* ====================================== */}

      {!loading &&
        !error &&
        parchis.length === 0 && (
          <div className="parchi-empty">

            <FileText size={42} />

            <h2>
              {t('No Parchis yet')}
            </h2>

            <p>
              {t('Your digital sale receipts will appear here after an accepted bid is converted into a Parchi.')}
            </p>

          </div>
        )}

      {/* ====================================== */}
      {/* PARCHI LIST                            */}
      {/* ====================================== */}

      {!loading &&
        parchis.length > 0 && (
          <div className="parchi-list">

            {parchis.map((parchi) => (

              <div
                className="parchi-card"
                key={parchi._id}
              >

                {/* ================================= */}
                {/* CARD HEADER                        */}
                {/* ================================= */}

                <div className="parchi-card-header">

                  <div>

                    <span className="parchi-number-label">
                      {t('Parchi Number')}
                    </span>

                    <h2>
                      {parchi.parchiNumber}
                    </h2>

                  </div>

                  <div className="parchi-status-group">

                    <span
                      className={`parchi-status parchi-status-${parchi.status}`}
                    >
                      {getStatusLabel(
                        parchi.status,
                      )}
                    </span>

                    <span
                      className={`parchi-payment-status parchi-payment-${parchi.paymentStatus}`}
                    >
                      {getPaymentLabel(
                        parchi.paymentStatus,
                      )}
                    </span>

                    <button
                      type="button"
                      className="parchi-qr-button"
                      onClick={() =>
                        setQrTarget(parchi)
                      }
                      title={t('Open Parchi QR & trace ledger')}
                    >
                      <QrCode size={15} />
                      {t('Parchi QR')}
                    </button>

                  </div>

                </div>

                {/* ================================= */}
                {/* DETAILS GRID                       */}
                {/* ================================= */}

                <div className="parchi-details-grid">

                  {/* Crop */}

                  <div className="parchi-detail">

                    <Package size={18} />

                    <div>

                      <span>
                        {t('Crop')}
                      </span>

                      <strong>
                        {parchi.crop?.name ||
                          t('Unknown Crop')}
                      </strong>

                      {parchi.crop?.variety && (
                        <small>
                          {parchi.crop.variety}
                        </small>
                      )}

                    </div>

                  </div>

                  {/* Market */}

                  <div className="parchi-detail">

                    <MapPin size={18} />

                    <div>

                      <span>
                        {t('Market')}
                      </span>

                      <strong>
                        {parchi.market?.name ||
                          t('Unknown Market')}
                      </strong>

                      <small>
                        {parchi.market?.district ||
                          ''}

                        {parchi.market?.state
                          ? `, ${parchi.market.state}`
                          : ''}
                      </small>

                    </div>

                  </div>

                  {/* Farmer / Trader */}

                  <div className="parchi-detail">

                    <User size={18} />

                    <div>

                      <span>
                        {user?.role === 'trader'
                          ? t('Farmer')
                          : t('Trader')}
                      </span>

                      <strong>
                        {user?.role === 'trader'
                          ? parchi.farmer?.name
                          : parchi.trader?.name}
                      </strong>

                      <small>
                        {user?.role === 'trader'
                          ? parchi.farmer?.phone
                          : parchi.trader?.phone}
                      </small>

                    </div>

                  </div>

                  {/* Issued Date */}

                  <div className="parchi-detail">

                    <CreditCard size={18} />

                    <div>

                      <span>
                        {t('Issued On')}
                      </span>

                      <strong>
                        {formatDate(
                          parchi.issuedAt,
                        )}
                      </strong>

                    </div>

                  </div>

                </div>

                {/* ================================= */}
                {/* FINANCIAL DETAILS                 */}
                {/* ================================= */}

                <div className="parchi-financial">

                  {/* Quantity */}

                  <div>

                    <span>
                      {t('Quantity')}
                    </span>

                    <strong>
                      {parchi.quantity}{' '}
                      {parchi.unit}
                    </strong>

                  </div>

                  {/* Price */}

                  <div>

                    <span>
                      {t('Price / Unit')}
                    </span>

                    <strong>
                      {formatCurrency(
                        parchi.pricePerUnit,
                      )}
                    </strong>

                  </div>

                  {/* Total */}

                  <div className="parchi-total">

                    <span>
                      {t('Total Amount')}
                    </span>

                    <strong>
                      {formatCurrency(
                        parchi.totalAmount,
                      )}
                    </strong>

                  </div>

                </div>

              </div>

            ))}

          </div>
        )}

      <QrModal
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        entityType="parchi"
        entityId={qrTarget?._id}
        title={t('Parchi QR — {0}', qrTarget?.parchiNumber || '')}
        description={t('Your tamper-proof digital sale receipt. Every status change is hash-chained to a shared ledger.')}
      />

    </div>
  );
};

export default Parchi;