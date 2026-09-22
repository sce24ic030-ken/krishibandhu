import { useState } from 'react';

import API_URL from '../config/api';

import { useLanguage } from '../context/LanguageContext';

import './AddMarketForm.css';

function AddMarketForm({
  onMarketAdded,
  onCancel,
}) {
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    name: '',
    district: '',
    type: 'Other',
    location: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!formData.name.trim()) {
      setError(t('Please enter the market name.'));
      return;
    }

    if (!formData.district.trim()) {
      setError(t('Please enter the district.'));
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        `${API_URL}/markets`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
          },

          body: JSON.stringify({
            name: formData.name.trim(),
            district: formData.district.trim(),
            type: formData.type,
            location: formData.location.trim(),
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          t(result.message) ||
            t('Failed to submit market.')
        );
      }

      setSuccess(
        t('Market submitted successfully and is pending verification.')
      );

      setFormData({
        name: '',
        district: '',
        type: 'Other',
        location: '',
      });

      if (onMarketAdded) {
        onMarketAdded(result.data);
      }
    } catch (err) {
      console.error(
        'Add market error:',
        err
      );

      setError(
        t(err.message) ||
          t('Unable to submit market.')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="add-market-form-card">
      {/* =====================================
          Header
      ====================================== */}

      <div className="add-market-form-header">
        <div>
          <h2>{t('Add Missing Market')}</h2>

          <p>
            {t("Can't find a market? Submit it for verification.")}
          </p>
        </div>

        <button
          type="button"
          className="add-market-form-close"
          onClick={onCancel}
          disabled={saving}
          aria-label={t('Close form')}
        >
          ×
        </button>
      </div>

      {/* =====================================
          Form
      ====================================== */}

      <form onSubmit={handleSubmit}>
        <div className="add-market-form-grid">

          {/* Market Name */}

          <div className="market-form-group">
            <label htmlFor="marketName">
              {t('Market Name')} <span>*</span>
            </label>

            <input
              id="marketName"
              name="name"
              type="text"
              placeholder={t('e.g. Nashik APMC')}
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* District */}

          <div className="market-form-group">
            <label htmlFor="marketDistrict">
              {t('District')} <span>*</span>
            </label>

            <input
              id="marketDistrict"
              name="district"
              type="text"
              placeholder={t('e.g. Nashik')}
              value={formData.district}
              onChange={handleChange}
              required
            />
          </div>

          {/* Market Type */}

          <div className="market-form-group">
            <label htmlFor="marketType">
              {t('Market Type')}
            </label>

            <select
              id="marketType"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="APMC">
                APMC
              </option>

              <option value="Sub-market">
                {t('Sub-market')}
              </option>

              <option value="Private Market">
                {t('Private Market')}
              </option>

              <option value="Other">
                {t('Other')}
              </option>
            </select>
          </div>

          {/* Location */}

          <div className="market-form-group">
            <label htmlFor="marketLocation">
              {t('Location')}
            </label>

            <input
              id="marketLocation"
              name="location"
              type="text"
              placeholder={t('e.g. Nashik, Maharashtra')}
              value={formData.location}
              onChange={handleChange}
            />
          </div>

        </div>

        {/* =====================================
            Information
        ====================================== */}

        <div className="market-form-info">
          <span>ℹ️</span>

          <p>
            {t('Submitted markets are marked as')}{' '}
            <strong>
              {t('pending verification')}
            </strong>{' '}
            {t('and are not treated as official markets until verified.')}
          </p>
        </div>

        {/* =====================================
            Error
        ====================================== */}

        {error && (
          <div className="market-form-error">
            {error}
          </div>
        )}

        {/* =====================================
            Success
        ====================================== */}

        {success && (
          <div className="market-form-success">
            {success}
          </div>
        )}

        {/* =====================================
            Actions
        ====================================== */}

        <div className="add-market-form-actions">
          <button
            type="button"
            className="market-form-cancel-button"
            onClick={onCancel}
            disabled={saving}
          >
            {t('Cancel')}
          </button>

          <button
            type="submit"
            className="market-form-submit-button"
            disabled={saving}
          >
            {saving
              ? t('Submitting...')
              : t('Submit Market')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddMarketForm;