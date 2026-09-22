import {
  useEffect,
  useState,
} from 'react';

import API_URL from '../config/api';

import { useLanguage } from '../context/LanguageContext';

import CropPicker from './CropPicker';

import './CropForm.css';

function CropForm({
  crop,
  token,
  initialName = '',
  onCropAdded,
  onCropUpdated,
  onCancel,
}) {
  const { t } = useLanguage();

  const [formData, setFormData] =
    useState({
      name: '',
      variety: '',
      area: '',
      areaUnit: 'acre',
      sowingDate: '',
      expectedHarvestDate: '',
      status: 'planned',
      notes: '',
    });

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [priceMap, setPriceMap] =
    useState({});

  const isEditing =
    Boolean(crop);

  // ==========================================
  // Live mandi prices (for the picker tags)
  // ==========================================

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${API_URL}/market-prices`,
        ).then((r) => r.json());

        const map = {};

        (res.data || []).forEach((entry) => {
          const name = String(
            entry.commodity || '',
          ).toLowerCase();

          if (name) {
            map[name] = {
              price: Number(
                entry.modalPrice || 0,
              ).toLocaleString('en-IN'),
              unit: entry.unit || 'quintal',
            };
          }
        });

        setPriceMap(map);
      } catch {
        // prices are optional
      }
    };

    load();
  }, []);


  // ==========================================
  // Load crop data when editing
  // ==========================================

  useEffect(() => {
    if (crop) {
      setFormData({
        name: crop.name || '',
        variety: crop.variety || '',
        area: crop.area ?? '',
        areaUnit:
          crop.areaUnit || 'acre',

        sowingDate:
          crop.sowingDate
            ? crop.sowingDate.slice(0, 10)
            : '',

        expectedHarvestDate:
          crop.expectedHarvestDate
            ? crop.expectedHarvestDate.slice(
                0,
                10,
              )
            : '',

        status:
          crop.status || 'planned',

        notes:
          crop.notes || '',
      });
    } else {
      setFormData({
        name: initialName || '',
        variety: '',
        area: '',
        areaUnit: 'acre',
        sowingDate: '',
        expectedHarvestDate: '',
        status: 'planned',
        notes: '',
      });
    }

    setError('');
  }, [crop, initialName]);


  // ==========================================
  // Handle form changes
  // ==========================================

  const handleChange = (
    event,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previousData) => ({
        ...previousData,
        [name]: value,
      }),
    );
  };


  // ==========================================
  // Submit
  // ==========================================

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    setError('');


    // ------------------------------------------
    // Authentication check
    // ------------------------------------------

    if (!token) {
      setError(
        t('Your session has expired. Please login again.'),
      );

      return;
    }


    // ------------------------------------------
    // Validation
    // ------------------------------------------

    if (
      !formData.name.trim()
    ) {
      setError(
        t('Please enter a crop name.'),
      );

      return;
    }


    if (
      !formData.area ||
      Number(formData.area) <= 0
    ) {
      setError(
        t('Please enter a valid area.'),
      );

      return;
    }


    // ------------------------------------------
    // API request
    // ------------------------------------------

    try {
      setSaving(true);

      const url = isEditing
        ? `${API_URL}/crops/${crop._id}`
        : `${API_URL}/crops`;

      const method =
        isEditing
          ? 'PUT'
          : 'POST';


      const response =
        await fetch(
          url,
          {
            method,

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              ...formData,

              name:
                formData.name.trim(),

              variety:
                formData.variety.trim(),

              area:
                Number(formData.area),

              notes:
                formData.notes.trim(),
            }),
          },
        );


      const result =
        await response.json();


      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          t(result.message) ||
            t(
              isEditing
                ? 'Failed to update crop.'
                : 'Failed to create crop.',
            ),
        );
      }


      // ----------------------------------------
      // Notify parent component
      // ----------------------------------------

      if (isEditing) {
        onCropUpdated(
          result.data,
        );
      } else {
        onCropAdded(
          result.data,
        );
      }

    } catch (err) {
      console.error(
        isEditing
          ? 'Update crop error:'
          : 'Create crop error:',
        err,
      );

      setError(
        t(err.message) ||
          t(
            isEditing
              ? 'Unable to update crop.'
              : 'Unable to save crop.',
          ),
      );

    } finally {
      setSaving(false);
    }
  };


  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="crop-form-card">

      {/* ========================================
          Header
      ======================================== */}

      <div className="crop-form-header">

        <div>

          <h2>
            {isEditing
              ? t('Edit Crop')
              : t('Add Crop')}
          </h2>

          <p>
            {isEditing
              ? t('Update your crop details.')
              : t('Enter the details of your crop.')}
          </p>

        </div>


        <button
          type="button"
          className="crop-form-close"
          onClick={onCancel}
          aria-label={t('Close form')}
          disabled={saving}
        >
          ×
        </button>

      </div>


      {/* ========================================
          Form
      ======================================== */}

      <form
        onSubmit={handleSubmit}
      >

        <div className="crop-form-grid">

          {/* Crop Name — pick from the list */}

          <div className="form-group form-group-full">

            <label htmlFor="name">
              {t('Crop Name')}{' '}
              <span>*</span>
            </label>

            <CropPicker
              value={formData.name}
              onValueChange={(name) =>
                setFormData((previous) => ({
                  ...previous,
                  name,
                }))
              }
              onSelect={(name) =>
                setFormData((previous) => ({
                  ...previous,
                  name,
                }))
              }
              priceMap={priceMap}
              compact
            />

          </div>


          {/* Variety */}

          <div className="form-group">

            <label htmlFor="variety">
              {t('Variety')}
            </label>

            <input
              id="variety"
              name="variety"
              type="text"
              placeholder={t('e.g. Arka Rakshak')}
              value={
                formData.variety
              }
              onChange={
                handleChange
              }
            />

          </div>


          {/* Area */}

          <div className="form-group">

            <label htmlFor="area">
              {t('Area')}{' '}
              <span>*</span>
            </label>

            <input
              id="area"
              name="area"
              type="number"
              min="0"
              step="0.01"
              placeholder={t('e.g. 2.5')}
              value={
                formData.area
              }
              onChange={
                handleChange
              }
              required
            />

          </div>


          {/* Area Unit */}

          <div className="form-group">

            <label htmlFor="areaUnit">
              {t('Area Unit')}
            </label>

            <select
              id="areaUnit"
              name="areaUnit"
              value={
                formData.areaUnit
              }
              onChange={
                handleChange
              }
            >

              <option value="acre">
                {t('Acre')}
              </option>

              <option value="hectare">
                {t('Hectare')}
              </option>

              <option value="gunta">
                {t('Gunta')}
              </option>

            </select>

          </div>


          {/* Sowing Date */}

          <div className="form-group">

            <label htmlFor="sowingDate">
              {t('Sowing Date')}
            </label>

            <input
              id="sowingDate"
              name="sowingDate"
              type="date"
              value={
                formData.sowingDate
              }
              onChange={
                handleChange
              }
            />

          </div>


          {/* Expected Harvest */}

          <div className="form-group">

            <label htmlFor="expectedHarvestDate">
              {t('Expected Harvest Date')}
            </label>

            <input
              id="expectedHarvestDate"
              name="expectedHarvestDate"
              type="date"
              value={
                formData.expectedHarvestDate
              }
              onChange={
                handleChange
              }
            />

          </div>


          {/* Status */}

          <div className="form-group">

            <label htmlFor="status">
              {t('Status')}
            </label>

            <select
              id="status"
              name="status"
              value={
                formData.status
              }
              onChange={
                handleChange
              }
            >

              <option value="planned">
                {t('Planned')}
              </option>

              <option value="growing">
                {t('Growing')}
              </option>

              <option value="ready">
                {t('Ready')}
              </option>

              <option value="harvested">
                {t('Harvested')}
              </option>

            </select>

          </div>


          {/* Notes */}

          <div className="form-group form-group-full">

            <label htmlFor="notes">
              {t('Notes')}
            </label>

            <textarea
              id="notes"
              name="notes"
              rows="4"
              placeholder={t('Add any additional notes...')}
              value={
                formData.notes
              }
              onChange={
                handleChange
              }
            />

          </div>

        </div>


        {/* ======================================
            Error
        ====================================== */}

        {error && (
          <div className="crop-form-error">
            {error}
          </div>
        )}


        {/* ======================================
            Actions
        ====================================== */}

        <div className="crop-form-actions">

          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={saving}
          >
            {t('Cancel')}
          </button>


          <button
            type="submit"
            className="primary-button"
            disabled={saving}
          >
            {saving
              ? isEditing
                ? t('Updating...')
                : t('Saving...')
              : isEditing
                ? t('Update Crop')
                : t('Save Crop')}
          </button>

        </div>

      </form>

    </div>
  );
}

export default CropForm;