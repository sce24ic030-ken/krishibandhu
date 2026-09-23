import { useEffect, useState } from 'react';

import {
  ShoppingBasket,
  Gavel,
  Handshake,
  ReceiptText,
  CreditCard,
  TrendingUp,
  Clock3,
  ArrowUpRight,
  MapPin,
  Package,
  RefreshCw,
  X,
  ScanLine,
  ShieldCheck,
  History,
} from 'lucide-react';

import { Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import QrModal from '../components/QrModal';

import { getMyScans } from '../services/traceService';

import './TraderDashboard.css';

function TraderDashboard() {
  const { user, token } = useAuth();

  const { t } = useLanguage();

  const [listings, setListings] = useState([]);
  const [bids, setBids] = useState([]);

  const [parchis, setParchis] = useState([]);
  const [myScans, setMyScans] = useState([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingBids, setLoadingBids] = useState(true);

  const [listingError, setListingError] = useState('');
  const [bidListError, setBidListError] = useState('');

  // Bid modal
  const [selectedListing, setSelectedListing] = useState(null);
  const [bidQuantity, setBidQuantity] = useState('');
  const [bidPrice, setBidPrice] = useState('');
  const [bidMessage, setBidMessage] = useState('');

  const [submittingBid, setSubmittingBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');

  const traderName = user?.name || t('Trader');

  /*
   * ==========================================
   * Fetch Sale Listings
   * ==========================================
   */

  const fetchListings = async () => {
    if (!token) {
      setLoadingListings(false);
      return;
    }

    try {
      setLoadingListings(true);
      setListingError('');

      const response = await fetch(
        `${API_URL}/sale-listings`,
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
            t('Failed to load sale listings'),
        );
      }

      setListings(data.listings || []);
    } catch (error) {
      console.error(
        'Trader sale listings error:',
        error,
      );

      setListingError(
        error.message ||
          t('Unable to load available crops.'),
      );
    } finally {
      setLoadingListings(false);
    }
  };

  /*
   * ==========================================
   * Fetch Trader Bids
   * ==========================================
   */

  const fetchBids = async () => {
    if (!token) {
      setLoadingBids(false);
      return;
    }

    try {
      setLoadingBids(true);
      setBidListError('');

      const response = await fetch(
        `${API_URL}/bids`,
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
            t('Failed to load your bids'),
        );
      }

      setBids(data.data || []);
    } catch (error) {
      console.error(
        'Trader bids error:',
        error,
      );

      setBidListError(
        error.message ||
          t('Unable to load your bids.'),
      );
    } finally {
      setLoadingBids(false);
    }
  };

  /*
   * ==========================================
   * Initial Data Load
   * ==========================================
   */

  useEffect(() => {
    fetchListings();
    fetchBids();

    // Fulfilment + trace history
    if (token) {
      Promise.all([
        fetch(`${API_URL}/parchi`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((r) => r.json())
          .then((d) => setParchis(d.data || []))
          .catch(() => null),
        getMyScans()
          .then((d) => setMyScans(d.scans || []))
          .catch(() => null),
      ]);
    }
  }, [token]);

  /*
   * ==========================================
   * Bid Modal
   * ==========================================
   */

  const openBidModal = (listing) => {
    setSelectedListing(listing);

    setBidQuantity(
      String(listing.quantity || ''),
    );

    setBidPrice(
      String(listing.askingPrice || ''),
    );

    setBidMessage('');

    setBidError('');
    setBidSuccess('');
  };

  const closeBidModal = () => {
    if (submittingBid) {
      return;
    }

    setSelectedListing(null);
    setBidQuantity('');
    setBidPrice('');
    setBidMessage('');
    setBidError('');
    setBidSuccess('');
  };

  const totalBidAmount =
    Number(bidQuantity || 0) *
    Number(bidPrice || 0);

  /*
   * ==========================================
   * Submit Bid
   * ==========================================
   */

  const handleSubmitBid = async (event) => {
    event.preventDefault();

    if (!selectedListing) {
      return;
    }

    setBidError('');
    setBidSuccess('');

    const quantity = Number(bidQuantity);
    const pricePerUnit = Number(bidPrice);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setBidError(
        t('Please enter a valid quantity.'),
      );
      return;
    }

    if (
      quantity >
      Number(selectedListing.quantity || 0)
    ) {
      setBidError(
        t('You cannot bid for more than {0} {1}.', selectedListing.quantity, selectedListing.unit),
      );
      return;
    }

    if (
      !Number.isFinite(pricePerUnit) ||
      pricePerUnit <= 0
    ) {
      setBidError(
        t('Please enter a valid bid price.'),
      );
      return;
    }

    if (!token) {
      setBidError(
        t('Your login session has expired. Please login again.'),
      );
      return;
    }

    try {
      setSubmittingBid(true);

      const response = await fetch(
        `${API_URL}/bids`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            saleListing: selectedListing._id,
            quantity,
            pricePerUnit,
            message: bidMessage.trim(),
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Failed to place bid.'),
        );
      }

      setBidSuccess(
        t('Your bid has been placed successfully.'),
      );

      // Immediately refresh the real bids list.
      await fetchBids();

      setTimeout(() => {
        closeBidModal();
      }, 1200);
    } catch (error) {
      console.error(
        'Place bid error:',
        error,
      );

      setBidError(
        error.message ||
          t('Unable to place your bid.'),
      );
    } finally {
      setSubmittingBid(false);
    }
  };

  /*
   * ==========================================
   * Active Bid Calculation
   * ==========================================
   */

  const activeBids = bids.filter(
    (bid) =>
      bid.status === 'pending' ||
      bid.status === 'accepted',
  );

  const pendingBids = bids.filter(
    (bid) => bid.status === 'pending',
  );

  /*
   * ==========================================
   * Dashboard Statistics
   * ==========================================
   */

  const stats = [
    {
      title: t('Available Crops'),
      value: String(listings.length),
      subtitle: t('Crops available for bidding'),
      icon: ShoppingBasket,
    },
    {
      title: t('Active Bids'),
      value: String(activeBids.length),
      subtitle: t('Bids currently active'),
      icon: Gavel,
    },
    {
      title: t('Purchases'),
      value: '0',
      subtitle: t('Completed purchases'),
      icon: Handshake,
    },
    {
      title: t('Pending Payments'),
      value: '₹0',
      subtitle: t('Payments awaiting completion'),
      icon: CreditCard,
    },
  ];

  /* ==========================================
     Fulfilment & trace aggregates
  ========================================= */

  const completedParchis = parchis.filter(
    (parchi) =>
      parchi.paymentStatus === 'success' ||
      parchi.status === 'paid',
  );

  const pendingParchis = parchis.filter(
    (parchi) =>
      parchi.paymentStatus !== 'success' &&
      parchi.status !== 'paid' &&
      parchi.status !== 'cancelled',
  );

  return (
    <div className="trader-dashboard">

      {/* ==========================================
          Header
      ========================================== */}

      <div className="trader-dashboard-header">

        <div>
          <p className="trader-dashboard-label">
            {t('Trader Dashboard')}
          </p>

          <h1>
            {t('Welcome, {0} 👋', traderName)}
          </h1>

          <p className="trader-dashboard-description">
            {t('Manage your crop purchases, bids, parchis and payments from one place.')}
          </p>
        </div>

        <div className="trader-status-card">

          <div className="trader-status-icon">
            <TrendingUp size={20} />
          </div>

          <div>
            <span>
              {t('Account Status')}
            </span>

            <strong>
              {user?.isVerified
                ? t('Verified Trader')
                : t('Verification Pending')}
            </strong>
          </div>

        </div>

      </div>


      {/* ==========================================
          Statistics
      ========================================== */}

      <div className="trader-stats-grid">

        {stats.map((stat) => {

          const Icon = stat.icon;

          return (
            <div
              className="trader-stat-card"
              key={stat.title}
            >

              <div className="trader-stat-top">

                <div className="trader-stat-icon">
                  <Icon size={20} />
                </div>

                <ArrowUpRight size={17} />

              </div>

              <div className="trader-stat-value">
                {stat.value}
              </div>

              <div className="trader-stat-title">
                {stat.title}
              </div>

              <div className="trader-stat-subtitle">
                {stat.subtitle}
              </div>

            </div>
          );

        })}

      </div>


      {/* ==========================================
          Trust & Traceability
      ========================================== */}

      <section className="trader-panel">

        <div className="trader-panel-header">

          <div>
            <h2>
              {t('Trust & Traceability')}
            </h2>

            <p>
              {t('Verify lots before bidding and track fulfilment')}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <ShieldCheck size={20} color="#2f6f52" />
          </div>

        </div>

        <div className="trader-trace-grid">

          <div className="trader-trace-card">

            <div className="trader-trace-icon">
              <ShieldCheck size={22} />
            </div>

            <div>
              <span>{t('Buyer Trust Badge')}</span>

              <strong>
                {user?.isVerified
                  ? t('Verified Trader')
                  : t('Verification Pending')}
              </strong>

              <p>
                {parchis.length > 0
                  ? t('{0} of {1} parchis settled on time.', completedParchis.length, parchis.length)
                  : t('No settlement history yet — complete your first purchase.')}
              </p>
            </div>

          </div>

          <div className="trader-trace-card">

            <div className="trader-trace-icon">
              <ScanLine size={22} />
            </div>

            <div>
              <span>{t('Buyer Traceability Scan')}</span>

              <strong>
                {t(myScans.length === 1
                  ? '{0} verified scan'
                  : '{0} verified scans', myScans.length)}
              </strong>

              <p>
                {t('Scan a lot QR to verify origin and quality before you bid.')}
              </p>

              <button
                type="button"
                className="trader-scan-btn"
                onClick={() => setScannerOpen(true)}
              >
                <ScanLine size={15} />
                {t('Open Scanner')}
              </button>
            </div>

          </div>

          <div className="trader-trace-card">

            <div className="trader-trace-icon">
              <History size={22} />
            </div>

            <div>
              <span>{t('Fulfilment History')}</span>

              <strong>
                {t(parchis.length === 1
                  ? '{0} parchi'
                  : '{0} parchis', parchis.length)}
              </strong>

              <p>
                {t('{0} completed · {1} in progress.', completedParchis.length, pendingParchis.length)}
              </p>
            </div>

          </div>

        </div>

      </section>


      {/* ==========================================
          Available Crops
      ========================================== */}

      <section className="trader-panel">

        <div className="trader-panel-header">

          <div>
            <h2>
              {t('Available Crops')}
            </h2>

            <p>
              {t('Crops listed by farmers')}
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >

            <button
              type="button"
              onClick={fetchListings}
              disabled={loadingListings}
              title={t('Refresh listings')}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: loadingListings
                  ? 'default'
                  : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}
            >

              <RefreshCw
                size={18}
                style={{
                  animation: loadingListings
                    ? 'spin 1s linear infinite'
                    : 'none',
                }}
              />

            </button>

            <ShoppingBasket size={20} />

          </div>

        </div>


        {/* Loading */}

        {loadingListings && (

          <div className="trader-empty-state">

            <div className="trader-empty-icon">
              <ShoppingBasket size={26} />
            </div>

            <h3>
              {t('Loading available crops...')}
            </h3>

            <p>
              {t('Fetching the latest farmer listings.')}
            </p>

          </div>

        )}


        {/* Error */}

        {!loadingListings && listingError && (

          <div className="trader-empty-state">

            <div className="trader-empty-icon">
              <ShoppingBasket size={26} />
            </div>

            <h3>
              {t('Unable to load listings')}
            </h3>

            <p>
              {listingError}
            </p>

            <button
              type="button"
              className="trader-primary-button"
              onClick={fetchListings}
            >
              {t('Try Again')}
            </button>

          </div>

        )}


        {/* No listings */}

        {!loadingListings &&
          !listingError &&
          listings.length === 0 && (

            <div className="trader-empty-state">

              <div className="trader-empty-icon">
                <ShoppingBasket size={26} />
              </div>

              <h3>
                {t('No crops available yet')}
              </h3>

              <p>
                {t('Farmer crop listings will appear here when they become available.')}
              </p>

              <Link
                to="/market"
                className="trader-primary-button"
              >
                {t('Find Crops')}
              </Link>

            </div>

          )}


        {/* Listings */}

        {!loadingListings &&
          !listingError &&
          listings.length > 0 && (

            <div className="trader-listings-grid">

              {listings.map((listing) => (

                <div
                  className="trader-listing-card"
                  key={listing._id}
                >

                  <div
                    className="trader-listing-top"
                  >

                    <div>

                      <span
                        className="trader-listing-status"
                      >
                        {t(listing.status)}
                      </span>

                      <h3>
                        {listing.crop?.name ||
                          t('Unknown Crop')}
                      </h3>

                      {listing.crop?.variety && (
                        <p>
                          {listing.crop.variety}
                        </p>
                      )}

                    </div>

                    <div
                      className="trader-listing-price"
                    >
                      ₹
                      {Number(
                        listing.askingPrice || 0,
                      ).toLocaleString('en-IN')}
                    </div>

                  </div>


                  <div
                    className="trader-listing-details"
                  >

                    <div>
                      <Package size={16} />

                      <span>
                        {listing.quantity}{' '}
                        {listing.unit}
                      </span>
                    </div>


                    <div>
                      <MapPin size={16} />

                      <span>
                        {listing.market?.name ||
                          t('Market not specified')}
                      </span>
                    </div>

                  </div>


                  <div
                    className="trader-listing-footer"
                  >

                    <div>
                      <span>
                        {t('Farmer')}
                      </span>

                      <strong>
                        {listing.farmer?.name ||
                          t('Farmer')}
                      </strong>
                    </div>

                    <button
                      type="button"
                      className="trader-primary-button"
                      onClick={() =>
                        openBidModal(listing)
                      }
                    >
                      <Gavel size={16} />
                      {t('Place Bid')}
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

      </section>


      {/* ==========================================
          Active Bids
      ========================================== */}

      <div className="trader-dashboard-grid">

        <section className="trader-panel">

          <div className="trader-panel-header">

            <div>
              <h2>
                {t('Active Bids')}
              </h2>

              <p>
                {t('Your current crop bids')}
              </p>
            </div>

            <Gavel size={20} />

          </div>


          {/* Loading */}

          {loadingBids && (

            <div className="trader-empty-state">

              <div className="trader-empty-icon">
                <Gavel size={26} />
              </div>

              <h3>
                {t('Loading your bids...')}
              </h3>

              <p>
                {t('Fetching your latest marketplace bids.')}
              </p>

            </div>

          )}


          {/* Error */}

          {!loadingBids && bidListError && (

            <div className="trader-empty-state">

              <div className="trader-empty-icon">
                <Gavel size={26} />
              </div>

              <h3>
                {t('Unable to load bids')}
              </h3>

              <p>
                {bidListError}
              </p>

              <button
                type="button"
                className="trader-primary-button"
                onClick={fetchBids}
              >
                {t('Try Again')}
              </button>

            </div>

          )}


          {/* No active bids */}

          {!loadingBids &&
            !bidListError &&
            activeBids.length === 0 && (

              <div className="trader-empty-state">

                <div className="trader-empty-icon">
                  <Gavel size={26} />
                </div>

                <h3>
                  {t('No active bids')}
                </h3>

                <p>
                  {t('Your pending bids will appear here after you place an offer.')}
                </p>

                {listings.length > 0 && (
                  <button
                    type="button"
                    className="trader-secondary-button"
                    onClick={() =>
                      openBidModal(listings[0])
                    }
                  >
                    {t('Place a Bid')}
                  </button>
                )}

              </div>

            )}


          {/* Active bid cards */}

          {!loadingBids &&
            !bidListError &&
            activeBids.length > 0 && (

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  padding: '20px',
                }}
              >

                {activeBids.map((bid) => (

                  <div
                    key={bid._id}
                    style={{
                      padding: '16px',
                      border: '1px solid #dfeae3',
                      borderRadius: '13px',
                      background: '#fbfefc',
                    }}
                  >

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '15px',
                      }}
                    >

                      <div>

                        <h3
                          style={{
                            margin: 0,
                            color: '#173c2b',
                            fontSize: '16px',
                            fontWeight: 800,
                          }}
                        >
                          {bid.crop?.name ||
                            t('Unknown Crop')}
                        </h3>

                        {bid.crop?.variety && (
                          <p
                            style={{
                              margin: '4px 0 0',
                              color: '#7c8c82',
                              fontSize: '12px',
                            }}
                          >
                            {bid.crop.variety}
                          </p>
                        )}

                      </div>

                      <span
                        className="trader-listing-status"
                      >
                        {t(bid.status)}
                      </span>

                    </div>


                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(3, 1fr)',
                        gap: '10px',
                        marginTop: '14px',
                        paddingTop: '13px',
                        borderTop:
                          '1px solid #edf2ee',
                      }}
                    >

                      <div>
                        <span
                          style={{
                            display: 'block',
                            color: '#8a9890',
                            fontSize: '10px',
                          }}
                        >
                          {t('Market')}
                        </span>

                        <strong
                          style={{
                            display: 'block',
                            marginTop: '3px',
                            color: '#345143',
                            fontSize: '12px',
                          }}
                        >
                          {bid.market?.name ||
                            t('Market')}
                        </strong>
                      </div>


                      <div>
                        <span
                          style={{
                            display: 'block',
                            color: '#8a9890',
                            fontSize: '10px',
                          }}
                        >
                          {t('Quantity')}
                        </span>

                        <strong
                          style={{
                            display: 'block',
                            marginTop: '3px',
                            color: '#345143',
                            fontSize: '12px',
                          }}
                        >
                          {bid.quantity}{' '}
                          {bid.saleListing?.unit ||
                            t('unit')}
                        </strong>
                      </div>


                      <div>
                        <span
                          style={{
                            display: 'block',
                            color: '#8a9890',
                            fontSize: '10px',
                          }}
                        >
                          {t('Bid Price')}
                        </span>

                        <strong
                          style={{
                            display: 'block',
                            marginTop: '3px',
                            color: '#237651',
                            fontSize: '12px',
                          }}
                        >
                          ₹
                          {Number(
                            bid.pricePerUnit || 0,
                          ).toLocaleString(
                            'en-IN',
                          )}
                        </strong>
                      </div>

                    </div>


                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          'space-between',
                        gap: '12px',
                        marginTop: '14px',
                        paddingTop: '12px',
                        borderTop:
                          '1px solid #edf2ee',
                      }}
                    >

                      <span
                        style={{
                          color: '#52665a',
                          fontSize: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {t('Total Bid')}
                      </span>

                      <strong
                        style={{
                          color: '#237651',
                          fontSize: '17px',
                          fontWeight: 800,
                        }}
                      >
                        ₹
                        {Number(
                          bid.totalAmount || 0,
                        ).toLocaleString(
                          'en-IN',
                        )}
                      </strong>

                    </div>

                  </div>

                ))}

              </div>

            )}

        </section>


        {/* ========================================
            Recent Purchases
        ======================================== */}

        <section className="trader-panel">

          <div className="trader-panel-header">

            <div>
              <h2>
                {t('Recent Purchases')}
              </h2>

              <p>
                {t('Your latest crop purchases')}
              </p>
            </div>

            <Handshake size={20} />

          </div>


          <div className="trader-list-empty">

            <Clock3 size={20} />

            <span>
              {t('No purchases recorded yet.')}
            </span>

          </div>

        </section>

      </div>


      {/* ==========================================
          Recent Parchis
      ========================================== */}

      <section className="trader-panel">

        <div className="trader-panel-header">

          <div>
            <h2>
              {t('Recent Parchis')}
            </h2>

            <p>
              {t('Latest transaction parchis')}
            </p>
          </div>

          <ReceiptText size={20} />

        </div>


        <div className="trader-list-empty">

          <ReceiptText size={20} />

          <span>
            {t('No parchis generated yet.')}
          </span>

        </div>

      </section>


      {/* ==========================================
          Payment Center
      ========================================== */}

      <section className="trader-payment-panel">

        <div className="trader-payment-icon">
          <CreditCard size={24} />
        </div>


        <div className="trader-payment-content">

          <h2>
            {t('Payment Center')}
          </h2>

          <p>
            {t('Your payment records, pending payments and transaction QR codes will appear here.')}
          </p>

        </div>


        <Link
          to="/passbook"
          className="trader-payment-button"
        >
          {t('View Payments')}
        </Link>

      </section>


      {/* ==========================================
          Place Bid Modal
      ========================================== */}

      {selectedListing && (

        <div
          className="trader-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeBidModal();
            }
          }}
        >

          <div
            className="trader-bid-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="place-bid-title"
          >

            <div className="trader-bid-modal-header">

              <div>
                <p>
                  {t('Marketplace')}
                </p>

                <h2 id="place-bid-title">
                  {t('Place Your Bid')}
                </h2>
              </div>

              <button
                type="button"
                className="trader-modal-close"
                onClick={closeBidModal}
                disabled={submittingBid}
                aria-label={t('Close bid modal')}
              >
                <X size={20} />
              </button>

            </div>


            <div className="trader-bid-listing-summary">

              <div>
                <span>
                  {t('Crop')}
                </span>

                <strong>
                  {selectedListing.crop?.name ||
                    t('Unknown Crop')}
                </strong>

                {selectedListing.crop?.variety && (
                  <small>
                    {selectedListing.crop.variety}
                  </small>
                )}
              </div>


              <div>
                <span>
                  {t('Market')}
                </span>

                <strong>
                  {selectedListing.market?.name ||
                    t('Market not specified')}
                </strong>
              </div>


              <div>
                <span>
                  {t('Available')}
                </span>

                <strong>
                  {selectedListing.quantity}{' '}
                  {selectedListing.unit}
                </strong>
              </div>


              <div>
                <span>
                  {t('Asking Price')}
                </span>

                <strong>
                  ₹
                  {Number(
                    selectedListing.askingPrice || 0,
                  ).toLocaleString('en-IN')}
                  /{selectedListing.unit}
                </strong>
              </div>

            </div>


            <form
              className="trader-bid-form"
              onSubmit={handleSubmitBid}
            >

              <div className="trader-form-row">

                <div className="trader-form-group">

                  <label htmlFor="bid-quantity">
                    {t('Quantity')}
                  </label>

                  <div className="trader-input-with-suffix">

                    <input
                      id="bid-quantity"
                      type="number"
                      min="0.01"
                      max={selectedListing.quantity}
                      step="0.01"
                      value={bidQuantity}
                      onChange={(event) =>
                        setBidQuantity(
                          event.target.value,
                        )
                      }
                      required
                      disabled={submittingBid}
                    />

                    <span>
                      {selectedListing.unit}
                    </span>

                  </div>

                  <small>
                    {t('Maximum available:')}{' '}
                    {selectedListing.quantity}{' '}
                    {selectedListing.unit}
                  </small>

                </div>


                <div className="trader-form-group">

                  <label htmlFor="bid-price">
                    {t('Your Price')}
                  </label>

                  <div className="trader-input-with-prefix">

                    <span>
                      ₹
                    </span>

                    <input
                      id="bid-price"
                      type="number"
                      min="1"
                      step="1"
                      value={bidPrice}
                      onChange={(event) =>
                        setBidPrice(
                          event.target.value,
                        )
                      }
                      required
                      disabled={submittingBid}
                    />

                  </div>

                  <small>
                    {t('Per {0}', selectedListing.unit)}
                  </small>

                </div>

              </div>


              <div className="trader-form-group">

                <label htmlFor="bid-message">
                  {t('Message')}
                  <span>
                    {' '}
                    {t('(optional)')}
                  </span>
                </label>

                <textarea
                  id="bid-message"
                  rows="3"
                  maxLength="500"
                  value={bidMessage}
                  onChange={(event) =>
                    setBidMessage(
                      event.target.value,
                    )
                  }
                  placeholder={t('Add a message for the farmer...')}
                  disabled={submittingBid}
                />

              </div>


              <div className="trader-bid-total">

                <span>
                  {t('Total Bid Amount')}
                </span>

                <strong>
                  ₹
                  {Number(
                    totalBidAmount || 0,
                  ).toLocaleString('en-IN')}
                </strong>

              </div>


              {bidError && (

                <div className="trader-bid-message trader-bid-error">
                  {bidError}
                </div>

              )}


              {bidSuccess && (

                <div className="trader-bid-message trader-bid-success">
                  {bidSuccess}
                </div>

              )}


              <div className="trader-bid-actions">

                <button
                  type="button"
                  className="trader-secondary-button"
                  onClick={closeBidModal}
                  disabled={submittingBid}
                >
                  {t('Cancel')}
                </button>

                <button
                  type="submit"
                  className="trader-primary-button"
                  disabled={submittingBid}
                >
                  <Gavel size={16} />

                  {submittingBid
                    ? t('Placing Bid...')
                    : t('Place Bid')}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

      <QrModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        title={t('Traceability Scanner')}
        description={t('Scan a lot / parchi QR to verify authenticity before you buy.')}
      />

    </div>
  );
}

export default TraderDashboard;