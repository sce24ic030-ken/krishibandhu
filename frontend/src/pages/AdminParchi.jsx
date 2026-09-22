import {
  useEffect,
  useState,
} from 'react';

import {
  FileText,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import { getParchiAudit } from '../services/analyticsService';

import './AdminDashboard.css';
import './AdminListPages.css';

const API_BASE_URL = API_URL;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const badgeFor = (status) => {
  return `ks-badge ${status || 'pending'}`;
};

function AdminParchi() {
  const { t } = useLanguage();

  const { token } = useAuth();

  const [parchis, setParchis] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [auditing, setAuditing] =
    useState(null);

  const [auditData, setAuditData] =
    useState(null);

  const [auditLoading, setAuditLoading] =
    useState(false);

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
        'Admin parchis error:',
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

  const openAudit = async (parchi) => {
    setAuditing(parchi);
    setAuditData(null);
    setAuditLoading(true);

    try {
      const data = await getParchiAudit(
        parchi._id,
      );

      setAuditData(data);
    } catch (err) {
      console.error(
        'Parchi audit error:',
        err,
      );

      setAuditData({
        error: err.message,
      });
    } finally {
      setAuditLoading(false);
    }
  };

  const filtered = parchis.filter(
    (parchi) => {
      const matchesStatus =
        statusFilter === 'all' ||
        parchi.status === statusFilter ||
        parchi.paymentStatus ===
          statusFilter;

      const haystack = [
        parchi.parchiNumber,
        parchi.farmer?.name,
        parchi.trader?.name,
        parchi.crop?.name,
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
        matchesStatus && matchesSearch
      );
    },
  );

  const issuedCount = parchis.length;

  const pendingCount = parchis.filter(
    (p) =>
      p.paymentStatus !== 'success' &&
      p.status !== 'paid' &&
      p.status !== 'cancelled',
  ).length;

  const paidCount = parchis.filter(
    (p) =>
      p.paymentStatus === 'success' ||
      p.status === 'paid',
  ).length;

  const chain = auditData?.chain;

  return (
    <div className="ks-admin-wrap">

      <div className="ks-admin-header">

        <div>
          <p className="ks-admin-label">
            {t('Administration')}
          </p>

          <h1>{t('Parchi Registry')}</h1>

          <p>
            {t('Digital sale receipts with tamper-proof hash-chained ledgers.')}
          </p>
        </div>

        <div className="ks-admin-chip">
          <FileText size={16} />
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

      <div className="ks-admin-summary">

        <div className="ks-admin-summary-card">
          <span>{t('Issued')}</span>
          <strong>{issuedCount}</strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Awaiting payment')}</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Settled')}</span>
          <strong>{paidCount}</strong>
        </div>

      </div>

      <div className="ks-admin-toolbar">

        <input
          type="text"
          className="ks-admin-search"
          placeholder={t('Search parchi number, farmer, trader or crop…')}
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

          <option value="issued">
            {t('Issued')}
          </option>

          <option value="bank_details_shared">
            {t('Bank details shared')}
          </option>

          <option value="transfer_submitted">
            {t('Transfer submitted')}
          </option>

          <option value="paid">
            {t('Paid')}
          </option>

          <option value="completed">
            {t('Completed')}
          </option>

          <option value="cancelled">
            {t('Cancelled')}
          </option>
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
                  <th>{t('Farmer')}</th>
                  <th>{t('Trader')}</th>
                  <th>{t('Crop')}</th>
                  <th>{t('Total')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Payment')}</th>
                  <th>{t('Audit')}</th>
                </tr>
              </thead>

              <tbody>

                {filtered.map((parchi) => (
                  <tr key={parchi._id}>

                    <td>
                      {parchi.parchiNumber}

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
                      {parchi.farmer?.name ||
                        '—'}
                    </td>

                    <td>
                      {parchi.trader?.name ||
                        '—'}
                    </td>

                    <td>
                      {parchi.crop?.name ||
                        '—'}
                    </td>

                    <td>
                      {formatCurrency(
                        parchi.totalAmount ||
                          parchi.amount,
                      )}
                    </td>

                    <td>
                      <span
                        className={badgeFor(
                          parchi.status,
                        )}
                      >
                        {parchi.status}
                      </span>
                    </td>

                    <td>
                      <span
                        className={badgeFor(
                          parchi.paymentStatus,
                        )}
                      >
                        {parchi.paymentStatus}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="ks-admin-btn"
                        onClick={() =>
                          openAudit(parchi)
                        }
                        disabled={
                          auditing?._id ===
                          parchi._id
                        }
                      >
                        {auditing?._id ===
                        parchi._id ? (
                          t('Auditing…')
                        ) : (
                          <>
                            <ShieldCheck
                              size={13}
                            />
                            {t('Audit')}
                          </>
                        )}
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* Audit modal */}

      {auditing && (
        <div
          className="ks-audit-overlay"
          onClick={() => setAuditing(null)}
        >
          <div
            className="ks-audit-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="ks-audit-modal-header">

              <div>
                <h3>
                  {auditData?.parchi?.parchiNumber ||
                    auditing.parchiNumber}
                </h3>

                <p
                  style={{
                    margin: '4px 0 0',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                  }}
                >
                  {t('Chain integrity & deduction audit')}
                </p>
              </div>

              <button
                type="button"
                className="ks-audit-close"
                onClick={() =>
                  setAuditing(null)
                }
              >
                <X size={18} />
              </button>

            </div>

            {auditLoading ? (
              <p className="ks-admin-empty">
                {t('Verifying hash chain…')}
              </p>
            ) : auditData?.error ? (
              <p className="ks-admin-error">
                {auditData.error}
              </p>
            ) : (
              <>
                <div
                  className={`ks-audit-status ${
                    auditData?.chainValid
                      ? 'ok'
                      : 'bad'
                  }`}
                >
                  {auditData?.chainValid ? (
                    <>
                      <ShieldCheck size={18} />
                      {t('Chain intact — {0} blocks verified', chain?.length)}
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={18} />
                      {t('Chain integrity compromised — {0} tampered block(s)', chain?.tamperedBlocks?.length || 0)}
                    </>
                  )}
                </div>

                <div className="ks-audit-section">

                  <h4>
                    {t('Payment status')}
                  </h4>

                  <div className="ks-audit-row">
                    <span>{t('Status')}</span>
                    <strong>
                      {auditData?.parchi?.status}
                    </strong>
                  </div>

                  <div className="ks-audit-row">
                    <span>{t('Payment')}</span>
                    <strong>
                      {auditData?.parchi?.paymentStatus}
                    </strong>
                  </div>

                  <div className="ks-audit-row">
                    <span>{t('Total value')}</span>
                    <strong>
                      {formatCurrency(
                        auditData?.parchi?.total,
                      )}
                    </strong>
                  </div>

                  <div className="ks-audit-row">
                    <span>{t('Deductions recorded')}</span>
                    <strong>
                      {formatCurrency(
                        auditData?.parchi?.deductions,
                      )}
                    </strong>
                  </div>

                </div>

                <div className="ks-audit-section">

                  <h4>{t('Ledger blocks')}</h4>

                  {(chain?.blocks || [])
                    .slice(-6)
                    .map((block, index) => (
                      <div
                        className="ks-audit-row"
                        key={index}
                      >
                        <span>
                          {block.action || block.type}
                        </span>

                        <strong>
                          {new Date(
                            block.timestamp,
                          ).toLocaleString(
                            'en-IN',
                            {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )}
                        </strong>
                      </div>
                    ))}

                  {(chain?.blocks || []).length >
                    6 && (
                    <p className="ks-audit-note">
                      +{' '}
                      {chain.blocks.length - 6}{' '}
                      {t('more blocks')}
                    </p>
                  )}

                </div>

                <div className="ks-audit-section">

                  <h4>
                    {t('Deduction check (reference 1–2%)')}
                  </h4>

                  {(auditData?.deductionCheck?.flags ||
                    []).length === 0 ? (
                    <p
                      style={{
                        color: 'var(--success)',
                        fontSize: '12px',
                        fontWeight: 700,
                      }}
                    >
                      {t('No anomalies — deductions within reference.')}
                    </p>
                  ) : (
                    (auditData?.deductionCheck?.flags ||
                      []).map((flag, index) => (
                      <div
                        className="ks-audit-row"
                        key={index}
                      >
                        <span>
                          {flag.severity} ·{' '}
                          {flag.code}
                        </span>

                        <strong>
                          {flag.message}
                        </strong>
                      </div>
                    ))
                  )}

                </div>
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default AdminParchi;