import {
  useEffect,
  useState,
} from 'react';

import {
  Truck,
  RefreshCw,
  ScanLine,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import QrModal from '../components/QrModal';

import './AdminDashboard.css';
import './AdminListPages.css';

const API_BASE_URL = API_URL;

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
};

const badgeFor = (status) => {
  return `ks-badge ${status || 'available'}`;
};

function AdminBackhaul() {
  const { t } = useLanguage();

  const { token } = useAuth();

  const [trips, setTrips] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [qrTarget, setQrTarget] =
    useState(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_BASE_URL}/backhaul/admin/all`,
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
            t('Unable to fetch transport records.'),
        );
      }

      setTrips(data.data || []);
    } catch (err) {
      console.error(
        'Admin backhaul error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to load transport records.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTrips();
    }
  }, [token]);

  const filtered = trips.filter((trip) => {
    const matchesStatus =
      statusFilter === 'all' ||
      trip.status === statusFilter;

    const haystack = [
      trip.vehicleNumber,
      trip.vehicleType,
      trip.driverName,
      trip.sourceMarket?.name,
      trip.destinationMarket?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch =
      !search ||
      haystack.includes(search.toLowerCase());

    return (
      matchesStatus && matchesSearch
    );
  });

  const statusCount = (status) =>
    trips.filter(
      (t) => t.status === status,
    ).length;

  return (
    <div className="ks-admin-wrap">

      <div className="ks-admin-header">

        <div>
          <p className="ks-admin-label">
            {t('Administration')}
          </p>

          <h1>{t('Backhaul Logistics')}</h1>

          <p>
            {t('Transport capacity shared across mandi routes.')}
          </p>
        </div>

        <div className="ks-admin-chip">
          <Truck size={16} />
          {t('{0} trips', trips.length)}
        </div>

      </div>

      {error && (
        <div className="ks-admin-error">
          {error}

          <button
            type="button"
            onClick={fetchTrips}
          >
            {t('Retry')}
          </button>
        </div>
      )}

      <div className="ks-admin-summary">

        <div className="ks-admin-summary-card">
          <span>{t('Available')}</span>
          <strong>
            {statusCount('available')}
          </strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('In transit')}</span>
          <strong>
            {statusCount('in_transit')}
          </strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Completed')}</span>
          <strong>
            {statusCount('completed')}
          </strong>
        </div>

        <div className="ks-admin-summary-card">
          <span>{t('Cancelled')}</span>
          <strong>
            {statusCount('cancelled')}
          </strong>
        </div>

      </div>

      <div className="ks-admin-toolbar">

        <input
          type="text"
          className="ks-admin-search"
          placeholder={t('Search vehicle, driver or route…')}
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          className="ks-admin-select"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="all">
            {t('All statuses')}
          </option>

          <option value="available">
            {t('Available')}
          </option>

          <option value="in_transit">
            {t('In transit')}
          </option>

          <option value="completed">
            {t('Completed')}
          </option>

          <option value="cancelled">
            {t('Cancelled')}
          </option>
        </select>

        <button
          type="button"
          className="ks-admin-refresh"
          onClick={fetchTrips}
        >
          <RefreshCw size={14} />
          {t('Refresh')}
        </button>

      </div>

      <div className="admin-panel">

        {loading ? (
          <p className="ks-admin-empty">
            {t('Loading transport records…')}
          </p>
        ) : filtered.length === 0 ? (
          <p className="ks-admin-empty">
            {t('No trips match your filters.')}
          </p>
        ) : (
          <div className="ks-admin-table-card">

            <table className="ks-admin-table">

              <thead>
                <tr>
                  <th>{t('Vehicle')}</th>
                  <th>{t('Driver')}</th>
                  <th>{t('Route')}</th>
                  <th>{t('Capacity')}</th>
                  <th>{t('Cost')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('Date')}</th>
                  <th>{t('Trace')}</th>
                </tr>
              </thead>

              <tbody>

                {filtered.map((trip) => (
                  <tr key={trip._id}>

                    <td>
                      {trip.vehicleNumber ||
                        t('Not set')}

                      <span className="ks-admin-sub">
                        {trip.vehicleType ||
                          ''}
                      </span>
                    </td>

                    <td>
                      {trip.driverName ||
                        '—'}

                      <span className="ks-admin-sub">
                        {trip.driverPhone ||
                          ''}
                      </span>
                    </td>

                    <td>
                      {trip.sourceMarket
                        ?.name ||
                        t('Unknown')}{' '}
                      →{' '}
                      {trip
                        .destinationMarket
                        ?.name ||
                        t('Unknown')}

                      <span className="ks-admin-sub">
                        {trip
                          .estimatedDistanceKm
                          ? `${t('{0} km', trip.estimatedDistanceKm)}`
                          : ''}
                      </span>
                    </td>

                    <td>
                      {trip.availableCapacity ||
                        trip.capacity ||
                        0}{' '}
                      {trip.capacityUnit ||
                        t('kg')}
                    </td>

                    <td>
                      {formatCurrency(
                        trip.estimatedCost,
                      )}
                    </td>

                    <td>
                      <span
                        className={badgeFor(
                          trip.status,
                        )}
                      >
                        {trip.status}
                      </span>
                    </td>

                    <td>
                      {new Date(
                        trip.departureDate ||
                          trip.createdAt,
                      ).toLocaleDateString(
                        'en-IN',
                        {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        },
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="ks-admin-btn"
                        onClick={() =>
                          setQrTarget(trip)
                        }
                        title={t('Open logistics QR')}
                      >
                        <ScanLine size={13} />
                        {t('QR')}
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      <QrModal
        open={Boolean(qrTarget)}
        onClose={() => setQrTarget(null)}
        entityType="backhaul"
        entityId={qrTarget?._id}
        title={t('Logistics QR')}
        description={t('Verify this transport consignment at pickup, weighbridge and drop-off.')}
      />

    </div>
  );
}

export default AdminBackhaul;