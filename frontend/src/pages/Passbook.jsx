import { useEffect, useMemo, useState } from 'react';
import './Passbook.css';

import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  IndianRupee,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';

import PageHeader from '../components/PageHeader';
import API_BASE_URL from '../config/api';
import { useLanguage } from '../context/LanguageContext';

const API_URL = `${API_BASE_URL}/transactions`;

const emptyForm = {
  type: 'income',
  category: '',
  description: '',
  amount: '',
  transactionDate: new Date().toISOString().split('T')[0],
};

function Passbook() {
  const { t } = useLanguage();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(API_URL);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || t('Failed to load transactions.'),
        );
      }

      setTransactions(result.data || []);
    } catch (err) {
      setError(
        err.message ||
          t('Unable to connect to the transaction server.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const totals = useMemo(() => {
    const income = transactions
      .filter((transaction) => transaction.type === 'income')
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0,
      );

    const expense = transactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0,
      );

    return {
      income,
      expense,
      balance: income - expense,
    };
  }, [transactions]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

  const formatDate = (date) => {
    if (!date) return '-';

    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      transactionDate: new Date()
        .toISOString()
        .split('T')[0],
    });
    setShowForm(true);
  };

  const openEditForm = (transaction) => {
    setEditingId(transaction._id);

    setForm({
      type: transaction.type || 'income',
      category: transaction.category || '',
      description: transaction.description || '',
      amount: transaction.amount || '',
      transactionDate: transaction.transactionDate
        ? new Date(transaction.transactionDate)
            .toISOString()
            .split('T')[0]
        : new Date().toISOString().split('T')[0],
    });

    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.category.trim()) {
      setError(t('Please enter a transaction category.'));
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      setError(t('Please enter a valid amount.'));
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload = {
        type: form.type,
        category: form.category.trim(),
        description: form.description.trim(),
        amount: Number(form.amount),
        transactionDate: form.transactionDate,
      };

      const url = editingId
        ? `${API_URL}/${editingId}`
        : API_URL;

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || t('Failed to save transaction.'),
        );
      }

      await fetchTransactions();

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      setError(
        err.message || t('Unable to save transaction.'),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (transactionId) => {
    const confirmed = window.confirm(
      t('Are you sure you want to delete this transaction?'),
    );

    if (!confirmed) return;

    try {
      setError('');

      const response = await fetch(
        `${API_URL}/${transactionId}`,
        {
          method: 'DELETE',
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || t('Failed to delete transaction.'),
        );
      }

      setTransactions((previous) =>
        previous.filter(
          (transaction) =>
            transaction._id !== transactionId,
        ),
      );
    } catch (err) {
      setError(
        err.message || t('Unable to delete transaction.'),
      );
    }
  };

  return (
    <main className="dashboard passbook-page">
      <PageHeader
        title={t('Passbook')}
        description={t('Track your agricultural income and expenses.')}
      />

      <div className="passbook-actions">
        <button
          type="button"
          className="passbook-refresh-btn"
          onClick={fetchTransactions}
          disabled={loading}
        >
          <RefreshCw size={17} />
          {t('Refresh')}
        </button>

        <button
          type="button"
          className="passbook-add-btn"
          onClick={openAddForm}
        >
          <Plus size={18} />
          {t('Add Transaction')}
        </button>
      </div>

      {error && (
        <div className="passbook-error">
          {error}
        </div>
      )}

      <section className="passbook-summary">
        <div className="passbook-summary-card balance">
          <div className="passbook-summary-icon">
            <Wallet size={22} />
          </div>

          <div>
            <span>{t('Current Balance')}</span>
            <strong>{formatCurrency(totals.balance)}</strong>
          </div>
        </div>

        <div className="passbook-summary-card income">
          <div className="passbook-summary-icon">
            <ArrowUpCircle size={22} />
          </div>

          <div>
            <span>{t('Total Income')}</span>
            <strong>{formatCurrency(totals.income)}</strong>
          </div>
        </div>

        <div className="passbook-summary-card expense">
          <div className="passbook-summary-icon">
            <ArrowDownCircle size={22} />
          </div>

          <div>
            <span>{t('Total Expenses')}</span>
            <strong>{formatCurrency(totals.expense)}</strong>
          </div>
        </div>
      </section>

      <section className="passbook-history-card">
        <div className="passbook-history-header">
          <div>
            <h2>{t('Transaction History')}</h2>
            <p>
              {transactions.length}{' '}
              {transactions.length === 1
                ? t('transaction')
                : t('transactions')}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="passbook-state">
            <RefreshCw size={24} className="spin" />
            <p>{t('Loading transactions...')}</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="passbook-state">
            <Wallet size={38} />
            <h3>{t('No transactions yet')}</h3>
            <p>
              {t('Add your first income or expense to start your passbook.')}
            </p>

            <button
              type="button"
              className="passbook-add-btn"
              onClick={openAddForm}
            >
              <Plus size={18} />
              {t('Add Transaction')}
            </button>
          </div>
        ) : (
          <div className="passbook-list">
            {transactions.map((transaction) => {
              const isIncome =
                transaction.type === 'income';

              return (
                <article
                  className="passbook-transaction"
                  key={transaction._id}
                >
                  <div
                    className={`transaction-type-icon ${
                      isIncome ? 'income' : 'expense'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpCircle size={22} />
                    ) : (
                      <ArrowDownCircle size={22} />
                    )}
                  </div>

                  <div className="transaction-main">
                    <div className="transaction-title-row">
                      <h3>{transaction.category}</h3>

                      <span
                        className={`transaction-badge ${
                          isIncome ? 'income' : 'expense'
                        }`}
                      >
                        {isIncome
                          ? t('Income')
                          : t('Expense')}
                      </span>
                    </div>

                    <p>
                      {transaction.description ||
                        t('No description')}
                    </p>

                    <div className="transaction-meta">
                      <span>
                        <CalendarDays size={14} />
                        {formatDate(
                          transaction.transactionDate,
                        )}
                      </span>

                      {transaction.crop?.name && (
                        <span>
                          🌾 {transaction.crop.name}
                        </span>
                      )}

                      {transaction.market?.name && (
                        <span>
                          🗺 {transaction.market.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="transaction-amount">
                    <strong
                      className={
                        isIncome ? 'income' : 'expense'
                      }
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(
                        transaction.amount,
                      )}
                    </strong>

                    <div className="transaction-actions">
                      <button
                        type="button"
                        title={t('Edit transaction')}
                        onClick={() =>
                          openEditForm(transaction)
                        }
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        type="button"
                        title={t('Delete transaction')}
                        onClick={() =>
                          handleDelete(transaction._id)
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="passbook-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeForm();
            }
          }}
        >
          <div className="passbook-modal">
            <div className="passbook-modal-header">
              <div>
                <h2>
                  {editingId
                    ? t('Edit Transaction')
                    : t('Add Transaction')}
                </h2>

                <p>
                  {t('Record your farm income or expense.')}
                </p>
              </div>

              <button
                type="button"
                className="passbook-close-btn"
                onClick={closeForm}
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="passbook-form"
              onSubmit={handleSubmit}
            >
              <div className="passbook-type-selector">
                <button
                  type="button"
                  className={
                    form.type === 'income'
                      ? 'active income'
                      : ''
                  }
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      type: 'income',
                    }))
                  }
                >
                  <ArrowUpCircle size={18} />
                  {t('Income')}
                </button>

                <button
                  type="button"
                  className={
                    form.type === 'expense'
                      ? 'active expense'
                      : ''
                  }
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      type: 'expense',
                    }))
                  }
                >
                  <ArrowDownCircle size={18} />
                  {t('Expense')}
                </button>
              </div>

              <label>
                {t('Category')}
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleInputChange}
                  placeholder={t('e.g. Crop Sale, Fertilizer')}
                  maxLength={100}
                  required
                />
              </label>

              <label>
                {t('Description')}
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder={t('Add a short description...')}
                  maxLength={300}
                  rows={3}
                />
              </label>

              <div className="passbook-form-row">
                <label>
                  {t('Amount (₹)')}
                  <div className="amount-input">
                    <IndianRupee size={17} />

                    <input
                      type="number"
                      name="amount"
                      value={form.amount}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                </label>

                <label>
                  {t('Date')}
                  <input
                    type="date"
                    name="transactionDate"
                    value={form.transactionDate}
                    onChange={handleInputChange}
                    required
                  />
                </label>
              </div>

              <div className="passbook-form-actions">
                <button
                  type="button"
                  className="passbook-cancel-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  {t('Cancel')}
                </button>

                <button
                  type="submit"
                  className="passbook-save-btn"
                  disabled={saving}
                >
                  {saving
                    ? t('Saving...')
                    : editingId
                      ? t('Update Transaction')
                      : t('Save Transaction')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Passbook;