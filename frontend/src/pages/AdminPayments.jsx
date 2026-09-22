import {
  useEffect,
  useState,
} from 'react';

import {
  CreditCard,
  RefreshCw,
  Save,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import './AdminDashboard.css';
import './AdminListPages.css';

const API_BASE_URL = API_URL;

const PAYMENT_STATUSES = [
  'pending',
  'initiated',
  'bank_details_shared',
  'transfer_submitted',
  'verification_pending',
  'success',
  'rejected',
  'failed',
  'cancelled',
];

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

function AdminPayments() {
  const { t } = useLanguage();

  const { token } = useAuth();

  const [parchis, setParchis] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [filter, setFilter] =
    useState('all');

  const [drafts, setDrafts] =
    useState({});

  const [savingId, setSavingId] =
    useState(null);

  const [notice, setNotice] =
    useState('');

  const fetchParchis = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/parchi`,
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
            t('Unable to fetch parchis.'),
        );
      }

      setParchis(data.data || []);
    } catch (err) {
      console.error(
        'Admin payments error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to load parchis.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchParchis();
    }
  }, [token]);

  const changeStatus = async (
    parchi,
    paymentStatus,
  ) => {
    setSavingId(parchi._id);
    setNotice('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/parchi/${parchi._id}/payment`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            paymentStatus,
            paymentReference:
              parchi.paymentReference ||
              '',
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Unable to update payment status.'),
        );
      }

      setNotice(
        t('Payment status updated for {0} — change recorded in the audit ledger.', parchi.parchiNumber),
      );

      fetchParchis();
    } catch (err) {
      console.error(
        'Payment status error:',
        err,
      );

      setNotice(
        t('Update failed: {0}', err.message),
      );
    } finally {
      setSavingId(null);
    }
  };

  const statusCount = (status) =>
    parchis.filter(
      (p) => p.paymentStatus === status,
    ).length;

  const filtered = parchis.filter(
    (parchi) => {
      const matchesFilter =
        filter === 'all' ||
        parchi.paymentStatus === filter;

      const haystack = [
        parchi.parchiNumber,
        parchi.trader?.name,
        parchi.farmer?.name,
        parchi.paymentReference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch =
        !search ||
        haystack.includes(
          search.toLowerCase(),
        );

      return (
        matchesFilter && matchesSearch
      );
    },
  );

  return (
    <div className="ks-admin-wrap">

      <div className="ks-admin-header">

        <div>
          <p className="ks-admin-label">
            {t('Administration')}
          </p>

          <h1>{t('Payment Monitoring')}</h1>

          <p>
            {t('Track and adjust Parchi payment statuses. Every change is audited.')}
          </p>
        </div>

        <div className="ks-admin-chip">
          <CreditCard size={16} />
          {t('{0} parchis', parchis.length)}
        </div>

      </div>

      {error && (
        <div className="ks-admin-error">
          {error}

          <button
            type="button"
            onClick={fetchParchis}
          >
            {t('Retry')}
          </button>
        </div>
      )}

      {notice && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px 14px',
            background: '#eefaf1',
            border: '1px solid #cde8d6',
            borderRadius: '10px',
            color: '#237651',
            fontSize: '12.5px',
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      )}

      <div className="ks-admin-summary">

        <div className="ks-admin-summary-card">
          <span>{t('Pending')}</span>
          <strong>
            {statusCount('pending')}
          </strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Initiated')}</span>
          <strong>
            {statusCount('initiated')}
          </strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Successful')}</span>
          <strong>
            {statusCount('success')}
          </strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Rejected / failed')}</span>
          <strong>
            {statusCount('rejected') +
              statusCount('failed')}
          </strong>
        </div>

      </div>

      <div className="ks-admin-toolbar">

        <input
          type="text"
          className="ks-admin-search"
          placeholder={t('Search parchi, farmer, trader or reference…')}
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          className="ks-admin-select"
          value={filter}
          onChange={(e) =>
            setFilter(e.target.value)
          }
        >
          <option value="all">
            {t('All payment statuses')}
          </option>

          {PAYMENT_STATUSES.map(
            (status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ),
          )}
        </select>

        <button
          type="button"
          className="ks-admin-refresh"
          onClick={fetchParchis}
        >
          <RefreshCw size={14} />
          {t('Refresh')}
        </button>

      </div>

      <div className="admin-panel">

        {loading ? (
          <p className="ks-admin-empty">
            {t('Loading parchis…')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="ks-admin-empty">
            {t('No parchis match your filters.')}
          </p>
        ) : (
          <div className="ks-admin-table-card">

            <table className="ks-admin-table">

              <thead>
                <tr>
                  <th>{t('Parchi')}</th>
                  <th>{t('Trader')}</th>
                  <th>{t('Farmer')}</th>
                  <th>{t('Total')}</th>
                  <th>{t('Reference')}</th>
                  <th>{t('Payment status')}</th>
                  <th>{t('Update')}</th>
                </tr>
              </thead>

              <tbody>

                {filtered.map((parchi) => (
                  <tr key={parchi._id}>

                    <td>
                      {parchi.parchiNumber}
                    </td>

                    <td>
                      {parchi.trader?.name ||
                        '—'}
                    </td>

                    <td>
                      {parchi.farmer?.name ||
                        '—'}
                    </td>

                    <td>
                      {formatCurrency(
                        parchi.totalAmount ||
                          parchi.amount,
                      )}
                    </td>

                    <td>
                      {parchi.paymentReference ||
                        '—'}

                      <span className="ks-admin-sub">
                        {new Date(
                          parchi.createdAt,
                        ).toLocaleDateString(
                          'en-IN',
                          {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          },
                        )}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`ks-badge ${parchi.paymentStatus}`}
                      >
                        {parchi.paymentStatus}
                      </span>
                    </td>

                    <td>
                      <form
                        className="ks-status-form"
                        onSubmit={(e) => {
                          e.preventDefault();

                          changeStatus(
                            parchi,
                            drafts[
                              parchi._id
                            ] ||
                              parchi
                                .paymentStatus,
                          );
                        }}
                      >
                        <select
                          value={
                            drafts[
                              parchi._id
                            ] ||
                            parchi.paymentStatus
                          }
                          onChange={(e) =>
                            setDrafts({
                              ...drafts,
                              [parchi._id]:
                                e.target
                                  .value,
                            })
                          }
                        >
                          {PAYMENT_STATUSES.map(
                            (status) => (
                              <option
                                key={status}
                                value={status}
                              >
                                {status}
                              </option>
                            ),
                          )}
                        </select>

                        <button
                          type="submit"
                          className="ks-admin-btn"
                          disabled={
                            savingId ===
                              parchi._id ||
                            (drafts[
                              parchi._id
                            ] ||
                              parchi
                                .paymentStatus) ===
                              parchi
                                .paymentStatus
                          }
                        >
                          <Save size={13} />
                          {savingId ===
                          parchi._id
                            ? t('Saving…')
                            : t('Save')}
                        </button>
                      </form>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

    </div>
  );
}

export default AdminPayments;