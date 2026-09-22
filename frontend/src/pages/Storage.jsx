import { useEffect, useMemo, useState } from 'react';

import {
  Warehouse,
  Snowflake,
  Search,
  MapPin,
  Package,
  Thermometer,
  IndianRupee,
  Phone,
  CheckCircle2,
  Filter,
  RefreshCw,
  X,
  Sparkles,
  ClipboardList,
  Clock3,
  CalendarDays,
  XCircle,
  Send,
  QrCode,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import API_URL from '../config/api';

import QrModal from '../components/QrModal';

import { useLanguage } from '../context/LanguageContext';

import './Storage.css';

function Storage() {
  const { t } = useLanguage();

  const { token, user } = useAuth();

  const [facilities, setFacilities] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [selectedType, setSelectedType] =
    useState('all');

  const [selectedDistrict, setSelectedDistrict] =
    useState('all');

  const [selectedFacility, setSelectedFacility] =
    useState(null);

  // ==========================================
  // Smart Storage Finder
  // ==========================================

  const [selectedCrop, setSelectedCrop] =
    useState('');

  const [storageQuantity, setStorageQuantity] =
    useState('');

  const [storageUnit, setStorageUnit] =
    useState('kg');

  const [finderSubmitted, setFinderSubmitted] =
    useState(false);

  // ==========================================
  // Farmer Storage Requests
  // ==========================================

  const [myRequests, setMyRequests] =
    useState([]);

  const [qrTarget, setQrTarget] = useState(null);

  const [requestsLoading, setRequestsLoading] =
    useState(false);

  const [requestFacility, setRequestFacility] =
    useState(null);

  const [requestStartDate, setRequestStartDate] =
    useState('');

  const [requestDurationMonths, setRequestDurationMonths] =
    useState('1');

  const [requestNotes, setRequestNotes] =
    useState('');

  const [requestSubmitting, setRequestSubmitting] =
    useState(false);

  const [requestError, setRequestError] =
    useState('');

  const [requestSuccess, setRequestSuccess] =
    useState('');

  // ==========================================
  // Fetch Storage Facilities
  // ==========================================

  const fetchStorage = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_URL}/storage`,
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
            t('Failed to load storage facilities.'),
        );
      }

      setFacilities(data.data || []);
    } catch (err) {
      console.error(
        'Storage fetch error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to load storage facilities.'),
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRequests = async () => {
    if (!token || user?.role !== 'farmer') {
      return;
    }

    try {
      setRequestsLoading(true);

      const response = await fetch(
        `${API_URL}/storage/requests/mine`,
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
            t('Failed to load your storage requests.'),
        );
      }

      setMyRequests(data.data || []);
    } catch (err) {
      console.error(
        'Storage requests fetch error:',
        err,
      );
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchStorage();
    fetchMyRequests();
  }, [token, user?.role]);

  // ==========================================
  // Statistics
  // ==========================================

  const coldStorageCount =
    facilities.filter(
      (facility) =>
        facility.type === 'cold_storage',
    ).length;

  const warehouseCount =
    facilities.filter(
      (facility) =>
        facility.type === 'warehouse',
    ).length;

  // ==========================================
  // District List
  // ==========================================

  const districts = useMemo(() => {
    return [
      ...new Set(
        facilities
          .map(
            (facility) =>
              facility.location?.district,
          )
          .filter(Boolean),
      ),
    ].sort();
  }, [facilities]);

  // ==========================================
  // Crop List
  // ==========================================

  const availableCrops = useMemo(() => {
    return [
      ...new Set(
        facilities.flatMap(
          (facility) =>
            facility.suitableCrops || [],
        ),
      ),
    ].sort();
  }, [facilities]);

  // ==========================================
  // Unit Conversion
  // ==========================================

  const convertToKg = (
    value,
    unit,
  ) => {
    const numericValue =
      Number(value) || 0;

    switch (unit) {
      case 'kg':
        return numericValue;

      case 'quintal':
        return numericValue * 100;

      case 'ton':
        return numericValue * 1000;

      default:
        return numericValue;
    }
  };

  const convertFromKg = (
    value,
    unit,
  ) => {
    switch (unit) {
      case 'kg':
        return value;

      case 'quintal':
        return value / 100;

      case 'ton':
        return value / 1000;

      default:
        return value;
    }
  };

  // ==========================================
  // Normal Facility Filters
  // ==========================================

  const filteredFacilities = useMemo(() => {
    const searchValue =
      search.trim().toLowerCase();

    return facilities.filter(
      (facility) => {
        // Type filter
        if (
          selectedType !== 'all' &&
          facility.type !== selectedType
        ) {
          return false;
        }

        // District filter
        if (
          selectedDistrict !== 'all' &&
          facility.location?.district !==
            selectedDistrict
        ) {
          return false;
        }

        // Search filter
        if (searchValue) {
          const searchableText = [
            facility.name,
            facility.description,
            facility.location?.district,
            facility.location?.village,
            ...(facility.suitableCrops || []),
          ]
            .join(' ')
            .toLowerCase();

          if (
            !searchableText.includes(
              searchValue,
            )
          ) {
            return false;
          }
        }

        return true;
      },
    );
  }, [
    facilities,
    search,
    selectedType,
    selectedDistrict,
  ]);

  // ==========================================
  // Smart Matching + Ranking
  // ==========================================

  const matchedFacilities =
    useMemo(() => {
      if (
        !finderSubmitted ||
        !selectedCrop ||
        !storageQuantity ||
        Number(storageQuantity) <= 0
      ) {
        return [];
      }

      const requestedQuantityKg =
        convertToKg(
          storageQuantity,
          storageUnit,
        );

      const cropValue =
        selectedCrop
          .trim()
          .toLowerCase();

      // Crops for which temperature-controlled
      // storage can commonly be useful.
      const coldStoragePreferredCrops = [
        'apple',
        'banana',
        'grapes',
        'mango',
        'orange',
        'pomegranate',
        'strawberry',
        'tomato',
        'potato',
        'onion',
        'carrot',
        'cabbage',
        'cauliflower',
        'leafy vegetables',
        'vegetables',
        'fruits',
      ];

      const cropNeedsColdStorage =
        coldStoragePreferredCrops.includes(
          cropValue,
        );

      // ----------------------------------------
      // Find valid matches
      // ----------------------------------------

      const matches =
        filteredFacilities.filter(
          (facility) => {
            const suitableCrops =
              (
                facility.suitableCrops ||
                []
              ).map((crop) =>
                crop
                  .trim()
                  .toLowerCase(),
              );

            // Crop suitability
            const cropMatches =
              suitableCrops.includes(
                cropValue,
              );

            if (!cropMatches) {
              return false;
            }

            // Capacity
            const facilityUnit =
              facility.capacityUnit ||
              'ton';

            const availableCapacityKg =
              convertToKg(
                facility.availableCapacity,
                facilityUnit,
              );

            if (
              availableCapacityKg <
              requestedQuantityKg
            ) {
              return false;
            }

            return true;
          },
        );

      if (matches.length === 0) {
        return [];
      }

      // ----------------------------------------
      // Charge range
      // ----------------------------------------

      const charges = matches
        .map(
          (facility) =>
            Number(
              facility.storageCharges
                ?.amount,
            ) || 0,
        )
        .filter(
          (charge) => charge > 0,
        );

      const lowestCharge =
        charges.length > 0
          ? Math.min(...charges)
          : 0;

      const highestCharge =
        charges.length > 0
          ? Math.max(...charges)
          : 0;

      // ----------------------------------------
      // Rank facilities
      // ----------------------------------------

      const rankedMatches =
        matches.map((facility) => {
          const facilityUnit =
            facility.capacityUnit ||
            'ton';

          const availableCapacityKg =
            convertToKg(
              facility.availableCapacity,
              facilityUnit,
            );

          const capacityUtilization =
            availableCapacityKg > 0
              ? requestedQuantityKg /
                availableCapacityKg
              : 1;

          // ==============================
          // Crop Suitability — 45 points
          // ==============================

          const cropScore = 45;

          // ==============================
          // Capacity Fit — 25 points
          // ==============================

          let capacityScore = 0;

          if (
            capacityUtilization <= 0.25
          ) {
            capacityScore = 25;
          } else if (
            capacityUtilization <= 0.5
          ) {
            capacityScore = 21;
          } else if (
            capacityUtilization <= 0.75
          ) {
            capacityScore = 17;
          } else if (
            capacityUtilization <= 0.9
          ) {
            capacityScore = 12;
          } else {
            capacityScore = 8;
          }

          // ==============================
          // Storage Charge — 20 points
          // ==============================

          const facilityCharge =
            Number(
              facility.storageCharges
                ?.amount,
            ) || 0;

          let priceScore = 10;

          if (
            lowestCharge > 0 &&
            highestCharge >
              lowestCharge &&
            facilityCharge > 0
          ) {
            const priceRatio =
              (highestCharge -
                facilityCharge) /
              (highestCharge -
                lowestCharge);

            priceScore =
              5 +
              Math.round(
                priceRatio * 15,
              );
          } else if (
            lowestCharge > 0 &&
            facilityCharge ===
              lowestCharge
          ) {
            priceScore = 20;
          }

          // ==============================
          // Storage Type Suitability
          // — 10 points
          // ==============================

          let storageTypeScore = 0;

          if (
            cropNeedsColdStorage &&
            facility.type ===
              'cold_storage'
          ) {
            storageTypeScore = 10;
          } else if (
            !cropNeedsColdStorage &&
            facility.type ===
              'warehouse'
          ) {
            storageTypeScore = 10;
          }

          // --------------------------------
          // Final score
          // --------------------------------

          const totalScore =
            cropScore +
            capacityScore +
            priceScore +
            storageTypeScore;

          return {
            ...facility,

            matchingScore:
              totalScore,

            matchingBreakdown: {
              cropScore,
              capacityScore,
              priceScore,
              storageTypeScore,
            },

            capacityUtilization,
          };
        });

      // ----------------------------------------
      // Sort highest score first
      // ----------------------------------------

      rankedMatches.sort(
        (a, b) => {
          if (
            b.matchingScore !==
            a.matchingScore
          ) {
            return (
              b.matchingScore -
              a.matchingScore
            );
          }

          // If scores are equal,
          // lower charge comes first.
          const aCharge =
            Number(
              a.storageCharges
                ?.amount,
            ) || 0;

          const bCharge =
            Number(
              b.storageCharges
                ?.amount,
            ) || 0;

          return (
            aCharge -
            bCharge
          );
        },
      );

      return rankedMatches;
    }, [
      filteredFacilities,
      finderSubmitted,
      selectedCrop,
      storageQuantity,
      storageUnit,
    ]);

  // ==========================================
  // Find Storage
  // ==========================================

  const handleFindStorage = () => {
    if (
      !selectedCrop ||
      !storageQuantity ||
      Number(storageQuantity) <= 0
    ) {
      return;
    }

    setFinderSubmitted(true);
  };

  // ==========================================
  // Reset Finder
  // ==========================================

  const resetFinder = () => {
    setSelectedCrop('');
    setStorageQuantity('');
    setStorageUnit('kg');
    setFinderSubmitted(false);
  };

  // ==========================================
  // Reset Normal Filters
  // ==========================================

  const resetFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedDistrict('all');
  };

  // ==========================================
  // Display Facilities
  // ==========================================

  const displayFacilities =
    finderSubmitted
      ? matchedFacilities
      : filteredFacilities;

  // ==========================================
  // Currency
  // ==========================================

  const formatCurrency = (
    amount,
  ) => {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      },
    ).format(amount || 0);
  };

  // ==========================================
  // Storage Request Helpers
  // ==========================================

  const getDefaultRequestDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 1);

    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1,
    ).padStart(2, '0');
    const day = String(
      date.getDate(),
    ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  };

  const openStorageRequest = (facility) => {
    if (user?.role !== 'farmer') {
      return;
    }

    if (
      !finderSubmitted ||
      !selectedCrop ||
      !storageQuantity ||
      Number(storageQuantity) <= 0
    ) {
      setRequestError(
        t('Use Find Matching Storage first, then choose a suitable facility.'),
      );
      return;
    }

    setRequestFacility(facility);
    setRequestStartDate(
      getDefaultRequestDate(),
    );
    setRequestDurationMonths('1');
    setRequestNotes('');
    setRequestError('');
    setRequestSuccess('');
  };

  const closeStorageRequest = () => {
    if (requestSubmitting) {
      return;
    }

    setRequestFacility(null);
    setRequestError('');
    setRequestNotes('');
  };

  const submitStorageRequest = async () => {
    if (!token || !requestFacility) {
      return;
    }

    const quantity = Number(
      storageQuantity,
    );

    const durationMonths = Number(
      requestDurationMonths,
    );

    if (
      !selectedCrop ||
      !quantity ||
      quantity <= 0
    ) {
      setRequestError(
        t('Please provide a valid crop and quantity.'),
      );
      return;
    }

    if (!requestStartDate) {
      setRequestError(
        t('Please select a storage start date.'),
      );
      return;
    }

    if (
      !durationMonths ||
      durationMonths < 1
    ) {
      setRequestError(
        t('Please select a valid storage duration.'),
      );
      return;
    }

    try {
      setRequestSubmitting(true);
      setRequestError('');

      const response = await fetch(
        `${API_URL}/storage/requests`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            storageFacility: requestFacility._id,
            crop: selectedCrop,
            quantity,
            unit: storageUnit,
            startDate: requestStartDate,
            durationMonths,
            notes: requestNotes.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Unable to create storage request.'),
        );
      }

      setRequestFacility(null);
      setRequestNotes('');
      setRequestError('');
      setRequestSuccess(
        t('Storage request submitted successfully. You can track its status below.'),
      );

      await fetchMyRequests();
    } catch (err) {
      console.error(
        'Storage request submission error:',
        err,
      );

      setRequestError(
        err.message ||
          t('Unable to create storage request.'),
      );
    } finally {
      setRequestSubmitting(false);
    }
  };

  const formatRequestStatus = (status) => {
    const labels = {
      pending: t('Pending'),
      approved: t('Approved'),
      rejected: t('Rejected'),
      cancelled: t('Cancelled'),
      completed: t('Completed'),
    };

    return labels[status] || status;
  };

  const requestStatusIcon = (status) => {
    if (
      status === 'approved' ||
      status === 'completed'
    ) {
      return CheckCircle2;
    }

    if (
      status === 'rejected' ||
      status === 'cancelled'
    ) {
      return XCircle;
    }

    return Clock3;
  };

  // ==========================================
  // Loading
  // ==========================================

  if (loading) {
    return (
      <div className="storage-page">

        <div className="storage-loading">

          <RefreshCw
            size={28}
            className="storage-loading-icon"
          />

          <p>
            {t('Loading storage facilities...')}
          </p>

        </div>

      </div>
    );
  }

  // ==========================================
  // Main UI
  // ==========================================

  return (
    <div className="storage-page">

      {/* ======================================
          Header
      ====================================== */}

      <section className="storage-header">

        <div className="storage-header-content">

          <div className="storage-header-icon">
            <Warehouse size={30} />
          </div>

          <div>

            <p className="storage-eyebrow">
              {t('KrishiBandhu Storage Network')}
            </p>

            <h1>
              {t('Storage & Warehouses')}
            </h1>

            <p>
              {t('Find suitable storage facilities for your agricultural produce.')}
            </p>

          </div>

        </div>

        <button
          type="button"
          className="storage-refresh-button"
          onClick={fetchStorage}
        >
          <RefreshCw size={17} />
          {t('Refresh')}
        </button>

      </section>


      {user?.role === 'farmer' && (
        <>
          {requestSuccess && (
            <div className="storage-request-success">
              <CheckCircle2 size={17} />
              <span>{requestSuccess}</span>
              <button
                type="button"
                onClick={() => setRequestSuccess('')}
              >
                {t('Dismiss')}
              </button>
            </div>
          )}

          <section className="storage-requests-panel">
            <div className="storage-requests-header">
              <div className="storage-requests-title">
                <div className="storage-requests-icon">
                  <ClipboardList size={20} />
                </div>
                <div>
                  <h2>{t('My Storage Requests')}</h2>
                  <p>{t('Track requests you have submitted to storage facilities.')}</p>
                </div>
              </div>

              <button
                type="button"
                className="storage-requests-refresh"
                onClick={fetchMyRequests}
                disabled={requestsLoading}
              >
                <RefreshCw
                  size={15}
                  className={
                    requestsLoading
                      ? 'storage-loading-spin'
                      : ''
                  }
                />
                {t('Refresh')}
              </button>
            </div>

            {requestsLoading ? (
              <div className="storage-requests-empty">
                <RefreshCw
                  size={22}
                  className="storage-loading-spin"
                />
                {t('Loading your requests...')}
              </div>
            ) : myRequests.length === 0 ? (
              <div className="storage-requests-empty">
                <ClipboardList size={25} />
                <strong>{t('No storage requests yet')}</strong>
                <span>{t('Use Smart Storage Finder below to request storage.')}</span>
              </div>
            ) : (
              <div className="storage-request-list">
                {myRequests.map((request) => {
                  const StatusIcon = requestStatusIcon(
                    request.status,
                  );

                  return (
                    <div
                      className="storage-request-row"
                      key={request._id}
                    >
                      <div className="storage-request-main">
                        <div className="storage-request-crop">
                          <strong>{request.crop}</strong>
                          <span
                            className={`storage-request-status ${request.status}`}
                          >
                            <StatusIcon size={13} />
                            {formatRequestStatus(request.status)}
                          </span>
                        </div>

                        <span className="storage-request-facility">
                          <Warehouse size={14} />
                          {request.storageFacility?.name || t('Storage facility')}
                        </span>
                      </div>

                      <div className="storage-request-meta">
                        <span>
                          <Package size={14} />
                          {request.quantity} {request.unit}
                        </span>
                        <span>
                          <CalendarDays size={14} />
                          {new Date(request.startDate).toLocaleDateString(
                            'en-IN',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            },
                          )}
                        </span>
                        <strong>
                          {formatCurrency(request.estimatedTotalCost)}
                        </strong>
                      </div>

                      {request.adminNote && (
                        <div className="storage-request-admin-note">
                          <strong>{t('Admin Note:')}</strong> {request.adminNote}
                        </div>
                      )}

                      <button
                        type="button"
                        className="storage-request-qr"
                        onClick={() =>
                          setQrTarget(request)
                        }
                      >
                        <QrCode size={14} />
                        {t('Check-in QR')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}


      {/* ======================================
          Summary Cards
      ====================================== */}

      <section className="storage-summary">

        <div className="storage-summary-card">

          <div className="storage-summary-icon cold">
            <Snowflake size={22} />
          </div>

          <div>

            <span>
              {t('Cold Storage')}
            </span>

            <strong>
              {coldStorageCount}
            </strong>

            <small>
              {t('Temperature-controlled facilities')}
            </small>

          </div>

        </div>


        <div className="storage-summary-card">

          <div className="storage-summary-icon warehouse">
            <Warehouse size={22} />
          </div>

          <div>

            <span>
              {t('Warehouses')}
            </span>

            <strong>
              {warehouseCount}
            </strong>

            <small>
              {t('Dry agricultural storage')}
            </small>

          </div>

        </div>


        <div className="storage-summary-card">

          <div className="storage-summary-icon total">
            <Package size={22} />
          </div>

          <div>

            <span>
              {t('Total Facilities')}
            </span>

            <strong>
              {facilities.length}
            </strong>

            <small>
              {t('Available through KrishiBandhu')}
            </small>

          </div>

        </div>

      </section>


      {/* ======================================
          Search & Filters
      ====================================== */}

      <section className="storage-filter-panel">

        <div className="storage-search">

          <Search size={19} />

          <input
            type="text"
            placeholder={t('Search facility, district or crop...')}
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value,
              );

              setFinderSubmitted(false);
            }}
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch('')
              }
              className="storage-clear-search"
              aria-label={t('Clear search')}
            >
              <X size={17} />
            </button>
          )}

        </div>


        <div className="storage-filter-group">

          <div className="storage-filter-label">
            <Filter size={16} />
            {t('Filters')}
          </div>

          <select
            value={selectedDistrict}
            onChange={(event) => {
              setSelectedDistrict(
                event.target.value,
              );

              setFinderSubmitted(false);
            }}
          >

            <option value="all">
              {t('All Districts')}
            </option>

            {districts.map(
              (district) => (
                <option
                  key={district}
                  value={district}
                >
                  {district}
                </option>
              ),
            )}

          </select>

        </div>

      </section>


      {/* ======================================
          Smart Storage Finder
      ====================================== */}

      <section className="storage-match-panel">

        <div className="storage-match-header">

          <div className="storage-match-icon">
            <Sparkles size={22} />
          </div>

          <div>

            <h2>
              {t('Find Storage for Your Crop')}
            </h2>

            <p>
              {t("We'll match your crop, quantity and preferred district with suitable facilities.")}
            </p>

          </div>

        </div>


        <div className="storage-match-form">

          {/* Crop */}

          <div className="storage-match-field">

            <label>
              {t('Crop')}
            </label>

            <select
              value={selectedCrop}
              onChange={(event) => {
                setSelectedCrop(
                  event.target.value,
                );

                setFinderSubmitted(false);
              }}
            >

              <option value="">
                {t('Select crop')}
              </option>

              {availableCrops.map(
                (crop) => (
                  <option
                    key={crop}
                    value={crop}
                  >
                    {crop}
                  </option>
                ),
              )}

            </select>

          </div>


          {/* Quantity */}

          <div className="storage-match-field">

            <label>
              {t('Quantity')}
            </label>

            <div className="storage-quantity-input">

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={t('Enter quantity')}
                value={storageQuantity}
                onChange={(event) => {
                  setStorageQuantity(
                    event.target.value,
                  );

                  setFinderSubmitted(false);
                }}
              />

              <select
                value={storageUnit}
                onChange={(event) => {
                  setStorageUnit(
                    event.target.value,
                  );

                  setFinderSubmitted(false);
                }}
              >

                <option value="kg">
                  {t('kg')}
                </option>

                <option value="quintal">
                  {t('quintal')}
                </option>

                <option value="ton">
                  {t('ton')}
                </option>

              </select>

            </div>

          </div>


          {/* District */}

          <div className="storage-match-field">

            <label>
              {t('Preferred District')}
            </label>

            <select
              value={selectedDistrict}
              onChange={(event) => {
                setSelectedDistrict(
                  event.target.value,
                );

                setFinderSubmitted(false);
              }}
            >

              <option value="all">
                {t('Any District')}
              </option>

              {districts.map(
                (district) => (
                  <option
                    key={district}
                    value={district}
                  >
                    {district}
                  </option>
                ),
              )}

            </select>

          </div>

        </div>


        {/* Finder Actions */}

        <div className="storage-match-actions">

          <button
            type="button"
            className="storage-find-button"
            onClick={
              handleFindStorage
            }
            disabled={
              !selectedCrop ||
              !storageQuantity ||
              Number(storageQuantity) <= 0
            }
          >

            <Search size={17} />

            {t('Find Matching Storage')}

          </button>


          {finderSubmitted && (
            <button
              type="button"
              className="storage-reset-finder"
              onClick={
                resetFinder
              }
            >

              <X size={16} />

              {t('Reset')}

            </button>
          )}

        </div>


        {!selectedCrop &&
          storageQuantity && (
          <p className="storage-finder-hint">
            {t('Please select a crop.')}
          </p>
        )}

      </section>


      {/* ======================================
          Matching Result Banner
      ====================================== */}

      {finderSubmitted && (
        <div className="storage-match-result">

          <div className="storage-match-result-icon">
            <Sparkles size={19} />
          </div>

          <div>

            <strong>
              {matchedFacilities.length > 0
                ? t(
                    '{0} matching storage {1} found',
                    matchedFacilities.length,
                    matchedFacilities.length === 1
                      ? t('facility')
                      : t('facilities'),
                  )
                : t('No matching storage found')}
            </strong>

            <span>
              {t(
                '{0} {1} of {2}',
                storageQuantity,
                storageUnit,
                selectedCrop,
              )}

              {selectedDistrict !==
                'all' &&
                t(' in {0}', selectedDistrict)}
            </span>

          </div>

        </div>
      )}


      {/* ======================================
          Type Tabs
      ====================================== */}

      <section className="storage-tabs">

        <button
          type="button"
          className={
            selectedType === 'all'
              ? 'active'
              : ''
          }
          onClick={() => {
            setSelectedType('all');
            setFinderSubmitted(false);
          }}
        >
          <Package size={17} />
          {t('All Facilities')}
        </button>


        <button
          type="button"
          className={
            selectedType ===
            'cold_storage'
              ? 'active'
              : ''
          }
          onClick={() => {
            setSelectedType(
              'cold_storage',
            );

            setFinderSubmitted(false);
          }}
        >
          <Snowflake size={17} />
          {t('Cold Storage')}
        </button>


        <button
          type="button"
          className={
            selectedType ===
            'warehouse'
              ? 'active'
              : ''
          }
          onClick={() => {
            setSelectedType(
              'warehouse',
            );

            setFinderSubmitted(false);
          }}
        >
          <Warehouse size={17} />
          {t('Warehouses')}
        </button>

      </section>


      {/* ======================================
          Result Information
      ====================================== */}

      {!error && (
        <div className="storage-result-bar">

          <div>

            {t('Showing')}{' '}

            <strong>
              {displayFacilities.length}
            </strong>{' '}

            {finderSubmitted
              ? t('matching facilities')
              : t('of {0} facilities', facilities.length)}

          </div>


          {(search ||
            selectedType !== 'all' ||
            selectedDistrict !==
              'all' ||
            finderSubmitted) && (

            <button
              type="button"
              onClick={() => {
                resetFilters();
                resetFinder();
              }}
            >
              {t('Clear Filters')}
            </button>

          )}

        </div>
      )}


      {/* ======================================
          Error
      ====================================== */}

      {error && (
        <div className="storage-error">

          <strong>
            {t('Unable to load storage')}
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={fetchStorage}
          >
            {t('Try Again')}
          </button>

        </div>
      )}


      {/* ======================================
          Empty State
      ====================================== */}

      {!error &&
        displayFacilities.length ===
          0 && (

        <div className="storage-empty">

          <div className="storage-empty-icon">

            {finderSubmitted ? (
              <Sparkles size={32} />
            ) : (
              <Warehouse size={32} />
            )}

          </div>


          <h2>

            {finderSubmitted
              ? t('No suitable storage found')
              : t('No storage facilities found')}

          </h2>


          <p>

            {finderSubmitted
              ? t(
                  "We couldn't find a facility suitable for {0} with {1} {2} of required capacity. Try another district, quantity or crop.",
                  selectedCrop,
                  storageQuantity,
                  storageUnit,
                )
              : t('Try changing your search or filter options.')}

          </p>


          <button
            type="button"
            onClick={() => {
              resetFilters();
              resetFinder();
            }}
          >
            {t('Clear Filters')}
          </button>

        </div>
      )}


      {/* ======================================
          Facility Grid
      ====================================== */}

      {!error &&
        displayFacilities.length >
          0 && (

        <section className="storage-grid">

          {displayFacilities.map(
            (facility, index) => {

              const isColdStorage =
                facility.type ===
                'cold_storage';

              const capacity =
                Number(
                  facility.capacity,
                ) || 0;

              const availableCapacity =
                Number(
                  facility.availableCapacity,
                ) || 0;

              const availability =
                capacity > 0
                  ? Math.round(
                      (availableCapacity /
                        capacity) *
                        100,
                    )
                  : 0;

              const requestedKg =
                finderSubmitted
                  ? convertToKg(
                      storageQuantity,
                      storageUnit,
                    )
                  : 0;

              const facilityUnit =
                facility.capacityUnit ||
                'ton';

              const availableKg =
                convertToKg(
                  availableCapacity,
                  facilityUnit,
                );

              const remainingAfterStorage =
                Math.max(
                  0,
                  availableKg -
                    requestedKg,
                );

              const remainingInFacilityUnit =
                convertFromKg(
                  remainingAfterStorage,
                  facilityUnit,
                );

              const isRecommended =
                finderSubmitted &&
                index === 0;

              return (
                <article
                  key={facility._id}
                  className={
                    finderSubmitted
                      ? 'storage-card storage-card-matched'
                      : 'storage-card'
                  }
                >

                  {/* Match Badge */}

                  {finderSubmitted && (
                    <div
                      className={
                        isRecommended
                          ? 'storage-match-badge storage-recommended-badge'
                          : 'storage-match-badge'
                      }
                    >

                      {isRecommended ? (
                        <>
                          <Sparkles size={13} />

                          {t('Recommended')}
                        </>
                      ) : (
                        <>
                          <CheckCircle2
                            size={13}
                          />

                          {t('Match Found')}
                        </>
                      )}

                    </div>
                  )}


                  {/* Card Header */}

                  <div className="storage-card-top">

                    <div
                      className={
                        isColdStorage
                          ? 'storage-type-icon cold'
                          : 'storage-type-icon warehouse'
                      }
                    >

                      {isColdStorage ? (
                        <Snowflake
                          size={23}
                        />
                      ) : (
                        <Warehouse
                          size={23}
                        />
                      )}

                    </div>


                    <div className="storage-card-type">

                      <span>
                        {isColdStorage
                          ? t('Cold Storage')
                          : t('Warehouse')}
                      </span>


                      {facility.isVerified && (
                        <CheckCircle2
                          size={17}
                          className="verified-icon"
                        />
                      )}

                    </div>

                  </div>


                  {/* Name */}

                  <h2>
                    {facility.name}
                  </h2>


                  {/* Match Score */}

                  {finderSubmitted &&
                    facility.matchingScore && (
                    <div className="storage-match-score">

                      <Sparkles size={13} />

                      <strong>
                        {facility.matchingScore}/100
                      </strong>

                      <span>
                        {t('Match score')}
                      </span>

                    </div>
                  )}


                  <p className="storage-description">
                    {facility.description}
                  </p>


                  {/* Location */}

                  <div className="storage-location">

                    <MapPin size={17} />

                    <span>

                      {facility.location
                        ?.district}

                      ,{' '}

                      {facility.location
                        ?.state}

                    </span>

                  </div>


                  {/* Capacity */}

                  <div className="storage-capacity">

                    <div className="storage-capacity-header">

                      <span>
                        {t('Available Capacity')}
                      </span>

                      <strong>

                        {
                          facility.availableCapacity
                        }{' '}

                        /{' '}

                        {
                          facility.capacity
                        }{' '}

                        {
                          facility.capacityUnit
                        }

                      </strong>

                    </div>


                    <div className="storage-capacity-bar">

                      <div
                        style={{
                          width: `${Math.min(
                            availability,
                            100,
                          )}%`,
                        }}
                      />

                    </div>


                    <small>
                      {availability}%{' '}
                      {t('capacity available')}
                    </small>


                    {finderSubmitted && (
                      <div className="storage-after-capacity">

                        <span>
                          {t('After your storage')}
                        </span>

                        <strong>

                          {remainingInFacilityUnit.toLocaleString(
                            'en-IN',
                            {
                              maximumFractionDigits: 2,
                            },
                          )}{' '}

                          {
                            facilityUnit
                          }

                          {' '}{t('remaining')}

                        </strong>

                      </div>
                    )}

                  </div>


                  {/* Crop Tags */}

                  <div className="storage-crops">

                    {(
                      facility.suitableCrops ||
                      []
                    )
                      .slice(0, 4)
                      .map(
                        (crop) => (
                          <span
                            key={crop}
                            className={
                              selectedCrop &&
                              crop.toLowerCase() ===
                                selectedCrop.toLowerCase()
                                ? 'crop-match'
                                : ''
                            }
                          >
                            {crop}
                          </span>
                        ),
                      )}


                    {facility
                      .suitableCrops
                      ?.length >
                      4 && (
                      <span>
                        +
                        {facility
                          .suitableCrops
                          .length -
                          4}
                      </span>
                    )}

                  </div>


                  {/* Details */}

                  <div className="storage-details">

                    {isColdStorage &&
                      facility.temperatureRange && (

                      <div>

                        <Thermometer
                          size={16}
                        />

                        <span>
                          {
                            facility.temperatureRange
                          }
                        </span>

                      </div>

                    )}


                    <div>

                      <IndianRupee
                        size={16}
                      />

                      <span>

                        {formatCurrency(
                          facility
                            .storageCharges
                            ?.amount,
                        )}{' '}

                        {
                          facility
                            .storageCharges
                            ?.unit
                        }

                      </span>

                    </div>

                  </div>


                  {/* Footer */}

                  <div className="storage-card-footer">

                    <div className="storage-demo-badge">

                      {facility.isVerified ? (
                        <>
                          <CheckCircle2
                            size={14}
                          />

                          {t('Verified')}
                        </>
                      ) : (
                        t('Demo Facility')
                      )}

                    </div>


                    <div className="storage-card-actions">

                      {user?.role === 'farmer' &&
                        finderSubmitted && (
                        <button
                          type="button"
                          className="storage-request-button"
                          onClick={() =>
                            openStorageRequest(
                              facility,
                            )
                          }
                        >
                          <Send size={14} />
                          {t('Request Storage')}
                        </button>
                      )}

                      <button
                        type="button"
                        className="storage-view-button"
                        onClick={() =>
                          setSelectedFacility(
                            facility,
                          )
                        }
                      >
                        {t('View Details')}
                      </button>

                    </div>

                  </div>

                </article>
              );
            },
          )}

        </section>
      )}


      {requestFacility && (
        <div
          className="storage-request-modal-overlay"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeStorageRequest();
            }
          }}
        >
          <div
            className="storage-request-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="storage-request-modal-header">
              <div>
                <p>{t('Storage Request')}</p>
                <h2>{t('Request Storage')}</h2>
              </div>

              <button
                type="button"
                className="storage-request-modal-close"
                onClick={closeStorageRequest}
                disabled={requestSubmitting}
              >
                <X size={19} />
              </button>
            </div>

            <div className="storage-request-modal-body">
              <div className="storage-request-facility-summary">
                <div className="storage-request-facility-icon">
                  {requestFacility.type === 'cold_storage' ? (
                    <Snowflake size={21} />
                  ) : (
                    <Warehouse size={21} />
                  )}
                </div>
                <div>
                  <strong>{requestFacility.name}</strong>
                  <span>
                    {requestFacility.location?.district}, {requestFacility.location?.state}
                  </span>
                </div>
              </div>

              <div className="storage-request-summary-grid">
                <div>
                  <span>{t('Crop')}</span>
                  <strong>{selectedCrop}</strong>
                </div>
                <div>
                  <span>{t('Quantity')}</span>
                  <strong>{storageQuantity} {storageUnit}</strong>
                </div>
                <div>
                  <span>{t('Available Capacity')}</span>
                  <strong>
                    {requestFacility.availableCapacity} {requestFacility.capacityUnit}
                  </strong>
                </div>
                <div>
                  <span>{t('Storage Charge')}</span>
                  <strong>
                    {formatCurrency(requestFacility.storageCharges?.amount)} {requestFacility.storageCharges?.unit}
                  </strong>
                </div>
              </div>

              {requestError && (
                <div className="storage-request-error">
                  <XCircle size={16} />
                  <span>{requestError}</span>
                </div>
              )}

              <div className="storage-request-form-grid">
                <div className="storage-request-field">
                  <label htmlFor="storage-request-start-date">
                    {t('Start Date')}
                  </label>
                  <input
                    id="storage-request-start-date"
                    type="date"
                    value={requestStartDate}
                    onChange={(event) =>
                      setRequestStartDate(
                        event.target.value,
                      )
                    }
                    disabled={requestSubmitting}
                  />
                </div>

                <div className="storage-request-field">
                  <label htmlFor="storage-request-duration">
                    {t('Duration')}
                  </label>
                  <select
                    id="storage-request-duration"
                    value={requestDurationMonths}
                    onChange={(event) =>
                      setRequestDurationMonths(
                        event.target.value,
                      )
                    }
                    disabled={requestSubmitting}
                  >
                    {Array.from(
                      { length: 24 },
                      (_, index) => index + 1,
                    ).map((months) => (
                      <option
                        key={months}
                        value={months}
                      >
                        {months} {months !== 1 ? t('months') : t('month')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="storage-request-field">
                <label htmlFor="storage-request-notes">
                  {t('Notes')} <span>{t('(optional)')}</span>
                </label>
                <textarea
                  id="storage-request-notes"
                  rows={4}
                  maxLength={500}
                  value={requestNotes}
                  onChange={(event) =>
                    setRequestNotes(
                      event.target.value,
                    )
                  }
                  placeholder={t('Add any special storage requirements or notes...')}
                  disabled={requestSubmitting}
                />
                <small>
                  {requestNotes.length}/500
                </small>
              </div>

              <div className="storage-request-cost-preview">
                <div>
                  <span>{t('Estimated Monthly Cost')}</span>
                  <strong>
                    {formatCurrency(
                      (convertToKg(
                        storageQuantity,
                        storageUnit,
                      ) / 1000) *
                        (Number(
                          requestFacility.storageCharges?.amount,
                        ) || 0),
                    )}
                  </strong>
                </div>
                <div>
                  <span>{t('Estimated Total Cost')}</span>
                  <strong>
                    {formatCurrency(
                      ((convertToKg(
                        storageQuantity,
                        storageUnit,
                      ) / 1000) *
                        (Number(
                          requestFacility.storageCharges?.amount,
                        ) || 0)) *
                        Number(
                          requestDurationMonths,
                        ),
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="storage-request-modal-footer">
              <button
                type="button"
                className="storage-request-cancel-button"
                onClick={closeStorageRequest}
                disabled={requestSubmitting}
              >
                {t('Cancel')}
              </button>

              <button
                type="button"
                className="storage-request-submit-button"
                onClick={submitStorageRequest}
                disabled={requestSubmitting}
              >
                {requestSubmitting ? (
                  <RefreshCw
                    size={16}
                    className="storage-loading-spin"
                  />
                ) : (
                  <Send size={16} />
                )}
                {requestSubmitting
                  ? t('Submitting...')
                  : t('Submit Request')}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ======================================
          Facility Details Modal
      ====================================== */}

      {selectedFacility && (

        <div
          className="storage-modal-overlay"
          onClick={() =>
            setSelectedFacility(null)
          }
        >

          <div
            className="storage-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              className="storage-modal-close"
              onClick={() =>
                setSelectedFacility(null)
              }
              aria-label={t('Close')}
            >
              <X size={20} />
            </button>


            <div className="storage-modal-header">

              <div
                className={
                  selectedFacility.type ===
                  'cold_storage'
                    ? 'storage-modal-icon cold'
                    : 'storage-modal-icon warehouse'
                }
              >

                {selectedFacility.type ===
                'cold_storage' ? (
                  <Snowflake size={27} />
                ) : (
                  <Warehouse size={27} />
                )}

              </div>


              <div>

                <span>
                  {selectedFacility.type ===
                  'cold_storage'
                    ? t('Cold Storage')
                    : t('Warehouse')}
                </span>

                <h2>
                  {selectedFacility.name}
                </h2>

              </div>

            </div>


            <div className="storage-modal-content">

              <div className="storage-modal-section">

                <h3>
                  {t('Location')}
                </h3>

                <p>

                  <MapPin size={16} />

                  {selectedFacility
                    .location
                    ?.address &&
                    `${selectedFacility.location.address}, `}

                  {selectedFacility
                    .location
                    ?.village &&
                    `${selectedFacility.location.village}, `}

                  {selectedFacility
                    .location
                    ?.district}

                  ,{' '}

                  {selectedFacility
                    .location
                    ?.state}

                </p>

              </div>


              <div className="storage-modal-section">

                <h3>
                  {t('Capacity')}
                </h3>

                <p>

                  <Package size={16} />

                  {
                    selectedFacility
                      .availableCapacity
                  }{' '}

                  {
                    selectedFacility
                      .capacityUnit
                  }

                  {' '}{t('available out of')}{' '}

                  {
                    selectedFacility
                      .capacity
                  }{' '}

                  {
                    selectedFacility
                      .capacityUnit
                  }

                </p>

              </div>


              {selectedFacility
                .temperatureRange && (

                <div className="storage-modal-section">

                  <h3>
                    {t('Storage Conditions')}
                  </h3>

                  <p>

                    <Thermometer
                      size={16}
                    />

                    {
                      selectedFacility
                        .temperatureRange
                    }

                  </p>

                </div>

              )}


              <div className="storage-modal-section">

                <h3>
                  {t('Suitable Crops')}
                </h3>

                <div className="storage-modal-crops">

                  {(
                    selectedFacility
                      .suitableCrops ||
                    []
                  ).map(
                    (crop) => (
                      <span
                        key={crop}
                      >
                        {crop}
                      </span>
                    ),
                  )}

                </div>

              </div>


              <div className="storage-modal-section">

                <h3>
                  {t('Storage Charges')}
                </h3>

                <p>

                  <IndianRupee
                    size={16}
                  />

                  {formatCurrency(
                    selectedFacility
                      .storageCharges
                      ?.amount,
                  )}{' '}

                  {
                    selectedFacility
                      .storageCharges
                      ?.unit
                  }

                </p>

              </div>


              <div className="storage-modal-section">

                <h3>
                  {t('Contact')}
                </h3>

                <p>

                  <Phone size={16} />

                  {
                    selectedFacility
                      .contact
                      ?.phone ||
                    t('Contact information unavailable')
                  }

                </p>

              </div>


              <div className="storage-modal-section">

                <h3>
                  {t('Operating Hours')}
                </h3>

                <p>
                  {
                    selectedFacility
                      .operatingHours
                  }
                </p>

              </div>

            </div>


            <div className="storage-modal-footer">

              {user?.role === 'farmer' &&
                finderSubmitted && (
                <button
                  type="button"
                  className="storage-request-modal-button"
                  onClick={() => {
                    openStorageRequest(
                      selectedFacility,
                    );
                    setSelectedFacility(null);
                  }}
                >
                  <Send size={17} />
                  {t('Request Storage')}
                </button>
              )}

              <button
                type="button"
                className="storage-call-button"
                onClick={() => {

                  const phone =
                    selectedFacility
                      .contact
                      ?.phone;

                  if (phone) {
                    window.location.href =
                      `tel:${phone}`;
                  }

                }}
              >

                <Phone size={17} />

                {t('Contact Facility')}

              </button>

            </div>

          </div>

        </div>

      )}

      <QrModal
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        entityType="storageRequest"
        entityId={qrTarget?._id}
        title={t('Cold Storage Check-in QR')}
        description={t('Verify your stored lot at check-in and quality inspection. The storage history is hash-chained for trust.')}
      />

    </div>
  );
}

export default Storage;