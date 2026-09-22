import {
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  Search,
  XCircle,
  Warehouse,
  UserRound,
  CalendarDays,
  Package,
  IndianRupee,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import './AdminStorageRequests.css';

const API_BASE_URL = API_URL;

function AdminStorageRequests() {
  const { t } = useLanguage();

  const { token } = useAuth();

  const [
    requests,
    setRequests,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('all');

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('');

  const [
    actionLoading,
    setActionLoading,
  ] = useState('');

  const [
    selectedRequest,
    setSelectedRequest,
  ] = useState(null);

  const [
    adminNote,
    setAdminNote,
  ] = useState('');

  const fetchRequests =
    useCallback(async () => {
      if (!token) {
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response =
          await fetch(
            `${API_BASE_URL}/storage/requests`,
            {
              method: 'GET',
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
              t('Unable to fetch storage requests.'),
          );
        }

        setRequests(
          Array.isArray(data.data)
            ? data.data
            : [],
        );
      } catch (err) {
        console.error(
          'Admin Storage Requests Error:',
          err,
        );

        setError(
          err.message ||
            t('Unable to load storage requests.'),
        );
      } finally {
        setLoading(false);
      }
    }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const formatCurrency = (
    value,
  ) => {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      },
    ).format(value || 0);
  };

  const formatDate = (
    value,
  ) => {
    if (!value) {
      return '—';
    }

    return new Date(
      value,
    ).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      },
    );
  };

  const getStatusLabel = (
    status,
  ) => {
    const labels = {
      pending: 'Pending',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
      completed: 'Completed',
    };

    return t(
      labels[status] ||
      status
    );
  };

  const getStatusIcon = (
    status,
  ) => {
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

  const filteredRequests =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return requests.filter(
        (request) => {
          const matchesStatus =
            statusFilter ===
              'all' ||
            request.status ===
              statusFilter;

          if (!matchesStatus) {
            return false;
          }

          if (
            !normalizedSearch
          ) {
            return true;
          }

          const farmerName =
            request.farmer?.name ||
            '';

          const farmerEmail =
            request.farmer?.email ||
            '';

          const crop =
            request.crop || '';

          const facility =
            request
              .storageFacility
              ?.name || '';

          return [
            farmerName,
            farmerEmail,
            crop,
            facility,
          ]
            .join(' ')
            .toLowerCase()
            .includes(
              normalizedSearch,
            );
        },
      );
    }, [
      requests,
      searchTerm,
      statusFilter,
    ]);

  const counts =
    useMemo(() => {
      return {
        all: requests.length,

        pending:
          requests.filter(
            (item) =>
              item.status ===
              'pending',
          ).length,

        approved:
          requests.filter(
            (item) =>
              item.status ===
              'approved',
          ).length,

        rejected:
          requests.filter(
            (item) =>
              item.status ===
              'rejected',
          ).length,

        completed:
          requests.filter(
            (item) =>
              item.status ===
              'completed',
          ).length,
      };
    }, [requests]);

  const openReview = (
    request,
  ) => {
    setSelectedRequest(
      request,
    );

    setAdminNote(
      request.adminNote ||
        '',
    );
  };

  const closeReview = () => {
    if (actionLoading) {
      return;
    }

    setSelectedRequest(
      null,
    );

    setAdminNote('');
  };

  const updateRequestStatus =
    async (
      request,
      status,
    ) => {
      if (!token) {
        return;
      }

      const actionKey =
        `${request._id}-${status}`;

      try {
        setActionLoading(
          actionKey,
        );

        const response =
          await fetch(
            `${API_BASE_URL}/storage/requests/${request._id}/status`,
            {
              method: 'PATCH',
              headers: {
                Authorization:
                  `Bearer ${token}`,
                'Content-Type':
                  'application/json',
              },
              body: JSON.stringify({
                status,
                adminNote:
                  adminNote.trim(),
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t('Unable to {0} storage request.', status),
          );
        }

        setSelectedRequest(
          null,
        );

        setAdminNote('');

        await fetchRequests();
      } catch (err) {
        console.error(
          'Storage Request Status Error:',
          err,
        );

        setError(
          err.message ||
            t('Unable to update storage request.'),
        );
      } finally {
        setActionLoading('');
      }
    };

  return (
    <div className="admin-storage-page">

      {/* Header */}

      <div className="admin-storage-header">

        <div>

          <p className="admin-storage-label">
            {t('Administration')}
          </p>

          <h1>
            {t('Storage Requests')}
          </h1>

          <p>
            {t('Review and manage farmer storage requests across KrishiBandhu.')}
          </p>

        </div>

        <button
          type="button"
          className="admin-storage-refresh"
          onClick={
            fetchRequests
          }
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? 'admin-storage-spin'
                : ''
            }
          />

          {t('Refresh')}
        </button>

      </div>

      {/* Error */}

      {error && (
        <div className="admin-storage-error">

          <span>
            {error}
          </span>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
          >
            {t('Dismiss')}
          </button>

        </div>
      )}

      {/* Summary */}

      <div className="admin-storage-summary">

        <button
          type="button"
          className={
            `admin-storage-summary-card ${
              statusFilter === 'all'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setStatusFilter(
              'all',
            )
          }
        >

          <div className="admin-storage-summary-icon">
            <FileText
              size={20}
            />
          </div>

          <div>

            <strong>
              {counts.all}
            </strong>

            <span>
              {t('All Requests')}
            </span>

          </div>

        </button>

        <button
          type="button"
          className={
            `admin-storage-summary-card ${
              statusFilter ===
              'pending'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setStatusFilter(
              'pending',
            )
          }
        >

          <div className="admin-storage-summary-icon">
            <Clock3
              size={20}
            />
          </div>

          <div>

            <strong>
              {counts.pending}
            </strong>

            <span>
              {t('Pending')}
            </span>

          </div>

        </button>

        <button
          type="button"
          className={
            `admin-storage-summary-card ${
              statusFilter ===
              'approved'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setStatusFilter(
              'approved',
            )
          }
        >

          <div className="admin-storage-summary-icon">
            <CheckCircle2
              size={20}
            />
          </div>

          <div>

            <strong>
              {counts.approved}
            </strong>

            <span>
              {t('Approved')}
            </span>

          </div>

        </button>

        <button
          type="button"
          className={
            `admin-storage-summary-card ${
              statusFilter ===
              'rejected'
                ? 'active'
                : ''
            }`
          }
          onClick={() =>
            setStatusFilter(
              'rejected',
            )
          }
        >

          <div className="admin-storage-summary-icon">
            <XCircle
              size={20}
            />
          </div>

          <div>

            <strong>
              {counts.rejected}
            </strong>

            <span>
              {t('Rejected')}
            </span>

          </div>

        </button>

      </div>

      {/* Toolbar */}

      <div className="admin-storage-toolbar">

        <div className="admin-storage-search">

          <Search
            size={18}
          />

          <input
            type="text"
            value={
              searchTerm
            }
            onChange={(event) =>
              setSearchTerm(
                event.target.value,
              )
            }
            placeholder={t('Search farmer, crop or facility...')}
          />

        </div>

        <select
          value={
            statusFilter
          }
          onChange={(event) =>
            setStatusFilter(
              event.target.value,
            )
          }
          className="admin-storage-filter"
        >
          <option value="all">
            {t('All Statuses')}
          </option>

          <option value="pending">
            {t('Pending')}
          </option>

          <option value="approved">
            {t('Approved')}
          </option>

          <option value="rejected">
            {t('Rejected')}
          </option>

          <option value="completed">
            {t('Completed')}
          </option>
        </select>

      </div>

      {/* Requests */}

      <section className="admin-storage-panel">

        <div className="admin-storage-panel-header">

          <div>

            <h2>
              {t('Farmer Requests')}
            </h2>

            <p>
              {filteredRequests.length}
              {' '}
              {t('request')}
              {filteredRequests.length !==
              1
                ? 's'
                : ''}
              {' '}
              {t('shown')}
            </p>

          </div>

          <Warehouse
            size={21}
          />

        </div>

        {loading ? (
          <div className="admin-storage-empty">

            <RefreshCw
              size={25}
              className="admin-storage-spin"
            />

            <strong>
              {t('Loading storage requests...')}
            </strong>

          </div>
        ) : filteredRequests.length ===
          0 ? (
          <div className="admin-storage-empty">

            <FileText
              size={30}
            />

            <strong>
              {t('No storage requests found')}
            </strong>

            <span>
              {t('Try changing the status filter or search term.')}
            </span>

          </div>
        ) : (
          <div className="admin-storage-list">

            {filteredRequests.map(
              (request) => {
                const StatusIcon =
                  getStatusIcon(
                    request.status,
                  );

                return (
                  <article
                    className="admin-storage-request-card"
                    key={
                      request._id
                    }
                  >

                    <div className="admin-storage-request-top">

                      <div>

                        <div className="admin-storage-request-title">

                          <h3>
                            {
                              request.crop
                            }
                          </h3>

                          <span
                            className={
                              `admin-storage-status ${request.status}`
                            }
                          >

                            <StatusIcon
                              size={14}
                            />

                            {
                              getStatusLabel(
                                request.status,
                              )
                            }

                          </span>

                        </div>

                        <p className="admin-storage-request-id">
                          {t('Request ID:')}{' '}
                          {
                            request._id
                          }
                        </p>

                      </div>

                      <button
                        type="button"
                        className="admin-storage-review-button"
                        onClick={() =>
                          openReview(
                            request,
                          )
                        }
                      >
                        {t('Review')}
                      </button>

                    </div>

                    <div className="admin-storage-request-grid">

                      <div className="admin-storage-info">

                        <UserRound
                          size={17}
                        />

                        <div>

                          <span>
                            {t('Farmer')}
                          </span>

                          <strong>
                            {
                              request
                                .farmer
                                ?.name ||
                              t('Unknown farmer')
                            }
                          </strong>

                          <small>
                            {
                              request
                                .farmer
                                ?.email ||
                              '—'
                            }
                          </small>

                        </div>

                      </div>

                      <div className="admin-storage-info">

                        <Warehouse
                          size={17}
                        />

                        <div>

                          <span>
                            {t('Storage Facility')}
                          </span>

                          <strong>
                            {
                              request
                                .storageFacility
                                ?.name ||
                              t('Unknown facility')
                            }
                          </strong>

                          <small>
                            {
                              request
                                .storageFacility
                                ?.location
                                ?.district ||
                              '—'
                            }
                            ,{' '}
                            {
                              request
                                .storageFacility
                                ?.location
                                ?.state ||
                              '—'
                            }
                          </small>

                        </div>

                      </div>

                      <div className="admin-storage-info">

                        <Package
                          size={17}
                        />

                        <div>

                          <span>
                            {t('Quantity')}
                          </span>

                          <strong>
                            {
                              request.quantity
                            }{' '}
                            {
                              request.unit
                            }
                          </strong>

                          <small>
                            {
                              request.quantityInKg
                            }{' '}
                            {t('kg total')}
                          </small>

                        </div>

                      </div>

                      <div className="admin-storage-info">

                        <CalendarDays
                          size={17}
                        />

                        <div>

                          <span>
                            {t('Storage Period')}
                          </span>

                          <strong>
                            {
                              formatDate(
                                request.startDate,
                              )
                            }
                          </strong>

                          <small>
                            {
                              request.durationMonths
                            }{' '}
                            {t('month')}
                            {
                              request.durationMonths !==
                              1
                                ? 's'
                                : ''
                            }
                          </small>

                        </div>

                      </div>

                      <div className="admin-storage-info">

                        <IndianRupee
                          size={17}
                        />

                        <div>

                          <span>
                            {t('Estimated Cost')}
                          </span>

                          <strong>
                            {
                              formatCurrency(
                                request.estimatedTotalCost,
                              )
                            }
                          </strong>

                          <small>
                            {
                              formatCurrency(
                                request.estimatedMonthlyCost,
                              )
                            }
                            {t('/month')}
                          </small>

                        </div>

                      </div>

                    </div>

                    {request.notes && (
                      <div className="admin-storage-notes">

                        <strong>
                          {t('Farmer Note')}
                        </strong>

                        <span>
                          {
                            request.notes
                          }
                        </span>

                      </div>
                    )}

                  </article>
                );
              },
            )}

          </div>
        )}

      </section>

      {/* Review Modal */}

      {selectedRequest && (
        <div
          className="admin-storage-modal-backdrop"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeReview();
            }
          }}
        >

          <div className="admin-storage-modal">

            <div className="admin-storage-modal-header">

              <div>

                <p>
                  {t('Storage Request')}
                </p>

                <h2>
                  {t('Review Request')}
                </h2>

              </div>

              <button
                type="button"
                className="admin-storage-modal-close"
                onClick={
                  closeReview
                }
                disabled={
                  Boolean(
                    actionLoading,
                  )
                }
              >
                ×
              </button>

            </div>

            <div className="admin-storage-modal-body">

              <div className="admin-storage-review-highlight">

                <div className="admin-storage-review-icon">

                  <Warehouse
                    size={22}
                  />

                </div>

                <div>

                  <strong>
                    {
                      selectedRequest
                        .crop
                    }
                    {' '}
                    {t('storage')}
                  </strong>

                  <span>
                    {
                      selectedRequest
                        .storageFacility
                        ?.name
                    }
                  </span>

                </div>

              </div>

              <div className="admin-storage-review-grid">

                <div>

                  <span>
                    {t('Farmer')}
                  </span>

                  <strong>
                    {
                      selectedRequest
                        .farmer
                        ?.name ||
                      '—'
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    {t('Quantity')}
                  </span>

                  <strong>
                    {
                      selectedRequest
                        .quantity
                    }{' '}
                    {
                      selectedRequest
                        .unit
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    {t('Start Date')}
                  </span>

                  <strong>
                    {
                      formatDate(
                        selectedRequest
                          .startDate,
                      )
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    {t('Duration')}
                  </span>

                  <strong>
                    {
                      selectedRequest
                        .durationMonths
                    }{' '}
                    {t('month')}
                    {
                      selectedRequest
                        .durationMonths !==
                      1
                        ? 's'
                        : ''
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    {t('Monthly Cost')}
                  </span>

                  <strong>
                    {
                      formatCurrency(
                        selectedRequest
                          .estimatedMonthlyCost,
                      )
                    }
                  </strong>

                </div>

                <div>

                  <span>
                    {t('Total Cost')}
                  </span>

                  <strong>
                    {
                      formatCurrency(
                        selectedRequest
                          .estimatedTotalCost,
                      )
                    }
                  </strong>

                </div>

              </div>

              {selectedRequest.notes && (
                <div className="admin-storage-modal-note">

                  <span>
                    {t('Farmer Note')}
                  </span>

                  <p>
                    {
                      selectedRequest.notes
                    }
                  </p>

                </div>
              )}

              <div className="admin-storage-admin-note">

                <label htmlFor="admin-note">
                  {t('Admin Note')}
                </label>

                <textarea
                  id="admin-note"
                  value={
                    adminNote
                  }
                  onChange={(
                    event,
                  ) =>
                    setAdminNote(
                      event.target
                        .value,
                    )
                  }
                  placeholder={t('Add a note for the farmer...')}
                  rows={4}
                  maxLength={500}
                  disabled={
                    Boolean(
                      actionLoading,
                    )
                  }
                />

                <small>
                  {
                    adminNote.length
                  }
                  /500
                </small>

              </div>

            </div>

            <div className="admin-storage-modal-footer">

              <button
                type="button"
                className="admin-storage-cancel-button"
                onClick={
                  closeReview
                }
                disabled={
                  Boolean(
                    actionLoading,
                  )
                }
              >
                {t('Close')}
              </button>

              {selectedRequest.status ===
                'pending' && (
                <>
                  <button
                    type="button"
                    className="admin-storage-reject-button"
                    onClick={() =>
                      updateRequestStatus(
                        selectedRequest,
                        'rejected',
                      )
                    }
                    disabled={
                      Boolean(
                        actionLoading,
                      )
                    }
                  >

                    {actionLoading ===
                    `${selectedRequest._id}-rejected` ? (
                      <RefreshCw
                        size={16}
                        className="admin-storage-spin"
                      />
                    ) : (
                      <XCircle
                        size={16}
                      />
                    )}

                    {t('Reject')}

                  </button>

                  <button
                    type="button"
                    className="admin-storage-approve-button"
                    onClick={() =>
                      updateRequestStatus(
                        selectedRequest,
                        'approved',
                      )
                    }
                    disabled={
                      Boolean(
                        actionLoading,
                      )
                    }
                  >

                    {actionLoading ===
                    `${selectedRequest._id}-approved` ? (
                      <RefreshCw
                        size={16}
                        className="admin-storage-spin"
                      />
                    ) : (
                      <CheckCircle2
                        size={16}
                      />
                    )}

                    {t('Approve')}

                  </button>
                </>
              )}

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default AdminStorageRequests;