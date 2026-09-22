import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Filter,
  Leaf,
  RefreshCw,
  Search,
  Sprout,
  Trash2,
  Wheat,
  X,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import './AdminCrops.css';

const API_BASE_URL =
  API_URL;

const STATUS_OPTIONS = [
  'all',
  'planned',
  'growing',
  'ready',
  'harvested',
];

const STATUS_LABELS = {
  planned: 'Planned',
  growing: 'Growing',
  ready: 'Ready',
  harvested: 'Harvested',
};

function AdminCrops() {
  const { t } = useLanguage();

  const { token } = useAuth();

  const [crops, setCrops] =
    useState([]);

  const [stats, setStats] =
    useState({
      total: 0,
      planned: 0,
      growing: 0,
      ready: 0,
      harvested: 0,
      area: {
        acre: 0,
        hectare: 0,
        gunta: 0,
      },
    });

  const [searchInput, setSearchInput] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState('all');

  const [loading, setLoading] =
    useState(true);

  const [statsLoading, setStatsLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    updatingCropId,
    setUpdatingCropId,
  ] = useState('');

  const [
    selectedCrop,
    setSelectedCrop,
  ] = useState(null);

  // ==========================================
  // Fetch Statistics
  // ==========================================

  const fetchStats = async () => {
    if (!token) {
      return;
    }

    try {
      setStatsLoading(true);

      const response =
        await fetch(
          `${API_BASE_URL}/admin/crops/stats`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            t('Failed to fetch crop statistics.'),
        );
      }

      setStats(
        result.stats || {
          total: 0,
          planned: 0,
          growing: 0,
          ready: 0,
          harvested: 0,
          area: {
            acre: 0,
            hectare: 0,
            gunta: 0,
          },
        },
      );
    } catch (requestError) {
      console.error(
        'Fetch crop stats error:',
        requestError,
      );
    } finally {
      setStatsLoading(false);
    }
  };

  // ==========================================
  // Fetch Crops
  // ==========================================

  const fetchCrops = async (
    currentSearch = search,
    currentStatus = status,
  ) => {
    if (!token) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const params =
        new URLSearchParams();

      if (
        currentSearch &&
        currentSearch.trim()
      ) {
        params.set(
          'search',
          currentSearch.trim(),
        );
      }

      if (
        currentStatus &&
        currentStatus !== 'all'
      ) {
        params.set(
          'status',
          currentStatus,
        );
      }

      params.set('limit', '100');

      const queryString =
        params.toString();

      const url =
        queryString
          ? `${API_BASE_URL}/admin/crops?${queryString}`
          : `${API_BASE_URL}/admin/crops`;

      const response =
        await fetch(url, {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        });

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            t('Failed to fetch crops.'),
        );
      }

      setCrops(
        Array.isArray(result.data)
          ? result.data
          : [],
      );
    } catch (requestError) {
      console.error(
        'Fetch admin crops error:',
        requestError,
      );

      setError(
        requestError.message ||
          t('Failed to fetch crops.'),
      );

      setCrops([]);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Initial Load
  // ==========================================

  useEffect(() => {
    fetchStats();
    fetchCrops('', 'all');
  }, [token]);

  // ==========================================
  // Search
  // ==========================================

  const handleSearch = () => {
    setSearch(
      searchInput.trim(),
    );

    fetchCrops(
      searchInput.trim(),
      status,
    );
  };

  // ==========================================
  // Status Filter
  // ==========================================

  const handleStatusChange = (
    event,
  ) => {
    const nextStatus =
      event.target.value;

    setStatus(nextStatus);

    fetchCrops(
      search,
      nextStatus,
    );
  };

  // ==========================================
  // Refresh
  // ==========================================

  const handleRefresh = async () => {
    setSearchInput(search);

    await Promise.all([
      fetchStats(),
      fetchCrops(
        search,
        status,
      ),
    ]);
  };

  // ==========================================
  // Clear Search
  // ==========================================

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');

    fetchCrops('', status);
  };

  // ==========================================
  // Delete Crop
  // ==========================================

  const deleteCrop = async (
    crop,
  ) => {
    const cropName =
      crop.name ||
      t('this crop');

    const confirmed =
      window.confirm(
        t('Are you sure you want to delete {0}? This action cannot be undone.', cropName),
      );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingCropId(
        crop._id,
      );
      setError('');

      const response =
        await fetch(
          `${API_BASE_URL}/admin/crops/${crop._id}`,
          {
            method: 'DELETE',
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            t('Failed to delete crop.'),
        );
      }

      setCrops((currentCrops) =>
        currentCrops.filter(
          (item) =>
            item._id !==
            crop._id,
        ),
      );

      if (
        selectedCrop?._id ===
        crop._id
      ) {
        setSelectedCrop(null);
      }

      await fetchStats();
    } catch (requestError) {
      console.error(
        'Delete admin crop error:',
        requestError,
      );

      setError(
        requestError.message ||
          t('Failed to delete crop.'),
      );
    } finally {
      setUpdatingCropId('');
    }
  };

  // ==========================================
  // Date Formatting
  // ==========================================

  const formatDate = (
    value,
  ) => {
    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return '—';
    }

    return date.toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    );
  };

  // ==========================================
  // Number Formatting
  // ==========================================

  const formatNumber = (
    value,
  ) => {
    return new Intl.NumberFormat(
      'en-IN',
      {
        maximumFractionDigits: 2,
      },
    ).format(
      Number(value) || 0,
    );
  };

  // ==========================================
  // Status Badge
  // ==========================================

  const getStatusClass = (
    cropStatus,
  ) => {
    switch (cropStatus) {
      case 'planned':
        return 'planned';

      case 'growing':
        return 'growing';

      case 'ready':
        return 'ready';

      case 'harvested':
        return 'harvested';

      default:
        return 'planned';
    }
  };

  // ==========================================
  // Derived Data
  // ==========================================

  const displayedCrops =
    useMemo(
      () => crops,
      [crops],
    );

  // ==========================================
  // Render
  // ==========================================

  return (
    <div className="admin-crops">

      {/* ====================================== */}
      {/* Header                                 */}
      {/* ====================================== */}

      <header className="admin-crops-header">

        <div>
          <div className="admin-crops-title-row">

            <div className="admin-crops-title-icon">
              <Sprout size={22} />
            </div>

            <div>
              <h1>
                {t('Crop Management')}
              </h1>

              <p>
                {t('Monitor and manage crops registered by farmers.')}
              </p>
            </div>

          </div>
        </div>

        <div className="admin-crops-count">
          <Leaf size={15} />
          <span>
            {statsLoading
              ? t('Loading...')
              : t('{0} total crops', stats.total)}
          </span>
        </div>

      </header>


      {/* ====================================== */}
      {/* Error                                  */}
      {/* ====================================== */}

      {error && (
        <div className="admin-crops-error">

          <AlertCircle size={17} />

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
            aria-label={t('Close error')}
          >
            <X size={16} />
          </button>

        </div>
      )}


      {/* ====================================== */}
      {/* Statistics                             */}
      {/* ====================================== */}

      <section className="admin-crops-stats">

        <div className="admin-crop-stat-card total">
          <div className="admin-crop-stat-icon">
            <Wheat size={20} />
          </div>

          <span>
            {t('Total Crops')}
          </span>

          <strong>
            {statsLoading
              ? '—'
              : formatNumber(
                  stats.total,
                )}
          </strong>

          <small>
            {t('All registered crops')}
          </small>
        </div>


        <div className="admin-crop-stat-card planned">
          <div className="admin-crop-stat-icon">
            <CalendarDays size={20} />
          </div>

          <span>
            {t('Planned')}
          </span>

          <strong>
            {statsLoading
              ? '—'
              : formatNumber(
                  stats.planned,
                )}
          </strong>

          <small>
            {t('Yet to be planted')}
          </small>
        </div>


        <div className="admin-crop-stat-card growing">
          <div className="admin-crop-stat-icon">
            <Sprout size={20} />
          </div>

          <span>
            {t('Growing')}
          </span>

          <strong>
            {statsLoading
              ? '—'
              : formatNumber(
                  stats.growing,
                )}
          </strong>

          <small>
            {t('Currently growing')}
          </small>
        </div>


        <div className="admin-crop-stat-card ready">
          <div className="admin-crop-stat-icon">
            <CheckCircle2 size={20} />
          </div>

          <span>
            {t('Ready')}
          </span>

          <strong>
            {statsLoading
              ? '—'
              : formatNumber(
                  stats.ready,
                )}
          </strong>

          <small>
            {t('Ready for harvest')}
          </small>
        </div>


        <div className="admin-crop-stat-card harvested">
          <div className="admin-crop-stat-icon">
            <Leaf size={20} />
          </div>

          <span>
            {t('Harvested')}
          </span>

          <strong>
            {statsLoading
              ? '—'
              : formatNumber(
                  stats.harvested,
                )}
          </strong>

          <small>
            {t('Completed crops')}
          </small>
        </div>

      </section>


      {/* ====================================== */}
      {/* Area Summary                           */}
      {/* ====================================== */}

      <section className="admin-crops-area-summary">

        <div className="admin-crops-area-heading">
          <div className="admin-crops-area-icon">
            <Wheat size={18} />
          </div>

          <div>
            <h2>
              {t('Cultivated Area')}
            </h2>

            <p>
              {t('Total registered area by unit.')}
            </p>
          </div>
        </div>


        <div className="admin-crops-area-items">

          <div className="admin-crops-area-item">
            <span>
              {t('Acre')}
            </span>

            <strong>
              {statsLoading
                ? '—'
                : formatNumber(
                    stats.area?.acre,
                  )}
            </strong>
          </div>


          <div className="admin-crops-area-item">
            <span>
              {t('Hectare')}
            </span>

            <strong>
              {statsLoading
                ? '—'
                : formatNumber(
                    stats.area?.hectare,
                  )}
            </strong>
          </div>


          <div className="admin-crops-area-item">
            <span>
              {t('Gunta')}
            </span>

            <strong>
              {statsLoading
                ? '—'
                : formatNumber(
                    stats.area?.gunta,
                  )}
            </strong>
          </div>

        </div>

      </section>


      {/* ====================================== */}
      {/* Search & Filters                       */}
      {/* ====================================== */}

      <section className="admin-crops-filter-card">

        <div className="admin-crops-search">

          <Search size={18} />

          <input
            type="text"
            placeholder={t('Search crop, variety or farmer...')}
            value={searchInput}
            onChange={(event) =>
              setSearchInput(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key ===
                'Enter'
              ) {
                handleSearch();
              }
            }}
          />

          {searchInput && (
            <button
              type="button"
              className="admin-crops-clear-search"
              onClick={clearSearch}
              aria-label={t('Clear search')}
            >
              <X size={16} />
            </button>
          )}

        </div>


        <div className="admin-crops-filter-group">

          <div className="admin-crops-filter-label">
            <Filter size={15} />
            {t('Status')}
          </div>

          <select
            value={status}
            onChange={
              handleStatusChange
            }
          >
            {STATUS_OPTIONS.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option ===
                  'all'
                    ? t('All Statuses')
                    : t(STATUS_LABELS[
                        option
                      ])}
                </option>
              ),
            )}
          </select>

        </div>


        <button
          type="button"
          className="admin-crops-search-button"
          onClick={handleSearch}
          disabled={loading}
        >
          <Search size={15} />
          {t('Search')}
        </button>


        <button
          type="button"
          className="admin-crops-refresh-button"
          onClick={
            handleRefresh
          }
          disabled={
            loading ||
            statsLoading
          }
        >
          <RefreshCw
            size={15}
            className={
              loading ||
              statsLoading
                ? 'admin-crops-spin'
                : ''
            }
          />
          {t('Refresh')}
        </button>

      </section>


      {/* ====================================== */}
      {/* Crop Table                             */}
      {/* ====================================== */}

      <section className="admin-crops-table-card">

        <div className="admin-crops-table-header">

          <div>
            <h2>
              {t('Registered Crops')}
            </h2>

            <p>
              {t('Showing')}{' '}
              <strong>
                {displayedCrops.length}
              </strong>{' '}
              {displayedCrops.length === 1
                ? t('crop')
                : t('crops')}
              {search ||
              status !== 'all'
                ? t(' matching your filters.')
                : '.'}
            </p>
          </div>

        </div>


        {loading ? (
          <div className="admin-crops-loading">

            <RefreshCw
              size={24}
              className="admin-crops-spin"
            />

            <p>
              {t('Loading crops...')}
            </p>

          </div>
        ) : displayedCrops.length ===
          0 ? (
          <div className="admin-crops-empty">

            <div className="admin-crops-empty-icon">
              <Sprout size={24} />
            </div>

            <h3>
              {t('No crops found')}
            </h3>

            <p>
              {t('Try changing your search or status filter.')}
            </p>

          </div>
        ) : (
          <div className="admin-crops-table-wrapper">

            <table className="admin-crops-table">

              <thead>
                <tr>

                  <th>
                    {t('Crop')}
                  </th>

                  <th>
                    {t('Farmer')}
                  </th>

                  <th>
                    {t('Area')}
                  </th>

                  <th>
                    {t('Status')}
                  </th>

                  <th>
                    {t('Sowing Date')}
                  </th>

                  <th>
                    {t('Expected Harvest')}
                  </th>

                  <th>
                    {t('Added')}
                  </th>

                  <th>
                    {t('Actions')}
                  </th>

                </tr>
              </thead>


              <tbody>

                {displayedCrops.map(
                  (crop) => {
                    const owner =
                      crop.owner;

                    const isUpdating =
                      updatingCropId ===
                      crop._id;

                    return (
                      <tr
                        key={crop._id}
                      >

                        {/* Crop */}

                        <td>

                          <div className="admin-crop-name-cell">

                            <div className="admin-crop-row-icon">
                              <Leaf
                                size={15}
                              />
                            </div>

                            <div>
                              <strong>
                                {crop.name ||
                                  t('Unnamed crop')}
                              </strong>

                              <span>
                                {crop.variety ||
                                  t('Variety not specified')}
                              </span>
                            </div>

                          </div>

                        </td>


                        {/* Farmer */}

                        <td>

                          {owner ? (
                            <div className="admin-crop-owner-cell">

                              <strong>
                                {owner.name ||
                                  t('Unnamed farmer')}
                              </strong>

                              <span>
                                {owner.email ||
                                  owner.phone ||
                                  t('Contact unavailable')}
                              </span>

                            </div>
                          ) : (
                            <div className="admin-crop-owner-missing">

                              <AlertCircle
                                size={14}
                              />

                              <span>
                                {t('Owner unavailable')}
                              </span>

                            </div>
                          )}

                        </td>


                        {/* Area */}

                        <td>

                          <div className="admin-crop-area-cell">

                            <strong>
                              {formatNumber(
                                crop.area,
                              )}
                            </strong>

                            <span>
                              {crop.areaUnit ||
                                t('acre')}
                            </span>

                          </div>

                        </td>


                        {/* Status */}

                        <td>

                          <span
                            className={`admin-crop-status-badge ${getStatusClass(
                              crop.status,
                            )}`}
                          >
                            {t(STATUS_LABELS[
                              crop.status
                            ] ||
                              crop.status ||
                              'Unknown')}
                          </span>

                        </td>


                        {/* Sowing Date */}

                        <td>

                          <div className="admin-crop-date-cell">

                            <CalendarDays
                              size={14}
                            />

                            <span>
                              {formatDate(
                                crop.sowingDate,
                              )}
                            </span>

                          </div>

                        </td>


                        {/* Harvest Date */}

                        <td>

                          <div className="admin-crop-date-cell">

                            <Clock3
                              size={14}
                            />

                            <span>
                              {formatDate(
                                crop.expectedHarvestDate,
                              )}
                            </span>

                          </div>

                        </td>


                        {/* Created */}

                        <td>

                          <span className="admin-crop-created-date">
                            {formatDate(
                              crop.createdAt,
                            )}
                          </span>

                        </td>


                        {/* Actions */}

                        <td>

                          <div className="admin-crop-actions">

                            <button
                              type="button"
                              className="admin-crop-action-button view"
                              onClick={() =>
                                setSelectedCrop(
                                  crop,
                                )
                              }
                              title={t('View crop')}
                            >
                              <Eye
                                size={14}
                              />
                              {t('View')}
                            </button>


                            <button
                              type="button"
                              className="admin-crop-action-button delete"
                              disabled={
                                isUpdating
                              }
                              onClick={() =>
                                deleteCrop(
                                  crop,
                                )
                              }
                              title={t('Delete crop')}
                            >
                              {isUpdating ? (
                                <RefreshCw
                                  size={14}
                                  className="admin-crops-spin"
                                />
                              ) : (
                                <Trash2
                                  size={14}
                                />
                              )}

                              {t('Delete')}
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  },
                )}

              </tbody>

            </table>

          </div>
        )}

      </section>


      {/* ====================================== */}
      {/* Crop Details Modal                     */}
      {/* ====================================== */}

      {selectedCrop && (
        <div
          className="admin-crop-modal-overlay"
          onClick={() =>
            setSelectedCrop(null)
          }
        >

          <div
            className="admin-crop-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="admin-crop-modal-header">

              <div className="admin-crop-modal-title">

                <div className="admin-crop-modal-icon">
                  <Sprout size={20} />
                </div>

                <div>
                  <h2>
                    {selectedCrop.name ||
                      t('Crop Details')}
                  </h2>

                  <p>
                    {selectedCrop.variety ||
                      t('Variety not specified')}
                  </p>
                </div>

              </div>


              <button
                type="button"
                className="admin-crop-modal-close"
                onClick={() =>
                  setSelectedCrop(null)
                }
                aria-label={t('Close crop details')}
              >
                <X size={19} />
              </button>

            </div>


            <div className="admin-crop-modal-content">

              {/* Owner */}

              <div className="admin-crop-detail-section">

                <h3>
                  {t('Farmer')}
                </h3>

                {selectedCrop.owner ? (
                  <div className="admin-crop-detail-owner">

                    <strong>
                      {
                        selectedCrop
                          .owner
                          .name
                      }
                    </strong>

                    <span>
                      {
                        selectedCrop
                          .owner
                          .email
                      }
                    </span>

                    <span>
                      {
                        selectedCrop
                          .owner
                          .phone
                      }
                    </span>

                  </div>
                ) : (
                  <div className="admin-crop-detail-warning">
                    <AlertCircle
                      size={15}
                    />

                    <span>
                      {t('Owner information is unavailable for this crop.')}
                    </span>
                  </div>
                )}

              </div>


              {/* Crop Information */}

              <div className="admin-crop-detail-grid">

                <div className="admin-crop-detail-item">
                  <span>
                    {t('Crop')}
                  </span>

                  <strong>
                    {selectedCrop.name ||
                      '—'}
                  </strong>
                </div>


                <div className="admin-crop-detail-item">
                  <span>
                    {t('Variety')}
                  </span>

                  <strong>
                    {selectedCrop.variety ||
                      'Not specified'}
                  </strong>
                </div>


                <div className="admin-crop-detail-item">
                  <span>
                    {t('Area')}
                  </span>

                  <strong>
                    {formatNumber(
                      selectedCrop.area,
                    )}{' '}
                    {
                      selectedCrop.areaUnit
                    }
                  </strong>
                </div>


                <div className="admin-crop-detail-item">
                  <span>
                    {t('Status')}
                  </span>

                  <strong>
                    {t(STATUS_LABELS[
                      selectedCrop.status
                    ] ||
                      selectedCrop.status ||
                      'Unknown')}
                  </strong>
                </div>


                <div className="admin-crop-detail-item">
                  <span>
                    {t('Sowing Date')}
                  </span>

                  <strong>
                    {formatDate(
                      selectedCrop.sowingDate,
                    )}
                  </strong>
                </div>


                <div className="admin-crop-detail-item">
                  <span>
                    {t('Expected Harvest')}
                  </span>

                  <strong>
                    {formatDate(
                      selectedCrop.expectedHarvestDate,
                    )}
                  </strong>
                </div>


                <div className="admin-crop-detail-item">
                  <span>
                    {t('Created')}
                  </span>

                  <strong>
                    {formatDate(
                      selectedCrop.createdAt,
                    )}
                  </strong>
                </div>


                <div className="admin-crop-detail-item">
                  <span>
                    {t('Updated')}
                  </span>

                  <strong>
                    {formatDate(
                      selectedCrop.updatedAt,
                    )}
                  </strong>
                </div>

              </div>


              {/* Notes */}

              <div className="admin-crop-detail-section">

                <h3>
                  {t('Notes')}
                </h3>

                <p className="admin-crop-notes">
                  {selectedCrop.notes ||
                    t('No notes added.')}
                </p>

              </div>

            </div>


            <div className="admin-crop-modal-footer">

              <button
                type="button"
                className="admin-crop-modal-delete"
                onClick={() => {
                  deleteCrop(
                    selectedCrop,
                  );
                }}
                disabled={
                  updatingCropId ===
                  selectedCrop._id
                }
              >
                {updatingCropId ===
                selectedCrop._id ? (
                  <RefreshCw
                    size={15}
                    className="admin-crops-spin"
                  />
                ) : (
                  <Trash2
                    size={15}
                  />
                )}

                {t('Delete Crop')}
              </button>


              <button
                type="button"
                className="admin-crop-modal-secondary"
                onClick={() =>
                  setSelectedCrop(null)
                }
              >
                {t('Close')}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default AdminCrops;