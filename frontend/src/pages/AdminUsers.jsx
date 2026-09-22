import {
  Search,
  Users,
  UserRound,
  Sprout,
  BriefcaseBusiness,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  MapPin,
  Mail,
  Phone,
  ShieldAlert,
  Save,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import API_URL from '../config/api';

import './AdminUsers.css';

const API_BASE_URL = API_URL;

function AdminUsers() {
  const { t } = useLanguage();

  const {
    token,
    user: currentUser,
  } = useAuth();

  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [search, setSearch] =
    useState('');

  const [roleFilter, setRoleFilter] =
    useState('all');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [updatingUserId, setUpdatingUserId] =
    useState(null);

  const [selectedRoles, setSelectedRoles] =
    useState({});

  /*
  |--------------------------------------------------------------------------
  | Fetch Users
  |--------------------------------------------------------------------------
  */

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');

      const params =
        new URLSearchParams();

      if (roleFilter !== 'all') {
        params.set(
          'role',
          roleFilter,
        );
      }

      if (statusFilter !== 'all') {
        params.set(
          'status',
          statusFilter,
        );
      }

      if (search.trim()) {
        params.set(
          'search',
          search.trim(),
        );
      }

      const queryString =
        params.toString();

      const url = queryString
        ? `${API_BASE_URL}/admin/users?${queryString}`
        : `${API_BASE_URL}/admin/users`;

      const response =
        await fetch(url, {
          method: 'GET',
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Unable to fetch users.'),
        );
      }

      setUsers(
        data.users || [],
      );

      /*
      |--------------------------------------------------------------------------
      | Initialize role selectors
      |--------------------------------------------------------------------------
      */

      const roles = {};

      (data.users || []).forEach(
        (item) => {
          roles[item._id] =
            item.role;
        },
      );

      setSelectedRoles(roles);
    } catch (err) {
      console.error(
        'Admin Users Error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to load users.'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [
    token,
    roleFilter,
    statusFilter,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const handleSearch = (
    event,
  ) => {
    event.preventDefault();

    fetchUsers();
  };

  /*
  |--------------------------------------------------------------------------
  | Change Selected Role
  |--------------------------------------------------------------------------
  */

  const handleRoleSelection = (
    userId,
    role,
  ) => {
    setSelectedRoles(
      (previous) => ({
        ...previous,
        [userId]: role,
      }),
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Update User Role
  |--------------------------------------------------------------------------
  */

  const updateUserRole = async (
    selectedUser,
  ) => {
    const selectedRole =
      selectedRoles[
        selectedUser._id
      ];

    if (
      !selectedRole ||
      selectedRole ===
        selectedUser.role
    ) {
      return;
    }

    if (
      selectedUser.role ===
      'admin'
    ) {
      return;
    }

    try {
      setUpdatingUserId(
        selectedUser._id,
      );

      setError('');

      const response =
        await fetch(
          `${API_BASE_URL}/admin/users/${selectedUser._id}/role`,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              role: selectedRole,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Unable to update user role.'),
        );
      }

      setUsers(
        (previousUsers) =>
          previousUsers.map(
            (item) =>
              item._id ===
              selectedUser._id
                ? {
                    ...item,
                    role:
                      data.user.role,
                    isVerified:
                      data.user
                        .isVerified,
                  }
                : item,
          ),
      );

      setSelectedRoles(
        (previous) => ({
          ...previous,
          [selectedUser._id]:
            data.user.role,
        }),
      );
    } catch (err) {
      console.error(
        'Update User Role Error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to update user role.'),
      );

      /*
      |--------------------------------------------------------------------------
      | Restore original role in selector
      |--------------------------------------------------------------------------
      */

      setSelectedRoles(
        (previous) => ({
          ...previous,
          [selectedUser._id]:
            selectedUser.role,
        }),
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Update User Status
  |--------------------------------------------------------------------------
  */

  const updateStatus = async (
    selectedUser,
    isActive,
  ) => {
    if (
      selectedUser._id ===
      currentUser?.id
    ) {
      return;
    }

    try {
      setUpdatingUserId(
        selectedUser._id,
      );

      setError('');

      const response =
        await fetch(
          `${API_BASE_URL}/admin/users/${selectedUser._id}/status`,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              isActive,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            t('Unable to update user status.'),
        );
      }

      setUsers(
        (previousUsers) =>
          previousUsers.map(
            (item) =>
              item._id ===
              selectedUser._id
                ? {
                    ...item,
                    isActive:
                      data.user
                        .isActive,
                  }
                : item,
          ),
      );
    } catch (err) {
      console.error(
        'Update User Status Error:',
        err,
      );

      setError(
        err.message ||
          t('Unable to update user status.'),
      );
    } finally {
      setUpdatingUserId(null);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Update Verification
  |--------------------------------------------------------------------------
  */

  const updateVerification =
    async (
      selectedUser,
      isVerified,
    ) => {
      try {
        setUpdatingUserId(
          selectedUser._id,
        );

        setError('');

        const response =
          await fetch(
            `${API_BASE_URL}/admin/users/${selectedUser._id}/verification`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',

                Authorization:
                  `Bearer ${token}`,
              },

              body: JSON.stringify({
                isVerified,
              }),
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              t('Unable to update verification.'),
          );
        }

        setUsers(
          (previousUsers) =>
            previousUsers.map(
              (item) =>
                item._id ===
                selectedUser._id
                  ? {
                      ...item,
                      isVerified:
                        data.user
                          .isVerified,
                    }
                  : item,
            ),
        );
      } catch (err) {
        console.error(
          'Verification Error:',
          err,
        );

        setError(
          err.message ||
            t('Unable to update verification.'),
        );
      } finally {
        setUpdatingUserId(null);
      }
    };

  /*
  |--------------------------------------------------------------------------
  | Role Icon
  |--------------------------------------------------------------------------
  */

  const getRoleIcon = (
    role,
  ) => {
    if (role === 'farmer') {
      return (
        <Sprout size={16} />
      );
    }

    if (role === 'trader') {
      return (
        <BriefcaseBusiness
          size={16}
        />
      );
    }

    return (
      <ShieldCheck size={16} />
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Role Label
  |--------------------------------------------------------------------------
  */

  const getRoleLabel = (
    role,
  ) => {
    if (role === 'farmer') {
      return t('Farmer');
    }

    if (role === 'trader') {
      return t('Trader');
    }

    return t('Admin');
  };

  /*
  |--------------------------------------------------------------------------
  | Date
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

  return (
    <div className="admin-users">

      {/* ================================= */}
      {/* Header                            */}
      {/* ================================= */}

      <div className="admin-users-header">

        <div>

          <p className="admin-users-label">
            {t('Administration')}
          </p>

          <h1>
            {t('User Management')}
          </h1>

          <p>
            {t('View and manage Farmer, Trader and Admin accounts.')}
          </p>

        </div>

        <div className="admin-users-count">

          <Users size={21} />

          <div>

            <strong>
              {users.length}
            </strong>

            <span>
              {t('Users shown')}
            </span>

          </div>

        </div>

      </div>

      {/* ================================= */}
      {/* Error                             */}
      {/* ================================= */}

      {error && (
        <div className="admin-users-error">

          <div>

            <ShieldAlert
              size={18}
            />

            <span>
              {error}
            </span>

          </div>

          <button
            type="button"
            onClick={fetchUsers}
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

      <section className="admin-users-filter-card">

        <form
          className="admin-users-search"
          onSubmit={
            handleSearch
          }
        >

          <Search size={18} />

          <input
            type="text"
            value={search}
            onChange={(
              event,
            ) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder={t('Search by name, email or phone...')}
          />

          <button type="submit">
            {t('Search')}
          </button>

        </form>

        <div className="admin-users-filters">

          <div className="admin-filter-group">

            <label>
              {t('Role')}
            </label>

            <select
              value={roleFilter}
              onChange={(
                event,
              ) =>
                setRoleFilter(
                  event.target.value,
                )
              }
            >

              <option value="all">
                {t('All Roles')}
              </option>

              <option value="farmer">
                {t('Farmers')}
              </option>

              <option value="trader">
                {t('Traders')}
              </option>

              <option value="admin">
                {t('Admins')}
              </option>

            </select>

          </div>

          <div className="admin-filter-group">

            <label>
              {t('Status')}
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

              <option value="active">
                {t('Active')}
              </option>

              <option value="inactive">
                {t('Inactive')}
              </option>

            </select>

          </div>

          <button
            type="button"
            className="admin-refresh-button"
            onClick={
              fetchUsers
            }
            disabled={
              loading
            }
          >

            <RefreshCw
              size={16}
              className={
                loading
                  ? 'admin-spin'
                  : ''
              }
            />

            {t('Refresh')}

          </button>

        </div>

      </section>

      {/* ================================= */}
      {/* Users Table                       */}
      {/* ================================= */}

      <section className="admin-users-table-card">

        <div className="admin-users-table-header">

          <div>

            <h2>
              {t('Platform Users')}
            </h2>

            <p>
              {t('Passwords and sensitive credentials are never displayed.')}
            </p>

          </div>

          <UserRound size={21} />

        </div>

        {loading ? (
          <div className="admin-users-loading">

            <RefreshCw
              size={25}
              className="admin-spin"
            />

            <p>
              {t('Loading users...')}
            </p>

          </div>
        ) : users.length === 0 ? (
          <div className="admin-users-empty">

            <Users size={30} />

            <h3>
              {t('No users found')}
            </h3>

            <p>
              {t('Try changing your search or filters.')}
            </p>

          </div>
        ) : (
          <div className="admin-users-table-wrapper">

            <table className="admin-users-table">

              <thead>

                <tr>

                  <th>
                    {t('User')}
                  </th>

                  <th>
                    {t('Role')}
                  </th>

                  <th>
                    {t('Contact')}
                  </th>

                  <th>
                    {t('Location')}
                  </th>

                  <th>
                    {t('Status')}
                  </th>

                  <th>
                    {t('Verification')}
                  </th>

                  <th>
                    {t('Joined')}
                  </th>

                  <th>
                    {t('Actions')}
                  </th>

                </tr>

              </thead>

              <tbody>

                {users.map(
                  (item) => {
                    const isCurrentUser =
                      item._id ===
                      currentUser?.id;

                    const isUpdating =
                      updatingUserId ===
                      item._id;

                    const selectedRole =
                      selectedRoles[
                        item._id
                      ] ||
                      item.role;

                    const roleChanged =
                      selectedRole !==
                      item.role;

                    return (
                      <tr
                        key={
                          item._id
                        }
                      >

                        {/* ================= */}
                        {/* User              */}
                        {/* ================= */}

                        <td>

                          <div className="admin-user-cell">

                            <div className="admin-user-avatar">

                              <UserRound
                                size={18}
                              />

                            </div>

                            <div>

                              <strong>
                                {
                                  item.name
                                }
                              </strong>

                              {isCurrentUser && (
                                <span className="admin-you-badge">
                                  {t('You')}
                                </span>
                              )}

                            </div>

                          </div>

                        </td>

                        {/* ================= */}
                        {/* Role              */}
                        {/* ================= */}

                        <td>

                          {item.role ===
                          'admin' ? (
                            <span
                              className={`admin-role-badge ${item.role}`}
                            >

                              {getRoleIcon(
                                item.role,
                              )}

                              {getRoleLabel(
                                item.role,
                              )}

                            </span>
                          ) : (
                            <div className="admin-role-editor">

                              <select
                                value={
                                  selectedRole
                                }
                                onChange={(
                                  event,
                                ) =>
                                  handleRoleSelection(
                                    item._id,
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                disabled={
                                  isUpdating
                                }
                              >

                                <option value="farmer">
                                  {t('Farmer')}
                                </option>

                                <option value="trader">
                                  {t('Trader')}
                                </option>

                              </select>

                              {roleChanged && (
                                <button
                                  type="button"
                                  className="admin-save-role-button"
                                  disabled={
                                    isUpdating
                                  }
                                  onClick={() =>
                                    updateUserRole(
                                      item,
                                    )
                                  }
                                  title={t('Save role')}
                                >

                                  {isUpdating ? (
                                    <RefreshCw
                                      size={14}
                                      className="admin-spin"
                                    />
                                  ) : (
                                    <Save
                                      size={14}
                                    />
                                  )}

                                </button>
                              )}

                            </div>
                          )}

                        </td>

                        {/* ================= */}
                        {/* Contact           */}
                        {/* ================= */}

                        <td>

                          <div className="admin-contact-cell">

                            <span>

                              <Mail
                                size={13}
                              />

                              {
                                item.email
                              }

                            </span>

                            <span>

                              <Phone
                                size={13}
                              />

                              {
                                item.phone
                              }

                            </span>

                          </div>

                        </td>

                        {/* ================= */}
                        {/* Location           */}
                        {/* ================= */}

                        <td>

                          <div className="admin-location-cell">

                            <MapPin
                              size={14}
                            />

                            <span>

                              {
                                item
                                  .location
                                  ?.city ||
                                '-'
                              }

                              {item
                                .location
                                ?.state
                                ? `, ${item.location.state}`
                                : ''}

                            </span>

                          </div>

                        </td>

                        {/* ================= */}
                        {/* Status             */}
                        {/* ================= */}

                        <td>

                          <span
                            className={
                              item.isActive
                                ? 'admin-status-badge active'
                                : 'admin-status-badge inactive'
                            }
                          >

                            {item.isActive ? (
                              <>
                                <CheckCircle2
                                  size={14}
                                />

                                {t('Active')}
                              </>
                            ) : (
                              <>
                                <XCircle
                                  size={14}
                                />

                                {t('Inactive')}
                              </>
                            )}

                          </span>

                        </td>

                        {/* ================= */}
                        {/* Verification       */}
                        {/* ================= */}

                        <td>

                          {item.isVerified ? (
                            <span className="admin-verified-badge">

                              <CheckCircle2
                                size={14}
                              />

                              {t('Verified')}

                            </span>
                          ) : (
                            <span className="admin-unverified-badge">

                              <XCircle
                                size={14}
                              />

                              {t('Not verified')}

                            </span>
                          )}

                        </td>

                        {/* ================= */}
                        {/* Joined             */}
                        {/* ================= */}

                        <td>

                          <span className="admin-date">

                            {formatDate(
                              item.createdAt,
                            )}

                          </span>

                        </td>

                        {/* ================= */}
                        {/* Actions            */}
                        {/* ================= */}

                        <td>

                          <div className="admin-user-actions">

                            {!isCurrentUser && (
                              <button
                                type="button"
                                className={
                                  item.isActive
                                    ? 'admin-action-button deactivate'
                                    : 'admin-action-button activate'
                                }
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  updateStatus(
                                    item,
                                    !item.isActive,
                                  )
                                }
                              >

                                {isUpdating ? (
                                  <RefreshCw
                                    size={14}
                                    className="admin-spin"
                                  />
                                ) : item.isActive ? (
                                  t('Deactivate')
                                ) : (
                                  t('Activate')
                                )}

                              </button>
                            )}

                            {item.role ===
                              'trader' && (
                              <button
                                type="button"
                                className="admin-action-button verify"
                                disabled={
                                  isUpdating
                                }
                                onClick={() =>
                                  updateVerification(
                                    item,
                                    !item.isVerified,
                                  )
                                }
                              >

                                {item.isVerified
                                  ? t('Unverify')
                                  : t('Verify')}

                              </button>
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

export default AdminUsers;