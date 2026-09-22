import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Truck,
  MapPin,
  Package,
  IndianRupee,
  CalendarDays,
  Clock,
  ArrowRight,
  UserRound,
  Phone,
  Route,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  XCircle,
  Navigation,
  CircleDollarSign,
  QrCode,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import QrModal from '../components/QrModal';

import './Backhaul.css';

function TraderBackhaul() {
  const {
    token,
    user,
  } = useAuth();

  const { t } = useLanguage();

  /* =========================================
     MARKETS
  ========================================= */

  const [markets, setMarkets] =
    useState([]);

  const [marketsLoading, setMarketsLoading] =
    useState(true);

  const [marketsError, setMarketsError] =
    useState('');

  /* =========================================
     PUBLISH FORM
  ========================================= */

  const [sourceMarket, setSourceMarket] =
    useState('');

  const [destinationMarket, setDestinationMarket] =
    useState('');

  const [vehicleNumber, setVehicleNumber] =
    useState('');

  const [vehicleType, setVehicleType] =
    useState('');

  const [driverName, setDriverName] =
    useState('');

  const [driverPhone, setDriverPhone] =
    useState('');

  const [capacity, setCapacity] =
    useState('');

  const [capacityUnit, setCapacityUnit] =
    useState('ton');

  const [availableCapacity, setAvailableCapacity] =
    useState('');

  const [departureDate, setDepartureDate] =
    useState('');

  const [departureTime, setDepartureTime] =
    useState('');

  const [estimatedDistance, setEstimatedDistance] =
    useState('');

  const [estimatedCost, setEstimatedCost] =
    useState('');

  const [notes, setNotes] =
    useState('');

  /* =========================================
     PUBLISH STATE
  ========================================= */

  const [publishing, setPublishing] =
    useState(false);

  const [publishMessage, setPublishMessage] =
    useState('');

  const [publishError, setPublishError] =
    useState('');

  /* =========================================
     MY TRUCKS
  ========================================= */

  const [myBackhaul, setMyBackhaul] =
    useState([]);

  const [loadingMyBackhaul, setLoadingMyBackhaul] =
    useState(true);

  const [myBackhaulError, setMyBackhaulError] =
    useState('');

  const [cancellingId, setCancellingId] =
    useState(null);

  const [qrTarget, setQrTarget] = useState(null);

  /* =========================================
     HELPERS
  ========================================= */

  const formatCurrency = (
    amount,
  ) => {
    if (
      amount === null ||
      amount === undefined ||
      Number.isNaN(
        Number(amount),
      )
    ) {
      return '—';
    }

    return `₹${Number(
      amount,
    ).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      },
    )}`;
  };

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

  const formatCapacity = (
    value,
    unit,
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return '—';
    }

    return `${Number(
      value,
    ).toLocaleString(
      'en-IN',
      {
        maximumFractionDigits: 2,
      },
    )} ${unit || ''}`.trim();
  };

  const convertToKg = (
    value,
    unit,
  ) => {
    const number =
      Number(value);

    if (
      !Number.isFinite(number)
    ) {
      return 0;
    }

    if (
      unit === 'ton'
    ) {
      return number * 1000;
    }

    if (
      unit === 'quintal'
    ) {
      return number * 100;
    }

    return number;
  };

  /* =========================================
     LOAD MARKETS
  ========================================= */

  const fetchMarkets = async () => {
    if (!token) {
      setMarketsLoading(false);
      return;
    }

    try {
      setMarketsLoading(true);
      setMarketsError('');

      const response =
        await fetch(
          `${API_URL}/markets`,
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Failed to load markets.'),
        );
      }

      const marketData =
        Array.isArray(
          data.data,
        )
          ? data.data
          : Array.isArray(
                data.markets,
              )
            ? data.markets
            : [];

      setMarkets(
        marketData,
      );
    } catch (error) {
      console.error(
        'Trader Backhaul Markets Error:',
        error,
      );

      setMarketsError(
        error.message ||
          t('Unable to load markets.'),
      );
    } finally {
      setMarketsLoading(false);
    }
  };

  /* =========================================
     LOAD MY BACKHAUL
  ========================================= */

  const fetchMyBackhaul =
    async () => {
      if (!token) {
        setLoadingMyBackhaul(
          false,
        );
        return;
      }

      try {
        setLoadingMyBackhaul(
          true,
        );

        setMyBackhaulError('');

        const response =
          await fetch(
            `${API_URL}/backhaul/mine`,
            {
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t('Failed to load your transport.'),
          );
        }

        setMyBackhaul(
          Array.isArray(
            data.data,
          )
            ? data.data
            : [],
        );
      } catch (error) {
        console.error(
          'Trader Backhaul Error:',
          error,
        );

        setMyBackhaulError(
          error.message ||
            t('Unable to load your transport.'),
        );
      } finally {
        setLoadingMyBackhaul(
          false,
        );
      }
    };

  useEffect(() => {
    fetchMarkets();
    fetchMyBackhaul();
  }, [token]);

  /* =========================================
     SORT MARKETS
  ========================================= */

  const sortedMarkets =
    useMemo(() => {
      return [
        ...markets,
      ].sort((a, b) =>
        String(
          a.name || '',
        ).localeCompare(
          String(
            b.name || '',
          ),
        ),
      );
    }, [markets]);

  /* =========================================
     CAPACITY VALIDATION
  ========================================= */

  const totalCapacityKg =
    convertToKg(
      capacity,
      capacityUnit,
    );

  const availableCapacityKg =
    convertToKg(
      availableCapacity,
      capacityUnit,
    );

  const capacityValid =
    totalCapacityKg > 0 &&
    availableCapacityKg > 0 &&
    availableCapacityKg <=
      totalCapacityKg;

  /* =========================================
     PUBLISH TRUCK
  ========================================= */

  const handlePublish =
    async (
      event,
    ) => {
      event.preventDefault();

      setPublishMessage('');
      setPublishError('');

      if (!token) {
        setPublishError(
          t('Your session has expired. Please log in again.'),
        );
        return;
      }

      if (!sourceMarket) {
        setPublishError(
          t('Please select the source market.'),
        );
        return;
      }

      if (!destinationMarket) {
        setPublishError(
          t('Please select the destination market.'),
        );
        return;
      }

      if (
        sourceMarket ===
        destinationMarket
      ) {
        setPublishError(
          t('Source and destination markets must be different.'),
        );
        return;
      }

      if (
        !vehicleNumber.trim()
      ) {
        setPublishError(
          t('Please enter the vehicle number.'),
        );
        return;
      }

      if (
        !vehicleType.trim()
      ) {
        setPublishError(
          t('Please enter the vehicle type.'),
        );
        return;
      }

      if (
        !driverName.trim()
      ) {
        setPublishError(
          t('Please enter the driver name.'),
        );
        return;
      }

      if (
        !driverPhone.trim()
      ) {
        setPublishError(
          t('Please enter the driver phone number.'),
        );
        return;
      }

      if (
        !capacity ||
        Number(capacity) <= 0
      ) {
        setPublishError(
          t('Please enter a valid truck capacity.'),
        );
        return;
      }

      if (
        !availableCapacity ||
        Number(
          availableCapacity,
        ) <= 0
      ) {
        setPublishError(
          t('Please enter the available return capacity.'),
        );
        return;
      }

      if (!capacityValid) {
        setPublishError(
          t('Available capacity cannot be greater than total truck capacity.'),
        );
        return;
      }

      if (!departureDate) {
        setPublishError(
          t('Please select the departure date.'),
        );
        return;
      }

      if (!departureTime) {
        setPublishError(
          t('Please select the departure time.'),
        );
        return;
      }

      if (
        !estimatedCost ||
        Number(estimatedCost) < 0
      ) {
        setPublishError(
          t('Please enter a valid estimated transport cost.'),
        );
        return;
      }

      try {
        setPublishing(true);

        const body = {
          sourceMarket,
          destinationMarket,

          transportType:
            'trader',

          vehicleNumber:
            vehicleNumber.trim(),

          vehicleType:
            vehicleType.trim(),

          driverName:
            driverName.trim(),

          driverPhone:
            driverPhone.trim(),

          capacity:
            Number(capacity),

          capacityUnit,

          availableCapacity:
            Number(
              availableCapacity,
            ),

          departureDate,

          departureTime,

          estimatedDistanceKm:
            estimatedDistance
              ? Number(
                  estimatedDistance,
                )
              : null,

          estimatedCost:
            Number(
              estimatedCost,
            ),

          costUnit:
            'total',

          notes:
            notes.trim(),
        };

        const response =
          await fetch(
            `${API_URL}/backhaul`,
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${token}`,
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify(
                body,
              ),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t('Failed to publish return transport.'),
          );
        }

        setPublishMessage(
          data.message ||
            t('Trader transport published successfully.'),
        );

        /* Reset form */

        setSourceMarket('');
        setDestinationMarket('');
        setVehicleNumber('');
        setVehicleType('');
        setDriverName('');
        setDriverPhone('');
        setCapacity('');
        setCapacityUnit('ton');
        setAvailableCapacity('');
        setDepartureDate('');
        setDepartureTime('');
        setEstimatedDistance('');
        setEstimatedCost('');
        setNotes('');

        /* Refresh published trucks */

        await fetchMyBackhaul();
      } catch (error) {
        console.error(
          'Publish Trader Backhaul Error:',
          error,
        );

        setPublishError(
          error.message ||
            t('Unable to publish return transport.'),
        );
      } finally {
        setPublishing(false);
      }
    };

  /* =========================================
     CANCEL TRUCK
  ========================================= */

  const handleCancel =
    async (
      backhaul,
    ) => {
      if (!token) {
        return;
      }

      const confirmed =
        window.confirm(
          t('Cancel return transport {0}?', backhaul.vehicleNumber || ''),
        );

      if (!confirmed) {
        return;
      }

      try {
        setCancellingId(
          backhaul._id,
        );

        const response =
          await fetch(
            `${API_URL}/backhaul/${backhaul._id}/cancel`,
            {
              method: 'PATCH',
              headers: {
                Authorization:
                  `Bearer ${token}`,
              },
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t('Failed to cancel transport.'),
          );
        }

        await fetchMyBackhaul();
      } catch (error) {
        console.error(
          'Cancel Backhaul Error:',
          error,
        );

        setMyBackhaulError(
          error.message ||
            t('Unable to cancel transport.'),
        );
      } finally {
        setCancellingId(
          null,
        );
      }
    };

  /* =========================================
     STATUS BADGE
  ========================================= */

  const getStatusClass =
    (status) => {
      switch (status) {
        case 'available':
          return {
            background:
              '#eef8f2',
            color:
              '#197548',
          };

        case 'selected':
          return {
            background:
              '#fff7e6',
            color:
              '#a56700',
          };

        case 'confirmed':
          return {
            background:
              '#edf5ff',
            color:
              '#2768a8',
          };

        case 'completed':
          return {
            background:
              '#eef1f3',
            color:
              '#52605a',
          };

        case 'cancelled':
          return {
            background:
              '#fff0f0',
            color:
              '#b34747',
          };

        default:
          return {
            background:
              '#f3f5f4',
            color:
              '#66736b',
          };
      }
    };

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="backhaul-page">

      {/* =====================================
          HEADER
      ===================================== */}

      <div className="backhaul-header">

        <div>
          <div className="backhaul-title-row">

            <div className="backhaul-title-icon">
              <Truck size={24} />
            </div>

            <div>
              <h1>
                {t('Trader Backhaul')}
              </h1>

              <p>
                {t('Publish your return truck and earn from unused capacity.')}
              </p>
            </div>

          </div>
        </div>

        <div className="backhaul-header-badge">
          <Truck size={17} />
          {t('Return Load')}
        </div>

      </div>

      {/* =====================================
          PUBLISH CARD
      ===================================== */}

      <section className="backhaul-search-card">

        <div className="section-heading">

          <div className="section-heading-icon">
            <Navigation size={18} />
          </div>

          <div>
            <h2>
              {t('Publish Return Transport')}
            </h2>

            <p>
              {t('Tell farmers where your truck is going and how much space is available.')}
            </p>
          </div>

        </div>

        <form
          className="backhaul-search-form"
          onSubmit={
            handlePublish
          }
        >

          {/* =================================
              ROUTE
          ================================= */}

          <div className="backhaul-form-grid">

            <div className="backhaul-field">

              <label>
                <MapPin size={15} />
                {t('Source Market')}
              </label>

              <select
                value={
                  sourceMarket
                }
                onChange={(event) =>
                  setSourceMarket(
                    event.target.value,
                  )
                }
                disabled={
                  marketsLoading
                }
              >

                <option value="">
                  {marketsLoading
                    ? t('Loading markets...')
                    : t('Select source market')}
                </option>

                {sortedMarkets.map(
                  (market) => (
                    <option
                      key={
                        market._id
                      }
                      value={
                        market._id
                      }
                    >
                      {market.name}
                      {market.district
                        ? ` — ${market.district}`
                        : ''}
                    </option>
                  ),
                )}

              </select>

            </div>

            <div className="backhaul-route-arrow">
              <ArrowRight size={20} />
            </div>

            <div className="backhaul-field">

              <label>
                <MapPin size={15} />
                {t('Destination Market')}
              </label>

              <select
                value={
                  destinationMarket
                }
                onChange={(event) =>
                  setDestinationMarket(
                    event.target.value,
                  )
                }
                disabled={
                  marketsLoading
                }
              >

                <option value="">
                  {marketsLoading
                    ? t('Loading markets...')
                    : t('Select destination market')}
                </option>

                {sortedMarkets.map(
                  (market) => (
                    <option
                      key={
                        market._id
                      }
                      value={
                        market._id
                      }
                    >
                      {market.name}
                      {market.district
                        ? ` — ${market.district}`
                        : ''}
                    </option>
                  ),
                )}

              </select>

            </div>

          </div>

          {/* =================================
              VEHICLE
          ================================= */}

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap:
                '16px',
              marginTop:
                '18px',
            }}
          >

            <div className="backhaul-field">

              <label>
                <Truck size={15} />
                {t('Vehicle Number')}
              </label>

              <input
                type="text"
                placeholder={t('e.g. MH12AB1234')}
                value={
                  vehicleNumber
                }
                onChange={(event) =>
                  setVehicleNumber(
                    event.target.value,
                  )
                }
              />

            </div>

            <div className="backhaul-field">

              <label>
                <Truck size={15} />
                {t('Vehicle Type')}
              </label>

              <input
                type="text"
                placeholder={t('e.g. 10-Wheeler Truck')}
                value={
                  vehicleType
                }
                onChange={(event) =>
                  setVehicleType(
                    event.target.value,
                  )
                }
              />

            </div>

            <div className="backhaul-field">

              <label>
                <UserRound size={15} />
                {t('Driver Name')}
              </label>

              <input
                type="text"
                placeholder={t('Enter driver name')}
                value={
                  driverName
                }
                onChange={(event) =>
                  setDriverName(
                    event.target.value,
                  )
                }
              />

            </div>

            <div className="backhaul-field">

              <label>
                <Phone size={15} />
                {t('Driver Phone')}
              </label>

              <input
                type="tel"
                placeholder={t('Enter driver phone')}
                value={
                  driverPhone
                }
                onChange={(event) =>
                  setDriverPhone(
                    event.target.value,
                  )
                }
              />

            </div>

          </div>

          {/* =================================
              CAPACITY
          ================================= */}

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap:
                '16px',
              marginTop:
                '16px',
            }}
          >

            <div className="backhaul-field">

              <label>
                <Package size={15} />
                {t('Total Truck Capacity')}
              </label>

              <div className="quantity-input-group">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('e.g. 10')}
                  value={
                    capacity
                  }
                  onChange={(event) =>
                    setCapacity(
                      event.target.value,
                    )
                  }
                />

                <select
                  value={
                    capacityUnit
                  }
                  onChange={(event) =>
                    setCapacityUnit(
                      event.target.value,
                    )
                  }
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

            <div className="backhaul-field">

              <label>
                <Package size={15} />
                {t('Available Return Capacity')}
              </label>

              <div className="quantity-input-group">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('e.g. 2')}
                  value={
                    availableCapacity
                  }
                  onChange={(event) =>
                    setAvailableCapacity(
                      event.target.value,
                    )
                  }
                />

                <div
                  style={{
                    height:
                      '46px',
                    display:
                      'flex',
                    alignItems:
                      'center',
                    justifyContent:
                      'center',
                    minWidth:
                      '72px',
                    border:
                      '1px solid #dce4df',
                    borderLeft:
                      '0',
                    borderRadius:
                      '0 10px 10px 0',
                    background:
                      '#fafcfb',
                    color:
                      '#5f6c64',
                    fontSize:
                      '13px',
                  }}
                >
                  {capacityUnit}
                </div>

              </div>

            </div>

          </div>

          {capacity &&
            availableCapacity && (
            <div
              style={{
                marginTop:
                  '12px',
                padding:
                  '11px 13px',
                borderRadius:
                  '9px',
                background:
                  capacityValid
                    ? '#f0faf4'
                    : '#fff3f3',
                color:
                  capacityValid
                    ? '#28704b'
                    : '#ad4848',
                fontSize:
                  '11px',
              }}
            >
              {capacityValid ? (
                <>
                  {t('Available return capacity:')}{' '}
                  <strong>
                    {formatCapacity(
                      availableCapacity,
                      capacityUnit,
                    )}
                  </strong>{' '}
                  {t('of')}{' '}
                  <strong>
                    {formatCapacity(
                      capacity,
                      capacityUnit,
                    )}
                  </strong>
                </>
              ) : (
                <>
                  {t('Available capacity cannot exceed the total truck capacity.')}
                </>
              )}
            </div>
          )}

          {/* =================================
              JOURNEY
          ================================= */}

          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(2, minmax(0, 1fr))',
              gap:
                '16px',
              marginTop:
                '16px',
            }}
          >

            <div className="backhaul-field">

              <label>
                <CalendarDays
                  size={15}
                />
                {t('Departure Date')}
              </label>

              <input
                type="date"
                value={
                  departureDate
                }
                onChange={(event) =>
                  setDepartureDate(
                    event.target.value,
                  )
                }
              />

            </div>

            <div className="backhaul-field">

              <label>
                <Clock size={15} />
                {t('Departure Time')}
              </label>

              <input
                type="time"
                value={
                  departureTime
                }
                onChange={(event) =>
                  setDepartureTime(
                    event.target.value,
                  )
                }
              />

            </div>

            <div className="backhaul-field">

              <label>
                <Route size={15} />
                {t('Estimated Distance')}
              </label>

              <input
                type="number"
                min="0"
                step="0.1"
                placeholder={t('e.g. 150')}
                value={
                  estimatedDistance
                }
                onChange={(event) =>
                  setEstimatedDistance(
                    event.target.value,
                  )
                }
              />

              <small
                style={{
                  color:
                    '#7b877f',
                  fontSize:
                    '10px',
                  marginTop:
                    '5px',
                  display:
                    'block',
                }}
              >
                {t('Kilometres')}
              </small>

            </div>

            <div className="backhaul-field">

              <label>
                <IndianRupee
                  size={15}
                />
                {t('Estimated Transport Cost')}
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={t('e.g. 2500')}
                value={
                  estimatedCost
                }
                onChange={(event) =>
                  setEstimatedCost(
                    event.target.value,
                  )
                }
              />

            </div>

          </div>

          {/* =================================
              NOTES
          ================================= */}

          <div
            className="backhaul-field"
            style={{
              marginTop:
                '16px',
            }}
          >

            <label>
              {t('Notes')}
            </label>

            <textarea
              placeholder={t('Add details about the return trip...')}
              value={
                notes
              }
              onChange={(event) =>
                setNotes(
                  event.target.value,
                )
              }
              style={{
                width:
                  '100%',
                minHeight:
                  '90px',
                padding:
                  '12px',
                border:
                  '1px solid #dce4df',
                borderRadius:
                  '10px',
                resize:
                  'vertical',
                boxSizing:
                  'border-box',
                fontFamily:
                  'inherit',
                fontSize:
                  '13px',
                outline:
                  'none',
              }}
            />

          </div>

          {/* =================================
              COST PREVIEW
          ================================= */}

          {estimatedCost && (
            <div
              style={{
                marginTop:
                  '18px',
                padding:
                  '15px',
                borderRadius:
                  '12px',
                background:
                  '#f0faf4',
                border:
                  '1px solid #d2eadb',
              }}
            >

              <div
                style={{
                  display:
                    'flex',
                  alignItems:
                    'center',
                  gap:
                    '8px',
                }}
              >

                <CircleDollarSign
                  size={19}
                  color="#198754"
                />

                <strong
                  style={{
                    color:
                      '#236044',
                    fontSize:
                      '14px',
                  }}
                >
                  {t('Published Transport Cost')}
                </strong>

                <strong
                  style={{
                    marginLeft:
                      'auto',
                    color:
                      '#198754',
                    fontSize:
                      '18px',
                  }}
                >
                  {formatCurrency(
                    estimatedCost,
                  )}
                </strong>

              </div>

              <p
                style={{
                  margin:
                    '7px 0 0',
                  color:
                    '#748078',
                  fontSize:
                    '10px',
                }}
              >
                {t("This is an estimated truck cost. Farmers will see it as an estimated transport amount.")}
              </p>

            </div>
          )}

          {/* =================================
              ERRORS
          ================================= */}

          {publishError && (
            <div
              className="backhaul-message"
              style={{
                marginTop:
                  '16px',
              }}
            >

              <AlertCircle
                size={17}
              />

              <span>
                {publishError}
              </span>

            </div>
          )}

          {publishMessage && (
            <div
              className="backhaul-message"
              style={{
                marginTop:
                  '16px',
              }}
            >

              <CheckCircle2
                size={17}
              />

              <span>
                {publishMessage}
              </span>

            </div>
          )}

          {/* =================================
              SUBMIT
          ================================= */}

          <div
            className="backhaul-search-actions"
            style={{
              marginTop:
                '20px',
            }}
          >

            <button
              type="submit"
              className="backhaul-search-button"
              disabled={
                publishing ||
                marketsLoading
              }
            >

              {publishing ? (
                <>
                  <Loader2
                    size={18}
                    className="spin"
                  />
                  {t('Publishing...')}
                </>
              ) : (
                <>
                  <Truck size={18} />
                  {t('Publish Return Truck')}
                </>
              )}

            </button>

          </div>

        </form>

      </section>

      {/* =====================================
          MY PUBLISHED TRUCKS
      ===================================== */}

      <section className="backhaul-results-section">

        <div
          className="section-heading"
          style={{
            display:
              'flex',
            alignItems:
              'center',
            justifyContent:
              'space-between',
          }}
        >

          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap:
                '12px',
            }}
          >

            <div className="section-heading-icon">
              <Truck size={18} />
            </div>

            <div>
              <h2>
                {t('My Published Trucks')}
              </h2>

              <p>
                {t('Manage your return transport listings.')}
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={
              fetchMyBackhaul
            }
            disabled={
              loadingMyBackhaul
            }
            style={{
              border:
                '1px solid #dce8df',
              background:
                '#ffffff',
              color:
                '#237651',
              borderRadius:
                '9px',
              padding:
                '8px 11px',
              display:
                'inline-flex',
              alignItems:
                'center',
              gap:
                '6px',
              cursor:
                'pointer',
              fontSize:
                '11px',
              fontWeight:
                650,
            }}
          >

            <RefreshCw
              size={14}
              className={
                loadingMyBackhaul
                  ? 'spin'
                  : ''
              }
            />

            {t('Refresh')}

          </button>

        </div>

        {myBackhaulError && (
          <div
            className="backhaul-message"
            style={{
              marginBottom:
                '16px',
            }}
          >

            <AlertCircle
              size={17}
            />

            <span>
              {myBackhaulError}
            </span>

          </div>
        )}

        {loadingMyBackhaul ? (
          <div className="backhaul-empty-state">

            <div className="backhaul-empty-icon">
              <Loader2
                size={30}
                className="spin"
              />
            </div>

            <h3>
              {t('Loading your trucks...')}
            </h3>

            <p>
              {t('Fetching your published return transport.')}
            </p>

          </div>
        ) : myBackhaul.length ===
          0 ? (
          <div className="backhaul-empty-state">

            <div className="backhaul-empty-icon">
              <Truck size={30} />
            </div>

            <h3>
              {t('No published trucks')}
            </h3>

            <p>
              {t('Your published return transport will appear here.')}
            </p>

          </div>
        ) : (
          <div
            style={{
              display:
                'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(300px, 1fr))',
              gap:
                '15px',
            }}
          >

            {myBackhaul.map(
              (transport) => {
                const statusStyle =
                  getStatusClass(
                    transport.status,
                  );

                const canCancel =
                  ![
                    'completed',
                    'cancelled',
                  ].includes(
                    transport.status,
                  );

                return (
                  <article
                    key={
                      transport._id
                    }
                    style={{
                      border:
                        '1px solid #dfe8e2',
                      borderRadius:
                        '15px',
                      padding:
                        '18px',
                      background:
                        '#ffffff',
                    }}
                  >

                    {/* HEADER */}

                    <div
                      style={{
                        display:
                          'flex',
                        justifyContent:
                          'space-between',
                        gap:
                          '10px',
                      }}
                    >

                      <div>

                        <span
                          style={{
                            display:
                              'inline-flex',
                            padding:
                              '5px 8px',
                            borderRadius:
                              '999px',
                            background:
                              statusStyle.background,
                            color:
                              statusStyle.color,
                            fontSize:
                              '10px',
                            fontWeight:
                              700,
                            textTransform:
                              'uppercase',
                          }}
                        >
                          {
                            transport.status
                          }
                        </span>

                        <h3
                          style={{
                            margin:
                              '9px 0 3px',
                            color:
                              '#243229',
                            fontSize:
                              '17px',
                          }}
                        >
                          {transport.vehicleNumber ||
                            t('Vehicle')}
                        </h3>

                        <p
                          style={{
                            margin: 0,
                            color:
                              '#77827b',
                            fontSize:
                              '12px',
                          }}
                        >
                          {transport.vehicleType ||
                            t('Truck')}
                        </p>

                      </div>

                      <div
                        style={{
                          textAlign:
                            'right',
                        }}
                      >

                        <span
                          style={{
                            display:
                              'block',
                            color:
                              '#87918b',
                            fontSize:
                              '10px',
                          }}
                        >
                          {t('Estimated cost')}
                        </span>

                        <strong
                          style={{
                            display:
                              'block',
                            color:
                              '#198754',
                            fontSize:
                              '17px',
                            marginTop:
                              '2px',
                          }}
                        >
                          {formatCurrency(
                            transport.estimatedCost,
                          )}
                        </strong>

                      </div>

                    </div>

                    {/* ROUTE */}

                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap:
                          '8px',
                        marginTop:
                          '14px',
                        padding:
                          '11px',
                        borderRadius:
                          '10px',
                        background:
                          '#f7faf8',
                      }}
                    >

                      <MapPin
                        size={16}
                        color="#198754"
                      />

                      <span
                        style={{
                          fontSize:
                            '12px',
                          fontWeight:
                            600,
                          color:
                            '#344139',
                        }}
                      >
                        {transport.sourceMarket?.name ||
                          t('Source')}
                      </span>

                      <ArrowRight
                        size={15}
                        color="#8a968e"
                      />

                      <span
                        style={{
                          fontSize:
                            '12px',
                          fontWeight:
                            600,
                          color:
                            '#344139',
                        }}
                      >
                        {transport.destinationMarket?.name ||
                          t('Destination')}
                      </span>

                    </div>

                    {/* CAPACITY */}

                    <div
                      style={{
                        display:
                          'grid',
                        gridTemplateColumns:
                          'repeat(2, minmax(0, 1fr))',
                        gap:
                          '12px',
                        marginTop:
                          '15px',
                      }}
                    >

                      <div>

                        <span
                          style={{
                            display:
                              'block',
                            color:
                              '#87918b',
                            fontSize:
                              '10px',
                            marginBottom:
                              '3px',
                          }}
                        >
                          {t('Total Capacity')}
                        </span>

                        <strong
                          style={{
                            color:
                              '#35423a',
                            fontSize:
                              '13px',
                          }}
                        >
                          {formatCapacity(
                            transport.capacity,
                            transport.capacityUnit,
                          )}
                        </strong>

                      </div>

                      <div>

                        <span
                          style={{
                            display:
                              'block',
                            color:
                              '#87918b',
                            fontSize:
                              '10px',
                            marginBottom:
                              '3px',
                          }}
                        >
                          {t('Available')}
                        </span>

                        <strong
                          style={{
                            color:
                              '#198754',
                            fontSize:
                              '13px',
                          }}
                        >
                          {formatCapacity(
                            transport.availableCapacity,
                            transport.capacityUnit,
                          )}
                        </strong>

                      </div>

                      <div>

                        <span
                          style={{
                            display:
                              'block',
                            color:
                              '#87918b',
                            fontSize:
                              '10px',
                            marginBottom:
                              '3px',
                          }}
                        >
                          {t('Allocated')}
                        </span>

                        <strong
                          style={{
                            color:
                              '#35423a',
                            fontSize:
                              '13px',
                          }}
                        >
                          {formatCapacity(
                            transport.allocatedQuantity,
                            transport.allocatedQuantityUnit,
                          )}
                        </strong>

                      </div>

                      <div>

                        <span
                          style={{
                            display:
                              'block',
                            color:
                              '#87918b',
                            fontSize:
                              '10px',
                            marginBottom:
                              '3px',
                          }}
                        >
                          {t('Departure')}
                        </span>

                        <strong
                          style={{
                            color:
                              '#35423a',
                            fontSize:
                              '13px',
                          }}
                        >
                          {formatDate(
                            transport.departureDate,
                          )}
                          {' · '}
                          {transport.departureTime ||
                            '—'}
                        </strong>

                      </div>

                    </div>

                    {/* DRIVER */}

                    <div
                      style={{
                        display:
                          'flex',
                        alignItems:
                          'center',
                        gap:
                          '9px',
                        marginTop:
                          '15px',
                        padding:
                          '10px 0',
                        borderTop:
                          '1px solid #edf1ee',
                        borderBottom:
                          '1px solid #edf1ee',
                      }}
                    >

                      <div
                        style={{
                          width:
                            '34px',
                          height:
                            '34px',
                          borderRadius:
                            '9px',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          background:
                            '#edf8f1',
                          color:
                            '#198754',
                        }}
                      >
                        <UserRound
                          size={16}
                        />
                      </div>

                      <div
                        style={{
                          flex:
                            1,
                        }}
                      >

                        <span
                          style={{
                            display:
                              'block',
                            color:
                              '#87918b',
                            fontSize:
                              '10px',
                          }}
                        >
                          {t('Driver')}
                        </span>

                        <strong
                          style={{
                            display:
                              'block',
                            color:
                              '#35423a',
                            fontSize:
                              '12px',
                          }}
                        >
                          {transport.driverName ||
                            t('Driver')}
                        </strong>

                      </div>

                      {transport.driverPhone && (
                        <a
                          href={`tel:${transport.driverPhone}`}
                          style={{
                            display:
                              'inline-flex',
                            alignItems:
                              'center',
                            gap:
                              '5px',
                            color:
                              '#198754',
                            textDecoration:
                              'none',
                            fontSize:
                              '11px',
                            fontWeight:
                              650,
                          }}
                        >
                          <Phone
                            size={14}
                          />
                          {t('Call')}
                        </a>
                      )}

                    </div>

                    {/* FARMER ALLOCATION */}

                    {Number(
                      transport.allocatedQuantity ||
                        0,
                    ) > 0 && (
                      <div
                        style={{
                          marginTop:
                            '13px',
                          padding:
                            '11px',
                          borderRadius:
                            '9px',
                          background:
                            '#fff8e9',
                          color:
                            '#8c6500',
                          fontSize:
                            '11px',
                        }}
                      >
                        <strong>
                          {t('Farmer allocation:')}
                        </strong>{' '}
                        {formatCapacity(
                          transport.allocatedQuantity,
                          transport.allocatedQuantityUnit,
                        )}
                        {' · '}
                        {t('Farmer transport cost:')}{' '}
                        {formatCurrency(
                          transport.farmerTransportCost,
                        )}
                      </div>
                    )}

                    {/* ACTION */}

                    {canCancel && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCancel(
                            transport,
                          )
                        }
                        disabled={
                          cancellingId ===
                          transport._id
                        }
                        style={{
                          width:
                            '100%',
                          marginTop:
                            '15px',
                          border:
                            '1px solid #f0d2d2',
                          background:
                            '#fff7f7',
                          color:
                            '#ad4848',
                          borderRadius:
                            '9px',
                          padding:
                            '10px',
                          cursor:
                            'pointer',
                          display:
                            'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          gap:
                            '7px',
                          fontSize:
                            '12px',
                          fontWeight:
                            650,
                        }}
                      >

                        {cancellingId ===
                        transport._id ? (
                          <>
                            <Loader2
                              size={15}
                              className="spin"
                            />
                            {t('Cancelling...')}
                          </>
                        ) : (
                          <>
                            <XCircle
                              size={15}
                            />
                            {t('Cancel Transport')}
                          </>
                        )}

                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setQrTarget(transport)
                      }
                      style={{
                        width:
                          '100%',
                        marginTop:
                          '10px',
                        border:
                          '1px solid #bcdacd',
                        background:
                          '#eef7f2',
                        color:
                          '#1c5c3b',
                        borderRadius:
                          '9px',
                        padding:
                          '10px',
                        cursor:
                          'pointer',
                        display:
                          'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        gap:
                          '7px',
                        fontSize:
                          '12px',
                        fontWeight:
                          650,
                      }}
                    >
                      <QrCode size={15} />
                      {t('Logistics QR')}
                    </button>

                  </article>
                );
              },
            )}

          </div>
        )}

      </section>

      <QrModal
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        entityType="backhaul"
        entityId={qrTarget?._id}
        title={t('Logistics QR')}
        description={t('Verify this transport consignment at pickup, weighbridge and drop-off for a tamper-proof logistics trail.')}
      />

      {/* =====================================
          INFO
      ===================================== */}

      <section className="backhaul-info-grid">

        <div className="backhaul-info-card">

          <div className="backhaul-info-icon">
            <Package size={20} />
          </div>

          <div>
            <strong>
              {t('Use Empty Capacity')}
            </strong>

            <p>
              {t('Publish unused truck space for farmers travelling on the same route.')}
            </p>
          </div>

        </div>

        <div className="backhaul-info-card">

          <div className="backhaul-info-icon">
            <CircleDollarSign
              size={20}
            />
          </div>

          <div>
            <strong>
              {t('Estimated Cost')}
            </strong>

            <p>
              {t('Farmers see the published transport cost as an estimated amount.')}
            </p>
          </div>

        </div>

        <div className="backhaul-info-card">

          <div className="backhaul-info-icon">
            <UserRound size={20} />
          </div>

          <div>
            <strong>
              {t('Driver Details')}
            </strong>

            <p>
              {t('Provide vehicle and driver information so farmers can identify the return truck.')}
            </p>
          </div>

        </div>

      </section>

      {user && (
        <div
          style={{
            marginTop:
              '18px',
            color:
              '#89938d',
            fontSize:
              '10px',
            textAlign:
              'right',
          }}
        >
          {t('Logged in as')}{' '}
          {user.name ||
            t('Trader')}{' '}
          · {t('Trader')}
        </div>
      )}

    </div>
  );
}

export default TraderBackhaul;