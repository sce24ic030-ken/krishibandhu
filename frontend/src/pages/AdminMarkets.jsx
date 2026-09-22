import {
  Search,
  Store,
  CheckCircle2,
  XCircle,
  Clock3,
  ShieldCheck,
  RefreshCw,
  Trash2,
  MapPin,
  Database,
  UserRound,
  AlertCircle,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import './AdminMarkets.css';

const API_BASE_URL = API_URL;

function AdminMarkets() {
  const { t } = useLanguage();

  const {
    token,
  } = useAuth();

  const [
    markets,
    setMarkets,
  ] = useState([]);

  const [
    stats,
    setStats,
  ] = useState({
    total: 0,
    official: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    userSubmitted: 0,
  });

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    searchInput,
    setSearchInput,
  ] = useState('');

  const [
    districtFilter,
    setDistrictFilter,
  ] = useState('all');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all');

  const [
    sourceFilter,
    setSourceFilter,
  ] = useState('all');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    statsLoading,
    setStatsLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    updatingMarketId,
    setUpdatingMarketId,
  ] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Fetch Market Statistics
  |--------------------------------------------------------------------------
  */

  const fetchStats = async () => {
    try {
      setStatsLoading(true);

      const response =
        await fetch(
          `${API_BASE_URL}/admin/markets/stats`,
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
            t('Unable to fetch market statistics.'),
        );
      }

      setStats(
        data.stats || {
          total: 0,
          official: 0,
          pending: 0,
          verified: 0,
          rejected: 0,
          userSubmitted: 0,
        },
      );
    } catch (err) {
      console.error(
        'Fetch Market Stats Error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to fetch market statistics.'),
      );
    } finally {
      setStatsLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Fetch Markets
  |--------------------------------------------------------------------------
  */

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      setError('');

      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.set(
          'search',
          search.trim(),
        );
      }

      if (
        districtFilter !==
        'all'
      ) {
        params.set(
          'district',
          districtFilter,
        );
      }

      if (
        statusFilter !==
        'all'
      ) {
        params.set(
          'status',
          statusFilter,
        );
      }

      if (
        sourceFilter !==
        'all'
      ) {
        params.set(
          'source',
          sourceFilter,
        );
      }

      const queryString =
        params.toString();

      const url = queryString
        ? `${API_BASE_URL}/admin/markets?${queryString}`
        : `${API_BASE_URL}/admin/markets`;

      const response =
        await fetch(
          url,
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
            t('Unable to fetch markets.'),
        );
      }

      setMarkets(
        data.markets || [],
      );
    } catch (err) {
      console.error(
        'Fetch Admin Markets Error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to fetch markets.'),
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Initial Load
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!token) {
      return;
    }

    fetchStats();
    fetchMarkets();
  }, [token]);

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const handleSearch = (
    event,
  ) => {
    event.preventDefault();

    setSearch(
      searchInput.trim(),
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Refresh
  |--------------------------------------------------------------------------
  */

  const handleRefresh = async () => {
    setError('');

    await Promise.all([
      fetchStats(),
      fetchMarkets(),
    ]);
  };

  /*
  |--------------------------------------------------------------------------
  | Verify / Reject Market
  |--------------------------------------------------------------------------
  */

  const updateVerification =
    async (
      market,
      verificationStatus,
    ) => {
      const actionLabel =
        verificationStatus ===
        'verified'
          ? 'verify'
          : 'reject';

      const confirmed =
        window.confirm(
          t('Are you sure you want to {0} "{1}"?', actionLabel, market.name),
        );

      if (!confirmed) {
        return;
      }

      try {
        setUpdatingMarketId(
          market._id,
        );

        setError('');

        const response =
          await fetch(
            `${API_BASE_URL}/admin/markets/${market._id}/verification`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                verificationStatus,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t('Unable to update market verification.'),
          );
        }

        setMarkets(
          (previousMarkets) =>
            previousMarkets.map(
              (item) =>
                item._id ===
                market._id
                  ? {
                      ...item,
                      verificationStatus:
                        data.market
                          ?.verificationStatus ||
                        verificationStatus,
                      isOfficial:
                        data.market
                          ?.isOfficial ??
                        item.isOfficial,
                    }
                  : item,
            ),
        );

        await fetchStats();
      } catch (err) {
        console.error(
          'Update Market Verification Error:',
          err,
        );

        setError(
          err.message ||
            t('Unable to update market verification.'),
        );
      } finally {
        setUpdatingMarketId(
          null,
        );
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Delete Market
  |--------------------------------------------------------------------------
  */

  const deleteMarket = async (
    market,
  ) => {
    if (
      market.isOfficial ||
      market.source ===
        'MSAMB'
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        t('Delete the submitted market "{0}"? This action cannot be undone.', market.name),
      );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingMarketId(
        market._id,
      );

      setError('');

      const response =
        await fetch(
          `${API_BASE_URL}/admin/markets/${market._id}`,
          {
            method: 'DELETE',

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
            t('Unable to delete market.'),
        );
      }

      setMarkets(
        (previousMarkets) =>
          previousMarkets.filter(
            (item) =>
              item._id !==
              market._id,
          ),
      );

      await fetchStats();
    } catch (err) {
      console.error(
        'Delete Admin Market Error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to delete market.'),
      );
    } finally {
      setUpdatingMarketId(
        null,
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Format Date
  |--------------------------------------------------------------------------
  */

  const formatDate = (
    date,
  ) => {
    if (!date) {
      return '-';
    }

    return new Date(
      date,
    ).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Status Badge
  |--------------------------------------------------------------------------
  */

  const getStatusBadge =
    (status) => {
      if (
        status ===
        'verified'
      ) {
        return (
          <span className="admin-market-status verified">
            <CheckCircle2
              size={14}
            />
            {t('Verified')}
          </span>
        );
      }

      if (
        status ===
        'rejected'
      ) {
        return (
          <span className="admin-market-status rejected">
            <XCircle
              size={14}
            />
            {t('Rejected')}
          </span>
        );
      }

      return (
        <span className="admin-market-status pending">
          <Clock3
            size={14}
          />
          {t('Pending')}
        </span>
      );
    };

  /*
  |--------------------------------------------------------------------------
  | Source Badge
  |--------------------------------------------------------------------------
  */

  const getSourceBadge =
    (market) => {
      if (
        market.source ===
          'MSAMB' ||
        market.isOfficial
      ) {
        return (
          <span className="admin-market-source official">
            <Database
              size={13}
            />
            MSAMB
          </span>
        );
      }

      return (
        <span className="admin-market-source submitted">
          <UserRound
            size={13}
          />
          {t('User Submitted')}
        </span>
      );
    };

  /*
  |--------------------------------------------------------------------------
  | District Options
  |--------------------------------------------------------------------------
  */

  const districts = [
    ...new Set(
      markets
        .map(
          (market) =>
            market.district,
        )
        .filter(Boolean),
    ),
  ].sort();

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="admin-markets">

      {/* ================================= */}
      {/* Header                            */}
      {/* ================================= */}

      <div className="admin-markets-header">

        <div>

          <p className="admin-markets-label">
            {t('Administration')}
          </p>

          <h1>
            {t('Market Management')}
          </h1>

          <p>
            {t('View and manage Maharashtra market records and submissions.')}
          </p>

        </div>

        <div className="admin-markets-count">

          <Store size={21} />

          <div>

            <strong>
              {statsLoading
                ? '—'
                : stats.total}
            </strong>

            <span>
              {t('Markets')}
            </span>

          </div>

        </div>

      </div>

      {/* ================================= */}
      {/* Statistics                        */}
      {/* ================================= */}

      <section className="admin-market-stats">

        <div className="admin-market-stat-card">

          <div className="admin-market-stat-icon total">
            <Store size={18} />
          </div>

          <div>

            <strong>
              {statsLoading
                ? '—'
                : stats.total}
            </strong>

            <span>
              {t('Total Markets')}
            </span>

          </div>

        </div>

        <div className="admin-market-stat-card">

          <div className="admin-market-stat-icon official">
            <Database size={18} />
          </div>

          <div>

            <strong>
              {statsLoading
                ? '—'
                : stats.official}
            </strong>

            <span>
              {t('Official MSAMB')}
            </span>

          </div>

        </div>

        <div className="admin-market-stat-card">

          <div className="admin-market-stat-icon pending">
            <Clock3 size={18} />
          </div>

          <div>

            <strong>
              {statsLoading
                ? '—'
                : stats.pending}
            </strong>

            <span>
              {t('Pending Review')}
            </span>

          </div>

        </div>

        <div className="admin-market-stat-card">

          <div className="admin-market-stat-icon verified">
            <CheckCircle2 size={18} />
          </div>

          <div>

            <strong>
              {statsLoading
                ? '—'
                : stats.verified}
            </strong>

            <span>
              {t('Verified')}
            </span>

          </div>

        </div>

        <div className="admin-market-stat-card">

          <div className="admin-market-stat-icon submitted">
            <UserRound size={18} />
          </div>

          <div>

            <strong>
              {statsLoading
                ? '—'
                : stats.userSubmitted}
            </strong>

            <span>
              {t('User Submitted')}
            </span>

          </div>

        </div>

      </section>

      {/* ================================= */}
      {/* Error                             */}
      {/* ================================= */}

      {error && (
        <div className="admin-markets-error">

          <div>

            <AlertCircle
              size={18}
            />

            <span>
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={
              handleRefresh
            }
          >
            <RefreshCw
              size={15}
            />

            {t('Retry')}
          </button>

        </div>
      )}

      {/* ================================= */}
      {/* Filters                           */}
      {/* ================================= */}

      <section className="admin-markets-filter-card">

        <form
          className="admin-markets-search"
          onSubmit={
            handleSearch
          }
        >

          <Search size={18} />

          <input
            type="text"
            value={
              searchInput
            }
            onChange={(
              event,
            ) =>
              setSearchInput(
                event.target.value,
              )
            }
            placeholder={t('Search by market name...')}
          />

          <button
            type="submit"
          >
            {t('Search')}
          </button>

        </form>

        <div className="admin-markets-filters">

          <div className="admin-market-filter-group">

            <label>
              {t('District')}
            </label>

            <select
              value={
                districtFilter
              }
              onChange={(
                event,
              ) =>
                setDistrictFilter(
                  event.target.value,
                )
              }
            >

              <option value="all">
                {t('All Districts')}
              </option>

              {districts.map(
                (district) => (
                  <option
                    key={district}
                    value={
                      district
                    }
                  >
                    {district}
                  </option>
                ),
              )}

            </select>

          </div>

          <div className="admin-market-filter-group">

            <label>
              {t('Verification')}
            </label>

            <select
              value={
                statusFilter
              }
              onChange={(
                event,
              ) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >

              <option value="all">
                {t('All Status')}
              </option>

              <option value="pending">
                {t('Pending')}
              </option>

              <option value="verified">
                {t('Verified')}
              </option>

              <option value="rejected">
                {t('Rejected')}
              </option>

            </select>

          </div>

          <div className="admin-market-filter-group">

            <label>
              {t('Source')}
            </label>

            <select
              value={
                sourceFilter
              }
              onChange={(
                event,
              ) =>
                setSourceFilter(
                  event.target.value,
                )
              }
            >

              <option value="all">
                {t('All Sources')}
              </option>

              <option value="MSAMB">
                MSAMB
              </option>

              <option value="user_submitted">
                {t('User Submitted')}
              </option>

            </select>

          </div>

          <button
            type="button"
            className="admin-market-refresh-button"
            onClick={
              handleRefresh
            }
            disabled={
              loading ||
              statsLoading
            }
          >

            <RefreshCw
              size={16}
              className={
                loading ||
                statsLoading
                  ? 'admin-market-spin'
                  : ''
              }
            />

            {t('Refresh')}

          </button>

        </div>

      </section>

      {/* ================================= */}
      {/* Market Table                      */}
      {/* ================================= */}

      <section className="admin-markets-table-card">

        <div className="admin-markets-table-header">

          <div>

            <h2>
              {t('Maharashtra Markets')}
            </h2>

            <p>
              {t('Official MSAMB records and user-submitted market requests.')}
            </p>

          </div>

          <ShieldCheck
            size={21}
          />

        </div>

        {loading ? (
          <div className="admin-markets-loading">

            <RefreshCw
              size={25}
              className="admin-market-spin"
            />

            <p>
              {t('Loading markets...')}
            </p>

          </div>
        ) : markets.length ===
          0 ? (
          <div className="admin-markets-empty">

            <Store size={30} />

            <h3>
              {t('No markets found')}
            </h3>

            <p>
              {t('Try changing your search or filters.')}
            </p>

          </div>
        ) : (
          <div className="admin-markets-table-wrapper">

            <table className="admin-markets-table">

              <thead>

                <tr>

                  <th>
                    {t('Market')}
                  </th>

                  <th>
                    {t('District')}
                  </th>

                  <th>
                    {t('Type')}
                  </th>

                  <th>
                    {t('Source')}
                  </th>

                  <th>
                    {t('Verification')}
                  </th>

                  <th>
                    {t('Location')}
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

                {markets.map(
                  (market) => {
                    const isUpdating =
                      updatingMarketId ===
                      market._id;

                    const isOfficial =
                      market.isOfficial ||
                      market.source ===
                        'MSAMB';

                    const isPending =
                      market.verificationStatus ===
                      'pending';

                    return (
                      <tr
                        key={
                          market._id
                        }
                      >

                        {/* Market */}

                        <td>

                          <div className="admin-market-name-cell">

                            <div className="admin-market-avatar">

                              <Store
                                size={17}
                              />

                            </div>

                            <div>

                              <strong>
                                {
                                  market.name
                                }
                              </strong>

                              {isOfficial && (
                                <span className="admin-market-official-label">
                                  {t('Official')}
                                </span>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* District */}

                        <td>

                          <span className="admin-market-district">

                            <MapPin
                              size={13}
                            />

                            {
                              market.district ||
                              '-'
                            }

                          </span>

                        </td>

                        {/* Type */}

                        <td>

                          <span className="admin-market-type">
                            {
                              market.type ||
                              t('Other')
                            }
                          </span>

                        </td>

                        {/* Source */}

                        <td>
                          {
                            getSourceBadge(
                              market,
                            )
                          }
                        </td>

                        {/* Verification */}

                        <td>
                          {
                            getStatusBadge(
                              market.verificationStatus,
                            )
                          }
                        </td>

                        {/* Location */}

                        <td>

                          <span className="admin-market-location">

                            {
                              market.location ||
                              '-'
                            }

                          </span>

                        </td>

                        {/* Added */}

                        <td>

                          <span className="admin-market-date">

                            {
                              formatDate(
                                market.createdAt,
                              )
                            }

                          </span>

                        </td>

                        {/* Actions */}

                        <td>

                          <div className="admin-market-actions">

                            {!isOfficial &&
                              isPending && (
                                <>
                                  <button
                                    type="button"
                                    className="admin-market-action-button verify"
                                    disabled={
                                      isUpdating
                                    }
                                    onClick={() =>
                                      updateVerification(
                                        market,
                                        'verified',
                                      )
                                    }
                                  >

                                    {isUpdating ? (
                                      <RefreshCw
                                        size={13}
                                        className="admin-market-spin"
                                      />
                                    ) : (
                                      <CheckCircle2
                                        size={13}
                                      />
                                    )}

                                    {t('Verify')}

                                  </button>

                                  <button
                                    type="button"
                                    className="admin-market-action-button reject"
                                    disabled={
                                      isUpdating
                                    }
                                    onClick={() =>
                                      updateVerification(
                                        market,
                                        'rejected',
                                      )
                                    }
                                  >

                                    <XCircle
                                      size={13}
                                    />

                                    {t('Reject')}

                                  </button>
                                </>
                              )}

                            {!isOfficial &&
                              !isPending && (
                                <button
                                  type="button"
                                  className="admin-market-action-button delete"
                                  disabled={
                                    isUpdating
                                  }
                                  onClick={() =>
                                    deleteMarket(
                                      market,
                                    )
                                  }
                                >

                                  {isUpdating ? (
                                    <RefreshCw
                                      size={13}
                                      className="admin-market-spin"
                                    />
                                  ) : (
                                    <Trash2
                                      size={13}
                                    />
                                  )}

                                  {t('Delete')}

                                </button>
                              )}

                            {isOfficial && (
                              <span className="admin-market-protected-label">
                                {t('Protected')}
                              </span>
                            )}

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

    </div>
  );
}

export default AdminMarkets;