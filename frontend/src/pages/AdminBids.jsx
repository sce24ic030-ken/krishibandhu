import {
  useEffect,
  useState,
} from 'react';

import {
  Gavel,
  RefreshCw,
  ScanLine,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import QrModal from '../components/QrModal';

import './AdminDashboard.css';
import './AdminListPages.css';

const API_BASE_URL = API_URL;

const statusClass = (status) => {
  switch (status) {
    case 'accepted':
      return 'ks-badge accepted';

    case 'rejected':
      return 'ks-badge rejected';

    default:
      return 'ks-badge pending';
  }
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

function AdminBids() {
  const { t } = useLanguage();

  const { token } = useAuth();

  const [bids, setBids] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [qrTarget, setQrTarget] =
    useState(null);

  const fetchBids = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/bids`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Unable to fetch bids.'),
        );
      }

      setBids(data.data || []);
    } catch (err) {
      console.error(
        'Admin bids error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to load bids.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchBids();
    }
  }, [token]);

  const filtered = bids.filter((bid) => {
    const matchesStatus =
      statusFilter === 'all' ||
      bid.status === statusFilter;

    const haystack = [
      bid.crop?.name,
      bid.crop?.variety,
      bid.market?.name,
      bid.buyer?.name,
      bid.buyer?.email,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      !search ||
      haystack.includes(search.toLowerCase());

    return (
      matchesStatus && matchesSearch
    );
  });

  const pendingCount = bids.filter(
    (bid) => bid.status === 'pending',
  ).length;

  const acceptedCount = bids.filter(
    (bid) => bid.status === 'accepted',
  ).length;

  return (
    <div className="ks-admin-wrap">

      <div className="ks-admin-header">

        <div>
          <p className="ks-admin-label">
            {t('Administration')}
          </p>

          <h1>{t('Bid Management')}</h1>

          <p>
            {t('Monitor bidding activity across all markets.')}
          </p>
        </div>

        <div className="ks-admin-chip">
          <Gavel size={16} />
          {t('{0} bids', bids.length)}
        </div>

      </div>

      {error && (
        <div className="ks-admin-error">
          {error}

          <button
            type="button"
            onClick={fetchBids}
          >
            {t('Retry')}
          </button>
        </div>
      )}

      <div className="ks-admin-summary">

        <div className="ks-admin-summary-card">
          <span>{t('Total bids')}</span>
          <strong>{bids.length}</strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Pending')}</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Accepted')}</span>
          <strong>{acceptedCount}</strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Rejected')}</span>
          <strong>
            {bids.length - pendingCount -
              acceptedCount}
          </strong>
        </div>

      </div>

      <div className="ks-admin-toolbar">

        <input
          type="text"
          className="ks-admin-search"
          placeholder={t('Search by crop, market or buyer…')}
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          className="ks-admin-select"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            {t('All statuses')}
          </option>

          <option value="pending">
            {t('Pending')}
          </option>

          <option value="accepted">
            {t('Accepted')}
          </option>

          <option value="rejected">
            {t('Rejected')}
          </option>
        </select>

        <button
          type="button"
          className="ks-admin-refresh"
          onClick={fetchBids}
        >
          <RefreshCw size={14} />
          {t('Refresh')}
        </button>

      </div>

      <div className="admin-panel">

        {loading ? (
          <p className="ks-admin-empty">
            {t('Loading bids…')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="ks-admin-empty">
            {t('No bids match your filters.')}
          </p>
        ) : (
          <div className="ks-admin-table-card">

            <table className="ks-admin-table">

              <thead>
                <tr>
                  <th>{t('Crop')}</th>
                  <th>{t('Market')}</th>
                  <th>{t('Buyer')}</th>
                  <th>{t('Qty')}</th>
                  <th>{t('Bid price')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Date')}</th>
                  <th>{t('Trace')}</th>
                </tr>
              </thead>

              <tbody>

                {filtered.map((bid) => (
                  <tr key={bid._id}>

                    <td>
                      {bid.crop?.name ||
                        t('Unknown crop')}

                      <span className="ks-admin-sub">
                        {bid.crop?.variety ||
                          t('Variety not set')}
                      </span>
                    </td>

                    <td>
                      {bid.market?.name ||
                        t('Unknown market')}
                    </td>

                    <td>
                      {bid.buyer?.name ||
                        t('Unknown buyer')}

                      <span className="ks-admin-sub">
                        {bid.buyer?.email || ''}
                      </span>
                    </td>

                    <td>
                      {bid.quantity || 0}{' '}
                      {bid.unit || t('kg')}
                    </td>

                    <td>
                      {formatCurrency(
                        bid.price,
                      )}
                    </td>

                    <td>
                      <span
                        className={statusClass(
                          bid.status,
                        )}
                      >
                        {bid.status}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        bid.createdAt,
                      ).toLocaleDateString(
                        'en-IN',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        },
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="ks-admin-btn"
                        onClick={() =>
                          setQrTarget(bid)
                        }
                        title={t('Open match QR')}
                      >
                        <ScanLine size={13} />
                        {t('QR')}
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      <QrModal
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        entityType="bid"
        entityId={qrTarget?._id}
        title={t('Bid Match QR')}
        description={t("Verify this bid's lot at the weighbridge. Every scan is recorded in the trace ledger.")}
      />

    </div>
  );
}

export default AdminBids;