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
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Route,
  CircleDollarSign,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import API_URL from '../config/api';

import './Backhaul.css';

function Backhaul() {
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
     SEARCH FORM
  ========================================= */

  const [sourceMarket, setSourceMarket] =
    useState('');

  const [destinationMarket, setDestinationMarket] =
    useState('');

  const [quantity, setQuantity] =
    useState('');

  const [quantityUnit, setQuantityUnit] =
    useState('kg');

  const [transportType, setTransportType] =
    useState('trader');

  /* =========================================
     TRADER TRANSPORT RESULTS
  ========================================= */

  const [transports, setTransports] =
    useState([]);

  const [searching, setSearching] =
    useState(false);

  const [searched, setSearched] =
    useState(false);

  const [searchError, setSearchError] =
    useState('');

  /* =========================================
     TRADER SELECTION
  ========================================= */

  const [selectingId, setSelectingId] =
    useState(null);

  const [selectedTransport, setSelectedTransport] =
    useState(null);

  const [allocation, setAllocation] =
    useState(null);

  const [selectionMessage, setSelectionMessage] =
    useState('');

  /* =========================================
     OWN TRANSPORT
  ========================================= */

  const [ownVehicleNumber, setOwnVehicleNumber] =
    useState('');

  const [ownVehicleType, setOwnVehicleType] =
    useState('');

  const [ownDriverName, setOwnDriverName] =
    useState('');

  const [ownDriverPhone, setOwnDriverPhone] =
    useState('');

  const [ownCapacity, setOwnCapacity] =
    useState('');

  const [ownCapacityUnit, setOwnCapacityUnit] =
    useState('ton');

  const [ownDepartureDate, setOwnDepartureDate] =
    useState('');

  const [ownDepartureTime, setOwnDepartureTime] =
    useState('');

  const [ownDistance, setOwnDistance] =
    useState('');

  const [ownEstimatedCost, setOwnEstimatedCost] =
    useState('');

  const [ownNotes, setOwnNotes] =
    useState('');

  const [publishingOwn, setPublishingOwn] =
    useState(false);

  const [ownTransportResult, setOwnTransportResult] =
    useState(null);

  const [ownTransportMessage, setOwnTransportMessage] =
    useState('');

  /* =========================================
     GENERAL MESSAGE
  ========================================= */

  const [message, setMessage] =
    useState('');

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

      const response = await fetch(
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
        Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.markets)
            ? data.markets
            : [];

      setMarkets(
        marketData,
      );
    } catch (error) {
      console.error(
        'Backhaul markets error:',
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

  useEffect(() => {
    fetchMarkets();
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
     QUANTITY CONVERSION
  ========================================= */

  const quantityInKg =
    useMemo(() => {
      const value =
        Number(quantity);

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return 0;
      }

      if (
        quantityUnit === 'ton'
      ) {
        return value * 1000;
      }

      if (
        quantityUnit === 'quintal'
      ) {
        return value * 100;
      }

      return value;
    }, [
      quantity,
      quantityUnit,
    ]);

  /* =========================================
     FORMAT HELPERS
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

  const convertCapacityToKg = (
    value,
    unit,
  ) => {
    const numericValue =
      Number(value);

    if (
      !Number.isFinite(
        numericValue,
      )
    ) {
      return 0;
    }

    if (
      unit === 'ton'
    ) {
      return (
        numericValue *
        1000
      );
    }

    if (
      unit === 'quintal'
    ) {
      return (
        numericValue *
        100
      );
    }

    return numericValue;
  };

  const calculateEstimatedShare =
    (transport) => {
      const totalCapacityKg =
        convertCapacityToKg(
          transport.capacity,
          transport.capacityUnit,
        );

      if (
        totalCapacityKg <= 0 ||
        quantityInKg <= 0 ||
        !transport.estimatedCost
      ) {
        return null;
      }

      return (
        (quantityInKg /
          totalCapacityKg) *
        Number(
          transport.estimatedCost,
        )
      );
    };

  /* =========================================
     HANDLE TRANSPORT TYPE
  ========================================= */

  const handleTransportTypeChange =
    (type) => {
      setTransportType(type);

      setTransports([]);
      setSearched(false);

      setSearchError('');
      setMessage('');

      setSelectedTransport(
        null,
      );

      setAllocation(null);
      setSelectionMessage('');

      if (type === 'own') {
        setOwnTransportMessage('');
      }
    };

  /* =========================================
     SEARCH TRADER TRANSPORT
  ========================================= */

  const handleSearch = async (
    event,
  ) => {
    event.preventDefault();

    setMessage('');
    setSearchError('');
    setSelectionMessage('');

    if (!sourceMarket) {
      setSearchError(
        t('Please select a source market.'),
      );
      return;
    }

    if (!destinationMarket) {
      setSearchError(
        t('Please select a destination market.'),
      );
      return;
    }

    if (
      sourceMarket ===
      destinationMarket
    ) {
      setSearchError(
        t('Source and destination markets must be different.'),
      );
      return;
    }

    if (
      !quantity ||
      Number(quantity) <= 0
    ) {
      setSearchError(
        t('Please enter a valid quantity.'),
      );
      return;
    }

    if (
      transportType === 'own'
    ) {
      setSearched(true);
      setMessage('');

      return;
    }

    try {
      setSearching(true);
      setSearched(true);

      const params =
        new URLSearchParams();

      params.set(
        'sourceMarket',
        sourceMarket,
      );

      params.set(
        'destinationMarket',
        destinationMarket,
      );

      const response =
        await fetch(
          `${API_URL}/backhaul?${params.toString()}`,
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
            t('Failed to search available transport.'),
        );
      }

      const resultData =
        Array.isArray(
          data.data,
        )
          ? data.data
          : [];

      const suitableTransports =
        resultData.filter(
          (transport) => {
            const availableKg =
              convertCapacityToKg(
                transport.availableCapacity,
                transport.capacityUnit,
              );

            return (
              availableKg >=
              quantityInKg
            );
          },
        );

      setTransports(
        suitableTransports,
      );

      if (
        suitableTransports.length ===
        0
      ) {
        setMessage(
          t('No available trader transport has enough capacity for your quantity on this route.'),
        );
      }
    } catch (error) {
      console.error(
        'Backhaul search error:',
        error,
      );

      setSearchError(
        error.message ||
          t('Unable to find available transport.'),
      );

      setTransports([]);
    } finally {
      setSearching(false);
    }
  };

  /* =========================================
     SELECT TRADER TRANSPORT
  ========================================= */

  const handleSelectTransport =
    async (
      transport,
    ) => {
      if (!token) {
        setSelectionMessage(
          t('Your session has expired. Please log in again.'),
        );
        return;
      }

      if (
        quantityInKg <= 0
      ) {
        setSelectionMessage(
          t('Please enter a valid quantity before selecting transport.'),
        );
        return;
      }

      try {
        setSelectingId(
          transport._id,
        );

        setSelectionMessage('');
        setMessage('');

        const response =
          await fetch(
            `${API_URL}/backhaul/${transport._id}/select`,
            {
              method: 'POST',
              headers: {
                Authorization:
                  `Bearer ${token}`,
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                quantity:
                  quantityInKg,
                quantityUnit:
                  'kg',
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t('Failed to select transport.'),
          );
        }

        setSelectedTransport(
          data.data ||
            transport,
        );

        setAllocation(
          data.allocation ||
            null,
        );

        setSelectionMessage(
          data.message ||
            t('Trader transport selected successfully.'),
        );

        setTransports(
          (current) =>
            current.filter(
              (item) =>
                item._id !==
                transport._id,
            ),
        );
      } catch (error) {
        console.error(
          'Backhaul selection error:',
          error,
        );

        setSelectionMessage(
          error.message ||
            t('Unable to select this transport.'),
        );
      } finally {
        setSelectingId(
          null,
        );
      }
    };

  /* =========================================
     PUBLISH OWN TRANSPORT
  ========================================= */

  const handlePublishOwnTransport =
    async (
      event,
    ) => {
      event.preventDefault();

      setOwnTransportMessage('');

      if (!token) {
        setOwnTransportMessage(
          t('Your session has expired. Please log in again.'),
        );
        return;
      }

      if (!sourceMarket) {
        setOwnTransportMessage(
          t('Please select a source market.'),
        );
        return;
      }

      if (!destinationMarket) {
        setOwnTransportMessage(
          t('Please select a destination market.'),
        );
        return;
      }

      if (
        sourceMarket ===
        destinationMarket
      ) {
        setOwnTransportMessage(
          t('Source and destination markets must be different.'),
        );
        return;
      }

      if (
        !quantity ||
        Number(quantity) <= 0
      ) {
        setOwnTransportMessage(
          t('Please enter the crop quantity.'),
        );
        return;
      }

      if (
        !ownVehicleNumber.trim()
      ) {
        setOwnTransportMessage(
          t('Please enter the vehicle number.'),
        );
        return;
      }

      if (
        !ownVehicleType.trim()
      ) {
        setOwnTransportMessage(
          t('Please enter the vehicle type.'),
        );
        return;
      }

      if (
        !ownDriverName.trim()
      ) {
        setOwnTransportMessage(
          t('Please enter the driver name.'),
        );
        return;
      }

      if (
        !ownDriverPhone.trim()
      ) {
        setOwnTransportMessage(
          t('Please enter the driver phone number.'),
        );
        return;
      }

      if (
        !ownCapacity ||
        Number(ownCapacity) <= 0
      ) {
        setOwnTransportMessage(
          t('Please enter a valid vehicle capacity.'),
        );
        return;
      }

      const capacityKg =
        convertCapacityToKg(
          ownCapacity,
          ownCapacityUnit,
        );

      if (
        capacityKg <
        quantityInKg
      ) {
        setOwnTransportMessage(
          t('Vehicle capacity must be at least equal to the crop quantity.'),
        );
        return;
      }

      if (
        !ownDepartureDate
      ) {
        setOwnTransportMessage(
          t('Please select the departure date.'),
        );
        return;
      }

      if (
        !ownDepartureTime
      ) {
        setOwnTransportMessage(
          t('Please select the departure time.'),
        );
        return;
      }

      if (
        !ownEstimatedCost ||
        Number(ownEstimatedCost) <
          0
      ) {
        setOwnTransportMessage(
          t('Please enter a valid estimated transport cost.'),
        );
        return;
      }

      try {
        setPublishingOwn(
          true,
        );

        const body = {
          sourceMarket,
          destinationMarket,
          transportType: 'own',

          vehicleNumber:
            ownVehicleNumber.trim(),

          vehicleType:
            ownVehicleType.trim(),

          driverName:
            ownDriverName.trim(),

          driverPhone:
            ownDriverPhone.trim(),

          capacity:
            Number(
              ownCapacity,
            ),

          capacityUnit:
            ownCapacityUnit,

          availableCapacity:
            Number(
              ownCapacity,
            ),

          departureDate:
            ownDepartureDate,

          departureTime:
            ownDepartureTime,

          estimatedDistanceKm:
            ownDistance
              ? Number(
                  ownDistance,
                )
              : null,

          estimatedCost:
            Number(
              ownEstimatedCost,
            ),

          costUnit: 'total',

          notes:
            ownNotes.trim(),
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
              t('Failed to publish own transport.'),
          );
        }

        setOwnTransportResult(
          data.data ||
            null,
        );

        setOwnTransportMessage(
          data.message ||
            t('Own transport published successfully.'),
        );
      } catch (error) {
        console.error(
          'Own transport error:',
          error,
        );

        setOwnTransportMessage(
          error.message ||
            t('Unable to publish own transport.'),
        );
      } finally {
        setPublishingOwn(
          false,
        );
      }
    };

  /* =========================================
     RESET
  ========================================= */

  const resetSearch = () => {
    setSourceMarket('');
    setDestinationMarket('');

    setQuantity('');
    setQuantityUnit('kg');

    setTransportType(
      'trader',
    );

    setTransports([]);
    setSearched(false);

    setSearchError('');
    setMessage('');

    setSelectedTransport(
      null,
    );

    setAllocation(null);
    setSelectionMessage('');

    setOwnVehicleNumber('');
    setOwnVehicleType('');
    setOwnDriverName('');
    setOwnDriverPhone('');
    setOwnCapacity('');
    setOwnCapacityUnit('ton');
    setOwnDepartureDate('');
    setOwnDepartureTime('');
    setOwnDistance('');
    setOwnEstimatedCost('');
    setOwnNotes('');

    setOwnTransportResult(
      null,
    );

    setOwnTransportMessage('');
  };

  /* =========================================
     SELECTED MARKETS
  ========================================= */

  const selectedSource =
    markets.find(
      (market) =>
        market._id ===
        sourceMarket,
    );

  const selectedDestination =
    markets.find(
      (market) =>
        market._id ===
        destinationMarket,
    );

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
                {t('Backhaul Transport')}
              </h1>

              <p>
                {t('Find affordable return transport for your crops.')}
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
          SEARCH CARD
      ===================================== */}

      <section className="backhaul-search-card">

        <div className="section-heading">

          <div className="section-heading-icon">
            <Navigation size={18} />
          </div>

          <div>
            <h2>
              {t('Find Transport')}
            </h2>

            <p>
              {t('Tell us where your crop is going and how much you need to transport.')}
            </p>
          </div>

        </div>

        <form
          className="backhaul-search-form"
          onSubmit={
            handleSearch
          }
        >

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

            <div className="backhaul-field">

              <label>
                <Package size={15} />
                {t('Your Quantity')}
              </label>

              <div className="quantity-input-group">

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={t('Enter quantity')}
                  value={
                    quantity
                  }
                  onChange={(event) =>
                    setQuantity(
                      event.target.value,
                    )
                  }
                />

                <select
                  value={
                    quantityUnit
                  }
                  onChange={(event) =>
                    setQuantityUnit(
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

              {quantityInKg > 0 && (
                <small
                  style={{
                    display:
                      'block',
                    marginTop:
                      '6px',
                    color:
                      '#718078',
                    fontSize:
                      '11px',
                  }}
                >
                  {quantityInKg.toLocaleString(
                    'en-IN',
                  )}{' '}
                  {t('kg required')}
                </small>
              )}

            </div>

          </div>

          {/* =================================
              TRANSPORT CHOICE
          ================================= */}

          <div className="transport-choice-section">

            <div className="transport-choice-title">
              {t('Choose Transport')}
            </div>

            <div className="transport-choice-grid">

              <button
                type="button"
                className={`transport-choice-card ${
                  transportType ===
                  'own'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  handleTransportTypeChange(
                    'own',
                  )
                }
              >

                <div className="transport-choice-icon">
                  <Truck size={24} />
                </div>

                <div>
                  <strong>
                    {t('Own Transport')}
                  </strong>

                  <span>
                    {t('Use your own vehicle')}
                  </span>
                </div>

                {transportType ===
                  'own' && (
                  <CheckCircle2
                    size={20}
                    className="transport-selected-icon"
                  />
                )}

              </button>

              <button
                type="button"
                className={`transport-choice-card ${
                  transportType ===
                  'trader'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  handleTransportTypeChange(
                    'trader',
                  )
                }
              >

                <div className="transport-choice-icon">
                  <Truck size={24} />
                </div>

                <div>
                  <strong>
                    {t('Trader Transport')}
                  </strong>

                  <span>
                    {t('Find available return trucks')}
                  </span>
                </div>

                {transportType ===
                  'trader' && (
                  <CheckCircle2
                    size={20}
                    className="transport-selected-icon"
                  />
                )}

              </button>

            </div>

          </div>

          {/* =================================
              FIND BUTTON
          ================================= */}

          <div className="backhaul-search-actions">

            <button
              type="submit"
              className="backhaul-search-button"
              disabled={
                searching ||
                marketsLoading
              }
            >

              {searching ? (
                <>
                  <Loader2
                    size={18}
                    className="spin"
                  />
                  {t('Searching...')}
                </>
              ) : (
                <>
                  <Truck size={18} />
                  {transportType ===
                  'own'
                    ? t('Continue with Own Transport')
                    : t('Find Transport')}
                </>
              )}

            </button>

          </div>

        </form>

        {/* MARKET ERROR */}

        {marketsError && (
          <div className="backhaul-message">

            <AlertCircle
              size={17}
            />

            <span>
              {marketsError}
            </span>

            <button
              type="button"
              onClick={
                fetchMarkets
              }
              style={{
                marginLeft:
                  'auto',
                border: 0,
                background:
                  'transparent',
                color:
                  '#198754',
                cursor:
                  'pointer',
                display:
                  'flex',
                alignItems:
                  'center',
                gap:
                  '5px',
                fontWeight:
                  650,
              }}
            >
              <RefreshCw
                size={15}
              />
              {t('Retry')}
            </button>

          </div>
        )}

        {searchError && (
          <div className="backhaul-message">

            <AlertCircle
              size={17}
            />

            <span>
              {searchError}
            </span>

          </div>
        )}

        {message && (
          <div className="backhaul-message">

            <AlertCircle
              size={17}
            />

            <span>
              {message}
            </span>

          </div>
        )}

      </section>

      {/* =====================================
          OWN TRANSPORT FORM
      ===================================== */}

      {transportType ===
        'own' && (
        <section className="backhaul-results-section">

          <div className="section-heading">

            <div className="section-heading-icon">
              <Truck size={18} />
            </div>

            <div>
              <h2>
                {t('Own Transport Details')}
              </h2>

              <p>
                {t('Enter your vehicle and journey details.')}
              </p>
            </div>

          </div>

          <form
            onSubmit={
              handlePublishOwnTransport
            }
          >

            <div
              style={{
                display:
                  'grid',
                gridTemplateColumns:
                  'repeat(2, minmax(0, 1fr))',
                gap:
                  '16px',
              }}
            >

              {/* VEHICLE NUMBER */}

              <div className="backhaul-field">

                <label>
                  <Truck size={15} />
                  {t('Vehicle Number')}
                </label>

                <input
                  type="text"
                  placeholder={t('e.g. MH12AB1234')}
                  value={
                    ownVehicleNumber
                  }
                  onChange={(event) =>
                    setOwnVehicleNumber(
                      event.target.value,
                    )
                  }
                />

              </div>

              {/* VEHICLE TYPE */}

              <div className="backhaul-field">

                <label>
                  <Truck size={15} />
                  {t('Vehicle Type')}
                </label>

                <input
                  type="text"
                  placeholder={t('e.g. Tractor / Pickup / Truck')}
                  value={
                    ownVehicleType
                  }
                  onChange={(event) =>
                    setOwnVehicleType(
                      event.target.value,
                    )
                  }
                />

              </div>

              {/* DRIVER */}

              <div className="backhaul-field">

                <label>
                  <UserRound size={15} />
                  {t('Driver Name')}
                </label>

                <input
                  type="text"
                  placeholder={t('Enter driver name')}
                  value={
                    ownDriverName
                  }
                  onChange={(event) =>
                    setOwnDriverName(
                      event.target.value,
                    )
                  }
                />

              </div>

              {/* PHONE */}

              <div className="backhaul-field">

                <label>
                  <Phone size={15} />
                  {t('Driver Phone')}
                </label>

                <input
                  type="tel"
                  placeholder={t('Enter phone number')}
                  value={
                    ownDriverPhone
                  }
                  onChange={(event) =>
                    setOwnDriverPhone(
                      event.target.value,
                    )
                  }
                />

              </div>

              {/* CAPACITY */}

              <div className="backhaul-field">

                <label>
                  <Package size={15} />
                  {t('Vehicle Capacity')}
                </label>

                <div className="quantity-input-group">

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={t('Capacity')}
                    value={
                      ownCapacity
                    }
                    onChange={(event) =>
                      setOwnCapacity(
                        event.target.value,
                      )
                    }
                  />

                  <select
                    value={
                      ownCapacityUnit
                    }
                    onChange={(event) =>
                      setOwnCapacityUnit(
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

              {/* DISTANCE */}

              <div className="backhaul-field">

                <label>
                  <Route size={15} />
                  {t('Estimated Distance')}
                </label>

                <div className="quantity-input-group">

                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder={t('Distance')}
                    value={
                      ownDistance
                    }
                    onChange={(event) =>
                      setOwnDistance(
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
                      border:
                        '1px solid #dce4df',
                      borderLeft:
                        '0',
                      borderRadius:
                        '0 10px 10px 0',
                      color:
                        '#5f6c64',
                      fontSize:
                        '13px',
                      background:
                        '#fafcfb',
                    }}
                  >
                    {t('km')}
                  </div>

                </div>

              </div>

              {/* DATE */}

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
                    ownDepartureDate
                  }
                  onChange={(event) =>
                    setOwnDepartureDate(
                      event.target.value,
                    )
                  }
                />

              </div>

              {/* TIME */}

              <div className="backhaul-field">

                <label>
                  <Clock size={15} />
                  {t('Departure Time')}
                </label>

                <input
                  type="time"
                  value={
                    ownDepartureTime
                  }
                  onChange={(event) =>
                    setOwnDepartureTime(
                      event.target.value,
                    )
                  }
                />

              </div>

              {/* COST */}

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
                    ownEstimatedCost
                  }
                  onChange={(event) =>
                    setOwnEstimatedCost(
                      event.target.value,
                    )
                  }
                />

              </div>

            </div>

            {/* NOTES */}

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
                placeholder={t('Add any additional transport details...')}
                value={
                  ownNotes
                }
                onChange={(event) =>
                  setOwnNotes(
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

            {/* COST PREVIEW */}

            {quantityInKg > 0 &&
              ownCapacity &&
              ownEstimatedCost && (
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
                      {t('Estimated Transport Cost')}
                    </strong>

                  </div>

                  <div
                    style={{
                      display:
                        'flex',
                      flexWrap:
                        'wrap',
                      gap:
                        '18px',
                      marginTop:
                        '10px',
                    }}
                  >

                    <div>
                      <span
                        style={{
                          display:
                            'block',
                          color:
                            '#718078',
                          fontSize:
                            '10px',
                        }}
                      >
                        {t('Vehicle Capacity')}
                      </span>

                      <strong
                        style={{
                          color:
                            '#35423a',
                          fontSize:
                            '14px',
                        }}
                      >
                        {formatCapacity(
                          ownCapacity,
                          ownCapacityUnit,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span
                        style={{
                          display:
                            'block',
                          color:
                            '#718078',
                          fontSize:
                            '10px',
                        }}
                      >
                        {t('Crop Quantity')}
                      </span>

                      <strong
                        style={{
                          color:
                            '#35423a',
                          fontSize:
                            '14px',
                        }}
                      >
                        {quantityInKg.toLocaleString(
                          'en-IN',
                        )}{' '}
                        {t('kg')}
                      </strong>
                    </div>

                    <div>
                      <span
                        style={{
                          display:
                            'block',
                          color:
                            '#718078',
                          fontSize:
                            '10px',
                        }}
                      >
                        {t('Estimated Cost')}
                      </span>

                      <strong
                        style={{
                          color:
                            '#198754',
                          fontSize:
                            '17px',
                        }}
                      >
                        {formatCurrency(
                          ownEstimatedCost,
                        )}
                      </strong>
                    </div>

                  </div>

                </div>
              )}

            {/* OWN TRANSPORT MESSAGE */}

            {ownTransportMessage && (
              <div
                className="backhaul-message"
                style={{
                  marginTop:
                    '16px',
                }}
              >

                {ownTransportResult ? (
                  <CheckCircle2
                    size={17}
                  />
                ) : (
                  <AlertCircle
                    size={17}
                  />
                )}

                <span>
                  {
                    ownTransportMessage
                  }
                </span>

              </div>
            )}

            {/* SUBMIT */}

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
                  publishingOwn
                }
              >

                {publishingOwn ? (
                  <>
                    <Loader2
                      size={18}
                      className="spin"
                    />
                    {t('Publishing...')}
                  </>
                ) : (
                  <>
                    <Truck
                      size={18}
                    />
                    {t('Publish Own Transport')}
                  </>
                )}

              </button>

            </div>

          </form>

        </section>
      )}

      {/* =====================================
          OWN TRANSPORT SUCCESS
      ===================================== */}

      {ownTransportResult && (
        <section
          className="selected-transport-card"
          style={{
            marginTop:
              '24px',
          }}
        >

          <div className="selected-transport-icon">
            <CheckCircle2
              size={22}
            />
          </div>

          <div
            style={{
              flex: 1,
            }}
          >

            <strong>
              {t('Own Transport Published')}
            </strong>

            <p>
              {ownTransportResult.vehicleNumber ||
                ownVehicleNumber}
              {' · '}
              {selectedSource?.name ||
                t('Source')}
              {' → '}
              {selectedDestination?.name ||
                t('Destination')}
            </p>

            <div
              style={{
                display:
                  'flex',
                flexWrap:
                  'wrap',
                gap:
                  '8px',
                marginTop:
                  '9px',
              }}
            >

              <span
                style={{
                  padding:
                    '6px 9px',
                  borderRadius:
                    '7px',
                  background:
                    '#ffffff',
                  color:
                    '#37604a',
                  fontSize:
                    '11px',
                  fontWeight:
                    650,
                }}
              >
                {t('Capacity:')}{' '}
                {formatCapacity(
                  ownTransportResult.capacity,
                  ownTransportResult.capacityUnit,
                )}
              </span>

              <span
                style={{
                  padding:
                    '6px 9px',
                  borderRadius:
                    '7px',
                  background:
                    '#ffffff',
                  color:
                    '#37604a',
                  fontSize:
                    '11px',
                  fontWeight:
                    650,
                }}
              >
                {t('Status:')}{' '}
                {ownTransportResult.status ||
                  'selected'}
              </span>

              <span
                style={{
                  padding:
                    '6px 9px',
                  borderRadius:
                    '7px',
                  background:
                    '#ffffff',
                  color:
                    '#16784a',
                  fontSize:
                    '11px',
                  fontWeight:
                    700,
                }}
              >
                {t('Estimated Cost:')}{' '}
                {formatCurrency(
                  ownTransportResult.estimatedCost,
                )}
              </span>

            </div>

          </div>

        </section>
      )}

      {/* =====================================
          SELECTED TRADER TRANSPORT
      ===================================== */}

      {selectedTransport && (
        <section
          className="selected-transport-card"
          style={{
            marginTop:
              '24px',
          }}
        >

          <div className="selected-transport-icon">
            <CheckCircle2
              size={22}
            />
          </div>

          <div
            style={{
              flex: 1,
            }}
          >

            <strong>
              {t('Trader Transport Selected')}
            </strong>

            <p>
              {selectedTransport.vehicleNumber ||
                t('Selected vehicle')}
              {' · '}
              {selectedSource?.name ||
                selectedTransport.sourceMarket?.name ||
                t('Source')}
              {' → '}
              {selectedDestination?.name ||
                selectedTransport.destinationMarket?.name ||
                t('Destination')}
            </p>

            {allocation && (
              <div
                style={{
                  display:
                    'flex',
                  flexWrap:
                    'wrap',
                  gap:
                    '8px',
                  marginTop:
                    '10px',
                }}
              >

                <span
                  style={{
                    padding:
                      '6px 9px',
                    borderRadius:
                      '7px',
                    background:
                      '#ffffff',
                    color:
                      '#37604a',
                    fontSize:
                      '11px',
                    fontWeight:
                      650,
                  }}
                >
                  {t('Allocated:')}{' '}
                  {
                    allocation.requestedQuantity
                  }{' '}
                  {
                    allocation.requestedQuantityUnit
                  }
                </span>

                <span
                  style={{
                    padding:
                      '6px 9px',
                    borderRadius:
                      '7px',
                    background:
                      '#ffffff',
                    color:
                      '#37604a',
                    fontSize:
                      '11px',
                    fontWeight:
                      650,
                  }}
                >
                  {t('Remaining:')}{' '}
                  {
                    allocation.remainingCapacity
                  }{' '}
                  {
                    allocation.remainingCapacityUnit
                  }
                </span>

                <span
                  style={{
                    padding:
                      '6px 9px',
                    borderRadius:
                      '7px',
                    background:
                      '#ffffff',
                    color:
                      '#16784a',
                    fontSize:
                      '11px',
                    fontWeight:
                      700,
                  }}
                >
                  {t('Estimated Share:')}{' '}
                  {formatCurrency(
                    allocation.farmerTransportCost,
                  )}
                </span>

              </div>
            )}

          </div>

        </section>
      )}

      {/* =====================================
          TRADER SELECTION MESSAGE
      ===================================== */}

      {selectionMessage && (
        <div
          className="backhaul-message"
          style={{
            marginTop:
              '24px',
          }}
        >

          <CheckCircle2
            size={17}
          />

          <span>
            {selectionMessage}
          </span>

        </div>
      )}

      {/* =====================================
          TRADER TRANSPORT RESULTS
      ===================================== */}

      {transportType ===
        'trader' && (
        <section className="backhaul-results-section">

          <div className="section-heading">

            <div className="section-heading-icon">
              <Truck size={18} />
            </div>

            <div>
              <h2>
                {t('Available Transport')}
              </h2>

              <p>
                {searched
                  ? t('Return trucks available from {0} to {1}.', selectedSource?.name || t('your source'), selectedDestination?.name || t('your destination'))
                  : t('Return trucks matching your route will appear here.')}
              </p>
            </div>

          </div>

          {searching && (
            <div className="backhaul-empty-state">

              <div className="backhaul-empty-icon">
                <Loader2
                  size={30}
                  className="spin"
                />
              </div>

              <h3>
                {t('Finding available trucks...')}
              </h3>

              <p>
                {t('Checking trader return transport for your route.')}
              </p>

            </div>
          )}

          {!searching &&
            !searched && (
              <div className="backhaul-empty-state">

                <div className="backhaul-empty-icon">
                  <Truck size={30} />
                </div>

                <h3>
                  {t('No transport searched yet')}
                </h3>

                <p>
                  {t('Select your markets, enter your quantity and choose Trader Transport to find available trucks.')}
                </p>

              </div>
            )}

          {!searching &&
            searched &&
            transports.length ===
              0 && (
              <div className="backhaul-empty-state">

                <div className="backhaul-empty-icon">
                  <Route size={30} />
                </div>

                <h3>
                  {t('No suitable trucks found')}
                </h3>

                <p>
                  {t('There are currently no available trader trucks with enough remaining capacity for {0} kg on this route.', quantityInKg.toLocaleString('en-IN'))}
                </p>

                <button
                  type="button"
                  className="backhaul-search-button"
                  onClick={
                    handleSearch
                  }
                  style={{
                    marginTop:
                      '16px',
                  }}
                >
                  <RefreshCw
                    size={17}
                  />
                  {t('Search Again')}
                </button>

              </div>
            )}

          {!searching &&
            transports.length >
              0 && (
              <div
                style={{
                  display:
                    'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(290px, 1fr))',
                  gap:
                    '15px',
                }}
              >

                {transports.map(
                  (transport) => {
                    const estimatedShare =
                      calculateEstimatedShare(
                        transport,
                      );

                    const isSelecting =
                      selectingId ===
                      transport._id;

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

                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'flex-start',
                            justifyContent:
                              'space-between',
                            gap:
                              '10px',
                            marginBottom:
                              '15px',
                          }}
                        >

                          <div>

                            <span
                              style={{
                                display:
                                  'inline-flex',
                                alignItems:
                                  'center',
                                padding:
                                  '5px 8px',
                                borderRadius:
                                  '999px',
                                background:
                                  '#eef8f2',
                                color:
                                  '#197548',
                                fontSize:
                                  '10px',
                                fontWeight:
                                  700,
                                textTransform:
                                  'uppercase',
                                letterSpacing:
                                  '0.04em',
                              }}
                            >
                              {t('Available')}
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
                                t('Vehicle unavailable')}
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
                                  '#77827b',
                                fontSize:
                                  '10px',
                              }}
                            >
                              {t('Estimated share')}
                            </span>

                            <strong
                              style={{
                                display:
                                  'block',
                                marginTop:
                                  '2px',
                                color:
                                  '#198754',
                                fontSize:
                                  '18px',
                              }}
                            >
                              {formatCurrency(
                                estimatedShare,
                              )}
                            </strong>

                          </div>

                        </div>

                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap:
                              '8px',
                            marginBottom:
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
                              color:
                                '#344139',
                              fontSize:
                                '12px',
                              fontWeight:
                                600,
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
                              color:
                                '#344139',
                              fontSize:
                                '12px',
                              fontWeight:
                                600,
                            }}
                          >
                            {transport.destinationMarket?.name ||
                              t('Destination')}
                          </span>

                        </div>

                        <div
                          style={{
                            display:
                              'grid',
                            gridTemplateColumns:
                              'repeat(2, minmax(0, 1fr))',
                            gap:
                              '10px',
                            marginBottom:
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
                              {t('Available Capacity')}
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
                              {t('Truck Capacity')}
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
                                  'flex',
                                alignItems:
                                  'center',
                                gap:
                                  '4px',
                                color:
                                  '#87918b',
                                fontSize:
                                  '10px',
                                marginBottom:
                                  '3px',
                              }}
                            >
                              <CalendarDays
                                size={12}
                              />
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
                            </strong>

                          </div>

                          <div>

                            <span
                              style={{
                                display:
                                  'flex',
                                alignItems:
                                  'center',
                                gap:
                                  '4px',
                                color:
                                  '#87918b',
                                fontSize:
                                  '10px',
                                marginBottom:
                                  '3px',
                              }}
                            >
                              <Clock
                                size={12}
                              />
                              {t('Time')}
                            </span>

                            <strong
                              style={{
                                color:
                                  '#35423a',
                                fontSize:
                                  '13px',
                              }}
                            >
                              {transport.departureTime ||
                                '—'}
                            </strong>

                          </div>

                        </div>

                        <div
                          style={{
                            display:
                              'flex',
                            alignItems:
                              'center',
                            gap:
                              '9px',
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
                              minWidth:
                                0,
                              flex: 1,
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
                                t('Driver unavailable')}
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

                        <div
                          style={{
                            marginTop:
                              '14px',
                            padding:
                              '12px',
                            borderRadius:
                              '10px',
                            background:
                              '#f0faf4',
                          }}
                        >

                          <div
                            style={{
                              display:
                                'flex',
                              alignItems:
                                'center',
                              gap:
                                '7px',
                            }}
                          >

                            <CircleDollarSign
                              size={16}
                              color="#198754"
                            />

                            <span
                              style={{
                                color:
                                  '#527060',
                                fontSize:
                                  '11px',
                              }}
                            >
                              {t('Full truck estimated cost')}
                            </span>

                            <strong
                              style={{
                                marginLeft:
                                  'auto',
                                color:
                                  '#237651',
                                fontSize:
                                  '13px',
                              }}
                            >
                              {formatCurrency(
                                transport.estimatedCost,
                              )}
                            </strong>

                          </div>

                          <p
                            style={{
                              margin:
                                '5px 0 0',
                              color:
                                '#748078',
                              fontSize:
                                '10px',
                              lineHeight:
                                1.45,
                            }}
                          >
                            {t("Your estimated share is based on your requested quantity and the truck's total capacity.")}
                          </p>

                        </div>

                        {transport.notes && (
                          <p
                            style={{
                              margin:
                                '12px 0 0',
                              color:
                                '#6d7971',
                              fontSize:
                                '11px',
                              lineHeight:
                                1.5,
                            }}
                          >
                            {transport.notes}
                          </p>
                        )}

                        <button
                          type="button"
                          className="backhaul-search-button"
                          style={{
                            width:
                              '100%',
                            marginTop:
                              '15px',
                          }}
                          disabled={
                            isSelecting
                          }
                          onClick={() =>
                            handleSelectTransport(
                              transport,
                            )
                          }
                        >

                          {isSelecting ? (
                            <>
                              <Loader2
                                size={17}
                                className="spin"
                              />
                              {t('Selecting...')}
                            </>
                          ) : (
                            <>
                              <CheckCircle2
                                size={17}
                              />
                              {t('Select Transport')}
                            </>
                          )}

                        </button>

                      </article>
                    );
                  },
                )}

              </div>
            )}

        </section>
      )}

      {/* =====================================
          INFO CARDS
      ===================================== */}

      <section className="backhaul-info-grid">

        <div className="backhaul-info-card">

          <div className="backhaul-info-icon">
            <IndianRupee size={20} />
          </div>

          <div>
            <strong>
              {t('Estimated Cost')}
            </strong>

            <p>
              {t('Transport costs shown are estimates based on the published truck cost and requested quantity.')}
            </p>
          </div>

        </div>

        <div className="backhaul-info-card">

          <div className="backhaul-info-icon">
            <CalendarDays size={20} />
          </div>

          <div>
            <strong>
              {t('Return Trips')}
            </strong>

            <p>
              {t('Find trucks returning between markets with available capacity.')}
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
              {t('Vehicle and driver information is displayed before selecting transport.')}
            </p>
          </div>

        </div>

      </section>

      {/* =====================================
          USER
      ===================================== */}

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
            t('User')}{' '}
          ·{' '}
          {user.role ||
            'farmer'}
        </div>
      )}

    </div>
  );
}

export default Backhaul;