import {
  useEffect,
  useState,
} from 'react';

import PageHeader from '../components/PageHeader';
import CropForm from '../components/CropForm';
import CropPicker from '../components/CropPicker';
import QrModal from '../components/QrModal';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import './Crops.css';

const API_BASE_URL = API_URL;

function Crops() {
  const {
    token,
    user,
  } = useAuth();

  const { t } = useLanguage();

  const [crops, setCrops] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [showForm, setShowForm] =
    useState(false);

  const [editingCrop, setEditingCrop] =
    useState(null);

  const [deletingCropId, setDeletingCropId] =
    useState(null);

  const [qrTarget, setQrTarget] =
    useState(null);

  const [priceMap, setPriceMap] =
    useState({});

  const [catalogPreset, setCatalogPreset] =
    useState('');

  // ==========================================
  // Live mandi prices (tags on the catalog)
  // ==========================================

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/market-prices`,
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
  // Fetch Farmer's Crops
  // ==========================================

  const fetchCrops = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/crops`,
        {
          method: 'GET',

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          t(result.message) ||
            t('Failed to fetch crops.'),
        );
      }

      if (result.success) {
        setCrops(result.data);
      } else {
        throw new Error(
          t(result.message) ||
            t('Failed to fetch crops.'),
        );
      }
    } catch (err) {
      console.error(
        'Fetch crops error:',
        err,
      );

      setError(
        t(err.message) ||
          t('Unable to load crops. Please try again.'),
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Load crops after authentication
  // ==========================================

  useEffect(() => {
    if (token) {
      fetchCrops();
    }
  }, [token]);

  // ==========================================
  // Crop Added
  // ==========================================

  const handleCropAdded = (
    newCrop,
  ) => {
    setCrops(
      (previousCrops) => [
        newCrop,
        ...previousCrops,
      ],
    );

    setCatalogPreset('');

    setShowForm(false);
  };

  // ==========================================
  // Edit Crop
  // ==========================================

  const handleEdit = (
    crop,
  ) => {
    setEditingCrop(crop);
    setShowForm(true);
  };

  // ==========================================
  // Crop Updated
  // ==========================================

  const handleCropUpdated = (
    updatedCrop,
  ) => {
    setCrops(
      (previousCrops) =>
        previousCrops.map(
          (crop) =>
            crop._id ===
            updatedCrop._id
              ? updatedCrop
              : crop,
        ),
    );

    setEditingCrop(null);
    setCatalogPreset('');
    setShowForm(false);
  };

  // ==========================================
  // Catalog → add a specific crop
  // ==========================================

  const handleCatalogAdd = (name) => {
    setCatalogPreset(name);
    setEditingCrop(null);
    setShowForm(true);
  };

  // ==========================================
  // Cancel Form
  // ==========================================

  const handleCancel = () => {
    setEditingCrop(null);
    setCatalogPreset('');
    setShowForm(false);
  };

  // ==========================================
  // Delete Crop
  // ==========================================

  const handleDelete = async (
    cropId,
  ) => {
    const confirmed =
      window.confirm(
        t('Are you sure you want to delete this crop?'),
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingCropId(cropId);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/crops/${cropId}`,
        {
          method: 'DELETE',

          headers: {
            Authorization: `Bearer ${token}`,
          },
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
            t('Failed to delete crop.'),
        );
      }

      setCrops(
        (previousCrops) =>
          previousCrops.filter(
            (crop) =>
              crop._id !== cropId,
          ),
      );
    } catch (err) {
      console.error(
        'Delete crop error:',
        err,
      );

      setError(
        t(err.message) ||
          t('Unable to delete crop.'),
      );
    } finally {
      setDeletingCropId(null);
    }
  };

  // ==========================================
  // Derived stats
  // ==========================================

  const areaAcres = crops.reduce(
    (sum, crop) => {
      const a = Number(crop.area) || 0;

      if (crop.areaUnit === 'hectare') {
        return sum + a * 2.47105;
      }

      if (crop.areaUnit === 'gunta') {
        return sum + a * 0.0247;
      }

      return sum + a;
    },
    0,
  );

  const statusCounts = crops.reduce(
    (acc, crop) => {
      acc[crop.status] =
        (acc[crop.status] || 0) + 1;
      return acc;
    },
    {},
  );

  const formatArea = (n) =>
    n >= 100
      ? Math.round(n).toLocaleString('en-IN')
      : (Math.round(n * 100) / 100).toLocaleString('en-IN');

  // ==========================================
  // Render
  // ==========================================

  return (
    <main className="dashboard">

      <PageHeader
        title={t('My Crops')}
        description={t('Manage and monitor your crops.')}
      />

      {showForm ? (

        <CropForm
          initialName={catalogPreset}
          crop={editingCrop}
          token={token}
          onCropAdded={
            handleCropAdded
          }
          onCropUpdated={
            handleCropUpdated
          }
          onCancel={
            handleCancel
          }
        />

      ) : (

        <div className="crops-page-card">

          {/* ==================================
              Stats strip
          ================================== */}

          {!loading &&
            !error &&
            crops.length > 0 && (
              <div className="crops-stats">

                <div className="crops-stat">
                  <strong>
                    {crops.length}
                  </strong>
                  <span>
                    {crops.length === 1
                      ? t('crop')
                      : t('crops')}
                  </span>
                </div>

                <div className="crops-stat">
                  <strong>
                    {formatArea(areaAcres)}
                  </strong>
                  <span>
                    {t('acres')}
                  </span>
                </div>

                <div className="crops-stat">
                  <strong>
                    {statusCounts.growing || 0}
                  </strong>
                  <span>
                    {t('growing')}
                  </span>
                </div>

                <div className="crops-stat">
                  <strong>
                    {statusCounts.ready || 0}
                  </strong>
                  <span>
                    {t('ready')}
                  </span>
                </div>

              </div>
            )}

          {/* ==================================
              Header
          ================================== */}

          <div className="crops-section-header">

            <div>

              <h2>
                {t('Your Crops')}
              </h2>

              {!loading &&
                !error && (
                  <p>
                    {user?.name
                      ? t('{0}, you currently have', user.name)
                      : t('You currently have')}

                    {' '}{crops.length}{' '}

                    {crops.length === 1
                      ? t('crop')
                      : t('crops')}.
                  </p>
                )}

            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => {
                setEditingCrop(null);
                setCatalogPreset('');
                setShowForm(true);
              }}
            >
              + {t('Add Crop')}
            </button>

          </div>

          {/* ==================================
              Loading
          ================================== */}

          {loading && (
            <div className="crops-message">
              <p>
                {t('Loading your crops...')}
              </p>
            </div>
          )}

          {/* ==================================
              Error
          ================================== */}

          {error && (
            <div className="crops-message crops-error">
              <p>
                {error}
              </p>

              <button
                type="button"
                className="primary-button"
                onClick={fetchCrops}
              >
                {t('Try Again')}
              </button>
            </div>
          )}

          {/* ==================================
              Empty State
          ================================== */}

          {!loading &&
            !error &&
            crops.length === 0 && (

              <div className="crops-message">

                <div className="empty-crop-icon">
                  🌱
                </div>

                <h3>
                  {t('No crops added yet')}
                </h3>

                <p>
                  {t('Add your first crop to start managing your farm information.')}
                </p>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setEditingCrop(null);
                    setShowForm(true);
                  }}
                >
                  {t('Add Your First Crop')}
                </button>

              </div>

            )}

          {/* ==================================
              Crop Cards
          ================================== */}

          {!loading &&
            !error &&
            crops.length > 0 && (

              <div className="crops-grid">

                {crops.map(
                  (crop) => (

                    <div
                      className="crop-card"
                      key={crop._id}
                    >

                      <div className="crop-card-top">

                        <div className="crop-icon">
                          🌱
                        </div>

                        <span
                          className={`crop-status status-${crop.status}`}
                        >
                          {crop.status}
                        </span>

                      </div>

                      <div className="crop-card-title">

                        <h3>
                          {crop.name}
                        </h3>

                        {crop.variety && (
                          <p>
                            {crop.variety}
                          </p>
                        )}

                      </div>

                      <div className="crop-card-details">

                        <div className="crop-detail">

                          <span className="detail-label">
                            {t('Area')}
                          </span>

                          <strong>
                            {crop.area}{' '}
                            {crop.areaUnit}
                          </strong>

                        </div>

                        {crop.sowingDate && (

                          <div className="crop-detail">

                            <span className="detail-label">
                              {t('Sowing Date')}
                            </span>

                            <strong>
                              {new Date(
                                crop.sowingDate,
                              ).toLocaleDateString()}
                            </strong>

                          </div>

                        )}

                        {crop.expectedHarvestDate && (

                          <div className="crop-detail">

                            <span className="detail-label">
                              {t('Expected Harvest')}
                            </span>

                            <strong>
                              {new Date(
                                crop.expectedHarvestDate,
                              ).toLocaleDateString()}
                            </strong>

                          </div>

                        )}

                      </div>

                      {crop.notes && (

                        <div className="crop-notes">

                          <span>
                            {crop.notes}
                          </span>

                        </div>

                      )}

                      <div className="crop-card-actions">

                        <button
                          type="button"
                          className="qr-crop-button"
                          onClick={() =>
                            setQrTarget(crop)
                          }
                        >
                          {t('📱 Lot QR')}
                        </button>

                        <button
                          type="button"
                          className="edit-crop-button"
                          onClick={() =>
                            handleEdit(crop)
                          }
                        >
                          {t('✏️ Edit')}
                        </button>

                        <button
                          type="button"
                          className="delete-crop-button"
                          onClick={() =>
                            handleDelete(
                              crop._id,
                            )
                          }
                          disabled={
                            deletingCropId ===
                            crop._id
                          }
                        >
                          {deletingCropId ===
                          crop._id
                            ? t('Deleting...')
                            : t('🗑️ Delete')}
                        </button>

                      </div>

                    </div>

                  ),
                )}

              </div>

            )}

          {/* ==================================
              All crops catalog
          ================================== */}

          <div className="crops-catalog">

            <div className="crops-section-header crops-catalog-header">

              <div>

                <h2>
                  {t('All Crops')}
                </h2>

                <p>
                  {t('Choose any crop from the list to add it to your farm.')}
                </p>

              </div>

            </div>

            <CropPicker
              onAdd={handleCatalogAdd}
              priceMap={priceMap}
            />

          </div>

        </div>

      )}

      <QrModal
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        entityType="crop"
        entityId={qrTarget?._id}
        title={t('Crop Lot QR')}
        description={t('Track this crop lot from sowing to sale. Print or share this QR for traceability.')}
      />

    </main>
  );
}

export default Crops;