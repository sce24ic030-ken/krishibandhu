import {
  useEffect,
  useState,
} from 'react';

import {
  WalletCards,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

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

function AdminTransactions() {
  const { t } = useLanguage();

  const { token } = useAuth();

  const [transactions, setTransactions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [typeFilter, setTypeFilter] =
    useState('all');

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/transactions`,
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
            t('Unable to fetch transactions.'),
        );
      }

      setTransactions(data.data || []);
    } catch (err) {
      console.error(
        'Admin transactions error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to load transactions.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTransactions();
    }
  }, [token]);

  const filtered = transactions.filter(
    (tx) => {
      const matchesType =
        typeFilter === 'all' ||
        tx.type === typeFilter;

      const haystack = [
        tx.category,
        tx.description,
        tx.crop?.name,
        tx.market?.name,
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
        matchesType && matchesSearch
      );
    },
  );

  const totalIncome = transactions
    .filter((tx) => tx.type === 'income')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  const totalExpense = transactions
    .filter((tx) => tx.type === 'expense')
    .reduce((sum, tx) => sum + (tx.amount || 0), 0);

  return (
    <div className="ks-admin-wrap">

      <div className="ks-admin-header">

        <div>
          <p className="ks-admin-label">
            {t('Administration')}
          </p>

          <h1>{t('Transactions')}</h1>

          <p>
            {t('Ledger of all income and expense records.')}
          </p>
        </div>

        <div className="ks-admin-chip">
          <WalletCards size={16} />
          {t('{0} records', transactions.length)}
        </div>

      </div>

      {error && (
        <div className="ks-admin-error">
          {error}

          <button
            type="button"
            onClick={fetchTransactions}
          >
            {t('Retry')}
          </button>
        </div>
      )}

      <div className="ks-admin-summary">

        <div className="ks-admin-summary-card">
          <span>{t('Total income')}</span>
          <strong>
            {formatCurrency(totalIncome)}
          </strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Total expense')}</span>
          <strong>
            {formatCurrency(totalExpense)}
          </strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Net position')}</span>
          <strong>
            {formatCurrency(
              totalIncome - totalExpense,
            )}
          </strong>
        </div>

      </div>

      <div className="ks-admin-toolbar">

        <input
          type="text"
          className="ks-admin-search"
          placeholder={t('Search by category, crop or market…')}
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          className="ks-admin-select"
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value)
          }
        >
          <option value="all">
            {t('All types')}
          </option>

          <option value="income">
            {t('Income')}
          </option>

          <option value="expense">
            {t('Expense')}
          </option>
        </select>

        <button
          type="button"
          className="ks-admin-refresh"
          onClick={fetchTransactions}
        >
          <RefreshCw size={14} />
          {t('Refresh')}
        </button>

      </div>

      <div className="admin-panel">

        {loading ? (
          <p className="ks-admin-empty">
            {t('Loading transactions…')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="ks-admin-empty">
            {t('No transactions match your filters.')}
          </p>
        ) : (
          <div className="ks-admin-table-card">

            <table className="ks-admin-table">

              <thead>
                <tr>
                  <th>{t('Type')}</th>
                  <th>{t('Category')}</th>
                  <th>{t('Description')}</th>
                  <th>{t('Amount')}</th>
                  <th>{t('Crop')}</th>
                  <th>{t('Market')}</th>
                  <th>{t('Date')}</th>
                </tr>
              </thead>

              <tbody>

                {filtered.map((tx) => (
                  <tr key={tx._id}>

                    <td>
                      <span
                        className={`ks-badge ${
                          tx.type === 'income'
                            ? 'accepted'
                            : 'rejected'
                        }`}
                      >
                        {tx.type ===
                        'income' ? (
                          <ArrowDownLeft size={12} />
                        ) : (
                          <ArrowUpRight size={12} />
                        )}{' '}
                        {tx.type}
                      </span>
                    </td>

                    <td>
                      {tx.category}

                      <span className="ks-admin-sub">
                        #{tx._id?.slice(-6)}
                      </span>
                    </td>

                    <td>
                      {tx.description ||
                        '—'}
                    </td>

                    <td>
                      {formatCurrency(
                        tx.amount,
                      )}
                    </td>

                    <td>
                      {tx.crop?.name ||
                        '—'}
                    </td>

                    <td>
                      {tx.market?.name ||
                        '—'}
                    </td>

                    <td>
                      {new Date(
                        tx.transactionDate ||
                          tx.createdAt,
                      ).toLocaleString(
                        'en-IN',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        },
                      )}
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

export default AdminTransactions;