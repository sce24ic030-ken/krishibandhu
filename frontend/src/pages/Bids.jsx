import { useCallback, useEffect, useState } from 'react';

import {
  CheckCircle2,
  Clock3,
  QrCode,
  RefreshCw,
  ShoppingBag,
  X,
  XCircle,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import API_URL from '../config/api';
import QrModal from '../components/QrModal';

import './Bids.css';

const API_BASE_URL = API_URL;

const getStatusClass = (status) => {
  switch (status) {
    case 'accepted':
      return 'bid-status accepted';

    case 'rejected':
      return 'bid-status rejected';

    default:
      return 'bid-status pending';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'accepted':
      return 'Accepted';

    case 'rejected':
      return 'Rejected';

    default:
      return 'Pending';
  }
};

const formatDate = (dateString) => {
  if (!dateString) {
    return '-';
  }

  return new Date(dateString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

function Bids() {
  const { token } = useAuth();

  const { t } = useLanguage();

  const [qrTarget, setQrTarget] = useState(null);

  const [bids, setBids] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingBidId, setUpdatingBidId] = useState('');

  const [error, setError] = useState('');

  /*
   * ==========================================
   * Fetch Farmer Bids
   * ==========================================
   *
   * Backend automatically filters bids so that
   * farmers only receive bids for their own crops.
   */

  const fetchBids = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setLoading(false);
        setError(
          t('Your login session has expired. Please login again.'),
        );
        return;
      }

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError('');

        const response = await fetch(
          `${API_BASE_URL}/bids`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            t(result.message) ||
              t('Failed to fetch bids.'),
          );
        }

        setBids(result.data || []);
      } catch (err) {
        console.error(
          'Fetch farmer bids error:',
          err,
        );

        setError(
          t(err.message) ||
            t('Unable to load bids. Please make sure the backend is running.'),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    fetchBids();
  }, [fetchBids]);

  /*
   * ==========================================
   * Update Bid Status
   * ==========================================
   */

  const updateBidStatus = async (
    bidId,
    status,
  ) => {
    const action =
      status === 'accepted'
        ? 'accept'
        : 'reject';

    const confirmed = window.confirm(
      status === 'accepted'
        ? t('Are you sure you want to accept this bid?')
        : t('Are you sure you want to reject this bid?'),
    );

    if (!confirmed) {
      return;
    }

    if (!token) {
      setError(
        t('Your login session has expired. Please login again.'),
      );
      return;
    }

    try {
      setUpdatingBidId(bidId);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/bids/${bidId}/status`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            status,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          t(result.message) ||
            t('Failed to update bid status.'),
        );
      }

      setBids((currentBids) =>
        currentBids.map((bid) =>
          bid._id === bidId
            ? result.data
            : bid,
        ),
      );
    } catch (err) {
      console.error(
        'Update bid status error:',
        err,
      );

      setError(
        t(err.message) ||
          t('Failed to update the bid status.'),
      );
    } finally {
      setUpdatingBidId('');
    }
  };

  /*
   * ==========================================
   * Statistics
   * ==========================================
   */

  const pendingCount = bids.filter(
    (bid) => bid.status === 'pending',
  ).length;

  const acceptedCount = bids.filter(
    (bid) => bid.status === 'accepted',
  ).length;

  const rejectedCount = bids.filter(
    (bid) => bid.status === 'rejected',
  ).length;

  return (
    <div className="bids-page">

      {/* ==========================================
          Header
      ========================================== */}

      <div className="bids-page-header">

        <div>

          <p className="bids-eyebrow">
            🌾 KrishiBandhu
          </p>

          <h1>
            {t('Bids Received')}
          </h1>

          <p className="bids-subtitle">
            {t('Review buyer offers for your crops and decide which bids to accept.')}
          </p>

        </div>

        <div className="bids-header-actions">

          <button
            type="button"
            className="bids-refresh-button"
            onClick={() =>
              fetchBids(true)
            }
            disabled={
              loading || refreshing
            }
          >

            <RefreshCw
              size={18}
              className={
                refreshing
                  ? 'spinning'
                  : ''
              }
            />

            {refreshing
              ? t('Refreshing...')
              : t('Refresh')}

          </button>

        </div>

      </div>


      {/* ==========================================
          Summary
      ========================================== */}

      <div className="bid-summary-grid">

        <div className="bid-summary-card">

          <div className="bid-summary-icon total">
            <ShoppingBag size={21} />
          </div>

          <div>

            <span>
              {t('Total Bids')}
            </span>

            <strong>
              {bids.length}
            </strong>

          </div>

        </div>


        <div className="bid-summary-card">

          <div className="bid-summary-icon pending">
            <Clock3 size={21} />
          </div>

          <div>

            <span>
              {t('Pending')}
            </span>

            <strong>
              {pendingCount}
            </strong>

          </div>

        </div>


        <div className="bid-summary-card">

          <div className="bid-summary-icon accepted">
            <CheckCircle2 size={21} />
          </div>

          <div>

            <span>
              {t('Accepted')}
            </span>

            <strong>
              {acceptedCount}
            </strong>

          </div>

        </div>


        <div className="bid-summary-card">

          <div className="bid-summary-icon rejected">
            <XCircle size={21} />
          </div>

          <div>

            <span>
              {t('Rejected')}
            </span>

            <strong>
              {rejectedCount}
            </strong>

          </div>

        </div>

      </div>


      {/* ==========================================
          Error
      ========================================== */}

      {error && (

        <div className="bids-error">

          <XCircle size={20} />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* ==========================================
          Loading
      ========================================== */}

      {loading ? (

        <div className="bids-state-card">

          <div className="bids-loader" />

          <h3>
            {t('Loading bids...')}
          </h3>

          <p>
            {t('Fetching the latest buyer offers for your crops.')}
          </p>

        </div>

      ) : bids.length === 0 ? (

        /* ==========================================
           Empty State
        ========================================== */

        <div className="bids-state-card">

          <div className="bids-empty-icon">
            <ShoppingBag size={30} />
          </div>

          <h3>
            {t('No bids yet')}
          </h3>

          <p>
            {t('Buyer offers will appear here when traders place bids on your crop listings.')}
          </p>

        </div>

      ) : (

        /* ==========================================
           Bid List
        ========================================== */

        <div className="bids-list">

          {bids.map((bid) => (

            <article
              className="bid-card"
              key={bid._id}
            >

              {/* Card Header */}

              <div className="bid-card-top">

                <div className="bid-crop-info">

                  <div className="bid-crop-icon">
                    🌾
                  </div>

                  <div>

                    <h2>
                      {bid.crop?.name ||
                        t('Unknown Crop')}
                    </h2>

                    <p>
                      {bid.crop?.variety
                        ? bid.crop.variety
                        : t('Variety not specified')}
                    </p>

                  </div>

                </div>


                <span
                  className={getStatusClass(
                    bid.status,
                  )}
                >
                  {t(getStatusLabel(
                    bid.status,
                  ))}
                </span>

              </div>


              {/* Bid Details */}

              <div className="bid-details-grid">

                <div className="bid-detail">

                  <span>
                    {t('Market')}
                  </span>

                  <strong>
                    {bid.market?.name ||
                      t('Unknown Market')}
                  </strong>

                </div>


                <div className="bid-detail">

                  <span>
                    {t('Buyer')}
                  </span>

                  <strong>
                    {bid.buyer?.name ||
                      bid.buyerName ||
                      t('Unknown Buyer')}
                  </strong>

                </div>


                <div className="bid-detail">

                  <span>
                    {t('Contact')}
                  </span>

                  <strong>
                    {bid.buyer?.phone ||
                      bid.buyerContact ||
                      '-'}
                  </strong>

                </div>


                <div className="bid-detail">

                  <span>
                    {t('Quantity')}
                  </span>

                  <strong>
                    {bid.quantity}{' '}
                    {bid.saleListing?.unit ||
                      'unit'}
                  </strong>

                </div>


                <div className="bid-detail">

                  <span>
                    {t('Price / Unit')}
                  </span>

                  <strong>
                    {formatCurrency(
                      bid.pricePerUnit,
                    )}
                  </strong>

                </div>


                <div className="bid-detail highlight">

                  <span>
                    {t('Total Offer')}
                  </span>

                  <strong>
                    {formatCurrency(
                      bid.totalAmount,
                    )}
                  </strong>

                </div>

              </div>


              {/* Message */}

              {bid.message && (

                <div className="bid-message">

                  <span>
                    {t('Message')}
                  </span>

                  <p>
                    {bid.message}
                  </p>

                </div>

              )}


              {/* Footer */}

              <div className="bid-card-footer">

                <span className="bid-date">

                  {t('Received {0}', formatDate(bid.createdAt))}

                </span>


                <div className="bid-actions">

                  {bid.status ===
                    'pending' && (

                    <>

                      <button
                        type="button"
                        className="bid-action accept"
                        onClick={() =>
                          updateBidStatus(
                            bid._id,
                            'accepted',
                          )
                        }
                        disabled={
                          updatingBidId ===
                          bid._id
                        }
                      >

                        <CheckCircle2
                          size={17}
                        />

                        {updatingBidId ===
                        bid._id
                          ? t('Updating...')
                          : t('Accept')}

                      </button>


                      <button
                        type="button"
                        className="bid-action reject"
                        onClick={() =>
                          updateBidStatus(
                            bid._id,
                            'rejected',
                          )
                        }
                        disabled={
                          updatingBidId ===
                          bid._id
                        }
                      >

                        <XCircle
                          size={17}
                        />

                        {t('Reject')}

                      </button>

                    </>

                  )}

                  <button
                    type="button"
                    className="bid-action qr"
                    onClick={() =>
                      setQrTarget(bid)
                    }
                  >
                    <QrCode size={17} />
                    {t('Match QR')}
                  </button>

                </div>

              </div>

            </article>

          ))}

        </div>

      )}

      <QrModal
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        entityType="bid"
        entityId={qrTarget?._id}
        title={t('Bid Match QR')}
        description={t('Weighbridge and lot-match verification for this bid. Scan to confirm the delivery matches the accepted offer.')}
      />

    </div>
  );
}

export default Bids;