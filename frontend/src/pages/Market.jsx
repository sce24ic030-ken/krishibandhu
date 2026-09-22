import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useSearchParams } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import AddMarketForm from '../components/AddMarketForm';
import GlutWatch from '../components/GlutWatch';

import API_URL from '../config/api';

import { useLanguage } from '../context/LanguageContext';

import './Market.css';

function Market() {
  const { t, lang } = useLanguage();

  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState(
    searchParams.get('tab') === 'glut'
      ? 'glut'
      : 'markets',
  );

  const [markets, setMarkets] = useState([]);
  const [loadingMarkets, setLoadingMarkets] = useState(true);
  const [marketError, setMarketError] = useState('');

  const [marketPrices, setMarketPrices] = useState([]);
  const [loadingPrices, setLoadingPrices] = useState(true);
  const [priceError, setPriceError] = useState('');

  const [marketSearch, setMarketSearch] = useState('');
  const [priceSearch, setPriceSearch] = useState('');

  const [selectedDistrict, setSelectedDistrict] = useState('All');
  const [selectedCommodity, setSelectedCommodity] = useState('All');
  const [selectedMarket, setSelectedMarket] = useState('All');

  const [showAddMarketForm, setShowAddMarketForm] = useState(false);

  /* =========================================
     Fetch Markets
  ========================================= */

  const fetchMarkets = async () => {
    try {
      setLoadingMarkets(true);
      setMarketError('');

      const response = await fetch(
        `${API_URL}/markets`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch markets.');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to fetch markets.',
        );
      }

      setMarkets(result.data);
    } catch (error) {
      console.error('Fetch markets error:', error);

      setMarketError(
        t(error.message) || t('Unable to load markets.'),
      );
    } finally {
      setLoadingMarkets(false);
    }
  };

  /* =========================================
     Fetch Market Prices
  ========================================= */

  const fetchMarketPrices = async () => {
    try {
      setLoadingPrices(true);
      setPriceError('');

      const response = await fetch(
        `${API_URL}/market-prices`,
      );

      if (!response.ok) {
        throw new Error(
          'Failed to fetch market prices.',
        );
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(
          result.message || 'Failed to fetch market prices.',
        );
      }

      setMarketPrices(result.data);
    } catch (error) {
      console.error(
        'Fetch market prices error:',
        error,
      );

      setPriceError(
        t(error.message) ||
          t('Unable to load market prices.'),
      );
    } finally {
      setLoadingPrices(false);
    }
  };

  /* =========================================
     Initial Load
  ========================================= */

  useEffect(() => {
    fetchMarkets();
    fetchMarketPrices();
  }, []);

  /* =========================================
     Districts
  ========================================= */

  const districts = useMemo(() => {
    const uniqueDistricts = [
      ...new Set(
        markets
          .map((market) => market.district)
          .filter(Boolean),
      ),
    ];

    return uniqueDistricts.sort();
  }, [markets]);

  /* =========================================
     Commodities
  ========================================= */

  const commodities = useMemo(() => {
    const uniqueCommodities = [
      ...new Set(
        marketPrices
          .map((price) => price.commodity)
          .filter(Boolean),
      ),
    ];

    return uniqueCommodities.sort();
  }, [marketPrices]);

  /* =========================================
     Market Names
  ========================================= */

  const marketNames = useMemo(() => {
    const uniqueMarkets = [
      ...new Set(
        marketPrices
          .map((price) => price.market?.name)
          .filter(Boolean),
      ),
    ];

    return uniqueMarkets.sort();
  }, [marketPrices]);

  /* =========================================
     Filter Markets
  ========================================= */

  const filteredMarkets = useMemo(() => {
    return markets.filter((market) => {
      const searchText =
        marketSearch.trim().toLowerCase();

      const marketName =
        market.name?.toLowerCase() || '';

      const marketDistrict =
        market.district?.toLowerCase() || '';

      const marketLocation =
        market.location?.toLowerCase() || '';

      const matchesSearch =
        !searchText ||
        marketName.includes(searchText) ||
        marketDistrict.includes(searchText) ||
        marketLocation.includes(searchText);

      const matchesDistrict =
        selectedDistrict === 'All' ||
        market.district === selectedDistrict;

      return (
        matchesSearch &&
        matchesDistrict
      );
    });
  }, [
    markets,
    marketSearch,
    selectedDistrict,
  ]);

  /* =========================================
     Filter Prices
  ========================================= */

  const filteredPrices = useMemo(() => {
    return marketPrices.filter((price) => {
      const searchText =
        priceSearch.trim().toLowerCase();

      const marketName =
        price.market?.name?.toLowerCase() || '';

      const marketDistrict =
        price.market?.district?.toLowerCase() || '';

      const commodity =
        price.commodity?.toLowerCase() || '';

      const variety =
        price.variety?.toLowerCase() || '';

      const matchesSearch =
        !searchText ||
        commodity.includes(searchText) ||
        marketName.includes(searchText) ||
        marketDistrict.includes(searchText) ||
        variety.includes(searchText);

      const matchesDistrict =
        selectedDistrict === 'All' ||
        price.market?.district ===
          selectedDistrict;

      const matchesCommodity =
        selectedCommodity === 'All' ||
        price.commodity ===
          selectedCommodity;

      const matchesMarket =
        selectedMarket === 'All' ||
        price.market?.name ===
          selectedMarket;

      return (
        matchesSearch &&
        matchesDistrict &&
        matchesCommodity &&
        matchesMarket
      );
    });
  }, [
    marketPrices,
    priceSearch,
    selectedDistrict,
    selectedCommodity,
    selectedMarket,
  ]);

  /* =========================================
     Add Market
  ========================================= */

  const handleMarketAdded = (newMarket) => {
    setMarkets((previousMarkets) => [
      ...previousMarkets,
      newMarket,
    ]);

    setShowAddMarketForm(false);
  };

  /* =========================================
     Format Price
  ========================================= */

  const formatPrice = (price) => {
    if (
      price === undefined ||
      price === null
    ) {
      return '—';
    }

    return `₹${Number(price).toLocaleString(
      'en-IN',
    )}`;
  };

  /* =========================================
     Format Date
  ========================================= */

  const formatDate = (date) => {
    if (!date) {
      return '—';
    }

    const dateLocale =
      lang === 'mr'
        ? 'mr-IN'
        : lang === 'hi'
          ? 'hi-IN'
          : 'en-IN';

    return new Date(date).toLocaleDateString(dateLocale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    );
  };

  /* =========================================
     Loading State
  ========================================= */

  const isLoading =
    loadingMarkets || loadingPrices;

  return (
    <main className="dashboard">
      <PageHeader
        title={t('Market')}
        description={t('Explore agricultural markets and commodity prices across Maharashtra.')}
      />

      <div className="market-page-card">

        {/* =====================================
            Top Header
        ===================================== */}

        <div className="market-page-header">
          <div>
            <h2>{t('Market Information')}</h2>

            <p>
              {t('Find Maharashtra markets and latest agricultural prices.')}
            </p>
          </div>

          {activeTab === 'markets' && (
            <button
              type="button"
              className="add-market-button"
              onClick={() =>
                setShowAddMarketForm(true)
              }
            >
              + {t('Add Missing Market')}
            </button>
          )}
        </div>

        {/* =====================================
            Tabs
        ===================================== */}

        <div className="market-tabs">
          <button
            type="button"
            className={`market-tab ${
              activeTab === 'markets'
                ? 'active'
                : ''
            }`}
            onClick={() => {
              setActiveTab('markets');
              setShowAddMarketForm(false);
            }}
          >
            <span className="market-tab-icon">
              🏪
            </span>

            <span>
              <strong>{t('Market Places')}</strong>
              <small>
                {t('Explore agricultural markets')}
              </small>
            </span>
          </button>

          <button
            type="button"
            className={`market-tab ${
              activeTab === 'prices'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('prices')
            }
          >
            <span className="market-tab-icon">
              🌾
            </span>

            <span>
              <strong>{t('Items & Prices')}</strong>
              <small>
                {t('View latest commodity prices')}
              </small>
            </span>
          </button>

          <button
            type="button"
            className={`market-tab ${
              activeTab === 'glut'
                ? 'active'
                : ''
            }`}
            onClick={() =>
              setActiveTab('glut')
            }
          >
            <span className="market-tab-icon">
              📊
            </span>

            <span>
              <strong>{t('Arrival / Glut Watch')}</strong>
              <small>
                {t('How much is already in each mandi today')}
              </small>
            </span>
          </button>
        </div>

        {/* =====================================
            Add Market Form
        ===================================== */}

        {activeTab === 'markets' &&
        showAddMarketForm ? (
          <AddMarketForm
            onMarketAdded={handleMarketAdded}
            onCancel={() =>
              setShowAddMarketForm(false)
            }
          />
        ) : (
          <>
            {/* =================================
                MARKET PLACES TAB
            ================================= */}

            {activeTab === 'markets' && (
              <section className="market-tab-content">

                <div className="market-section-heading">
                  <div>
                    <h2>
                      {t('Maharashtra Markets')}
                    </h2>

                    <p>
                      {t('Agricultural market places registered in KrishiBandhu.')}
                    </p>
                  </div>

                  <span className="market-count-badge">
                    {t('{0} markets', filteredMarkets.length)}
                  </span>
                </div>

                {!loadingMarkets &&
                  !marketError && (
                    <div className="market-filters market-place-filters">

                      <div className="market-search">
                        <label htmlFor="marketSearch">
                          {t('Search Markets')}
                        </label>

                        <input
                          id="marketSearch"
                          type="text"
                          placeholder={t('Search market or district...')}
                          value={marketSearch}
                          onChange={(event) =>
                            setMarketSearch(
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="market-district-filter">
                        <label htmlFor="districtFilter">
                          {t('District')}
                        </label>

                        <select
                          id="districtFilter"
                          value={selectedDistrict}
                          onChange={(event) =>
                            setSelectedDistrict(
                              event.target.value,
                            )
                          }
                        >
                          <option value="All">
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
                    </div>
                  )}

                {loadingMarkets && (
                  <div className="market-message">
                    <p>
                      {t('Loading markets...')}
                    </p>
                  </div>
                )}

                {marketError && (
                  <div className="market-message market-error">
                    <p>{marketError}</p>
                  </div>
                )}

                {!loadingMarkets &&
                  !marketError &&
                  filteredMarkets.length === 0 && (
                    <div className="market-message">
                      <p>
                        {t('No markets match your search.')}
                      </p>
                    </div>
                  )}

                {!loadingMarkets &&
                  !marketError &&
                  filteredMarkets.length > 0 && (
                    <div className="market-list">
                      {filteredMarkets.map(
                        (market) => (
                          <div
                            className="market-card"
                            key={market._id}
                          >
                            <div className="market-card-header">
                              <div>
                                <h2>
                                  {market.name}
                                </h2>

                                <p>
                                  {t('{0}, Maharashtra', market.location || market.district)}
                                </p>
                              </div>

                              {market.isOfficial ? (
                                <span className="official-badge">
                                  ✓ {t('Official')}
                                </span>
                              ) : (
                                <span className="pending-badge">
                                  {t('Pending')}
                                </span>
                              )}
                            </div>

                            <div className="market-card-details">
                              <span>
                                📍{' '}
                                {market.district}
                              </span>

                              <span>
                                🏪 {market.type}
                              </span>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
              </section>
            )}

            {/* =================================
                ITEMS & PRICES TAB
            ================================= */}

            {activeTab === 'prices' && (
              <section className="market-tab-content">

                <div className="market-section-heading">
                  <div>
                    <h2>
                      {t('Commodity Prices')}
                    </h2>

                    <p>
                      {t('Latest available prices from official MSAMB data.')}
                    </p>
                  </div>

                  <span className="market-count-badge">
                    {t('{0} records', filteredPrices.length)}
                  </span>
                </div>

                {!loadingPrices &&
                  !priceError && (
                    <div className="market-filters">

                      <div className="market-search">
                        <label htmlFor="priceSearch">
                          {t('Search Items')}
                        </label>

                        <input
                          id="priceSearch"
                          type="text"
                          placeholder={t('Search commodity, variety or market...')}
                          value={priceSearch}
                          onChange={(event) =>
                            setPriceSearch(
                              event.target.value,
                            )
                          }
                        />
                      </div>

                      <div className="market-district-filter">
                        <label htmlFor="priceDistrictFilter">
                          {t('District')}
                        </label>

                        <select
                          id="priceDistrictFilter"
                          value={selectedDistrict}
                          onChange={(event) =>
                            setSelectedDistrict(
                              event.target.value,
                            )
                          }
                        >
                          <option value="All">
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

                      <div className="market-commodity-filter">
                        <label htmlFor="commodityFilter">
                          {t('Commodity')}
                        </label>

                        <select
                          id="commodityFilter"
                          value={selectedCommodity}
                          onChange={(event) =>
                            setSelectedCommodity(
                              event.target.value,
                            )
                          }
                        >
                          <option value="All">
                            {t('All Commodities')}
                          </option>

                          {commodities.map(
                            (commodity) => (
                              <option
                                key={commodity}
                                value={commodity}
                              >
                                {commodity}
                              </option>
                            ),
                          )}
                        </select>
                      </div>

                      <div className="market-market-filter">
                        <label htmlFor="marketFilter">
                          {t('Market')}
                        </label>

                        <select
                          id="marketFilter"
                          value={selectedMarket}
                          onChange={(event) =>
                            setSelectedMarket(
                              event.target.value,
                            )
                          }
                        >
                          <option value="All">
                            {t('All Markets')}
                          </option>

                          {marketNames.map(
                            (marketName) => (
                              <option
                                key={marketName}
                                value={marketName}
                              >
                                {marketName}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>
                  )}

                {loadingPrices && (
                  <div className="market-message">
                    <p>
                      {t('Loading market prices...')}
                    </p>
                  </div>
                )}

                {priceError && (
                  <div className="market-message market-error">
                    <p>{priceError}</p>
                  </div>
                )}

                {!loadingPrices &&
                  !priceError && (
                    <div className="market-results-info">
                      {t('Showing')}{' '}
                      <strong>
                        {filteredPrices.length}
                      </strong>{' '}
                      {t('price records from')}{' '}
                      <strong>
                        {marketPrices.length}
                      </strong>{' '}
                      {t('available records')}
                    </div>
                  )}

                {!loadingPrices &&
                  !priceError &&
                  filteredPrices.length === 0 && (
                    <div className="market-message">
                      <p>
                        {t('No commodity prices match your filters.')}
                      </p>
                    </div>
                  )}

                {!loadingPrices &&
                  !priceError &&
                  filteredPrices.length > 0 && (
                    <div className="market-price-list">
                      {filteredPrices.map(
                        (price) => (
                          <div
                            className="market-price-card"
                            key={price._id}
                          >
                            <div className="market-price-card-header">
                              <div>
                                <h2>
                                  {price.commodity}
                                </h2>

                                <p>
                                  {price.market?.name}
                                </p>
                              </div>

                              {price.market
                                ?.isOfficial && (
                                <span className="official-badge">
                                  ✓ {t('Official')}
                                </span>
                              )}
                            </div>

                            <div className="market-price-location">
                              📍{' '}
                              {t('{0}, Maharashtra', price.market?.district)}
                            </div>

                            {price.variety && (
                              <div className="market-price-variety">
                                {t('Variety:')}{' '}
                                <strong>
                                  {price.variety}
                                </strong>
                              </div>
                            )}

                            <div className="market-price-grid">
                              <div className="market-price-item">
                                <span>
                                  {t('Minimum')}
                                </span>

                                <strong>
                                  {formatPrice(
                                    price.minimumPrice,
                                  )}
                                </strong>
                              </div>

                              <div className="market-price-item market-price-modal">
                                <span>
                                  {t('Modal')}
                                </span>

                                <strong>
                                  {formatPrice(
                                    price.modalPrice,
                                  )}
                                </strong>
                              </div>

                              <div className="market-price-item">
                                <span>
                                  {t('Maximum')}
                                </span>

                                <strong>
                                  {formatPrice(
                                    price.maximumPrice,
                                  )}
                                </strong>
                              </div>
                            </div>

                            <div className="market-price-footer">
                              <span>
                                {t('📦 Arrival: {0} {1}', price.arrivalQuantity ?? '—', price.unit || 'quintal')}
                              </span>

                              <span>
                                📅{' '}
                                {formatDate(
                                  price.priceDate,
                                )}
                              </span>
                            </div>

                            <div className="market-price-source">
                              {t('Source:')}{' '}
                              <strong>
                                {price.source ||
                                  '—'}
                              </strong>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
              </section>
            )}
          {/* =================================
                GLUT WATCH TAB (Arrival Intelligence)
            ================================= */}

            {activeTab === 'glut' && (
              <section className="market-tab-content">
                <GlutWatch />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

export default Market;