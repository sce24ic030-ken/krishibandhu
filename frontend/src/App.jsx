import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import { useAuth } from './context/AuthContext';

import { useLanguage } from './context/LanguageContext';

import MainLayout from './layouts/MainLayout';

import Dashboard from './pages/Dashboard';
import Crops from './pages/Crops';
import Market from './pages/Market';
import Bids from './pages/Bids';
import Weather from './pages/Weather';
import AIAssistant from './pages/AIAssistant';
import Passbook from './pages/Passbook';
import Parchi from './pages/Parchi';
import Storage from './pages/Storage';
import Settings from './pages/Settings';
import Alerts from './pages/Alerts';
import NetRealization from './pages/NetRealization';
import CreditScore from './pages/CreditScore';
import Backhaul from './pages/Backhaul';
import TraderBackhaul from './pages/TraderBackhaul';

import Login from './pages/Login';
import Register from './pages/Register';

import TraderDashboard from './pages/TraderDashboard';

import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminMarkets from './pages/AdminMarkets';
import AdminCrops from './pages/AdminCrops';
import AdminStorageRequests from './pages/AdminStorageRequests';
import AdminBids from './pages/AdminBids';
import AdminParchi from './pages/AdminParchi';
import AdminTransactions from './pages/AdminTransactions';
import AdminPayments from './pages/AdminPayments';
import AdminBackhaul from './pages/AdminBackhaul';

const AuthLoading = () => {
  const { t } = useLanguage();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f8f5',
        color: '#237651',
        fontSize: '15px',
        fontWeight: '600',
      }}
    >
      {t('Loading KrishiBandhu...')}
    </div>
  );
};

/* -------------------------------- */
/* Authentication Protection        */
/* -------------------------------- */

const ProtectedRoute = ({
  children,
}) => {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
};

/* -------------------------------- */
/* Role Protection                  */
/* -------------------------------- */

const RoleRoute = ({
  allowedRoles,
  children,
}) => {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (
    !user ||
    !allowedRoles.includes(
      user.role,
    )
  ) {
    if (user?.role === 'trader') {
      return (
        <Navigate
          to="/trader"
          replace
        />
      );
    }

    if (user?.role === 'admin') {
      return (
        <Navigate
          to="/admin"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
};

/* -------------------------------- */
/* Public Route                     */
/* -------------------------------- */

const PublicRoute = ({
  children,
}) => {
  const {
    isAuthenticated,
    loading,
    user,
  } = useAuth();

  if (loading) {
    return <AuthLoading />;
  }

  if (isAuthenticated) {
    if (user?.role === 'trader') {
      return (
        <Navigate
          to="/trader"
          replace
        />
      );
    }

    if (user?.role === 'admin') {
      return (
        <Navigate
          to="/admin"
          replace
        />
      );
    }

    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return children;
};

/* -------------------------------- */
/* Role Redirect                    */
/* -------------------------------- */

const RoleRedirect = () => {
  const { user } = useAuth();

  if (user?.role === 'trader') {
    return (
      <Navigate
        to="/trader"
        replace
      />
    );
  }

  if (user?.role === 'admin') {
    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  }

  return (
    <Navigate
      to="/dashboard"
      replace
    />
  );
};

/* -------------------------------- */
/* Application                      */
/* -------------------------------- */

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ============================== */}
        {/* PUBLIC ROUTES                  */}
        {/* ============================== */}

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />

        {/* ============================== */}
        {/* FARMER DASHBOARD               */}
        {/* ============================== */}

        <Route
          path="/dashboard"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
              ]}
            >
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/alerts"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
              ]}
            >
              <MainLayout>
                <Alerts />
              </MainLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/net-realization"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
              ]}
            >
              <MainLayout>
                <NetRealization />
              </MainLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/credit-score"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
              ]}
            >
              <MainLayout>
                <CreditScore />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* FARMER FEATURES                */}
        {/* ============================== */}

        <Route
          path="/crops"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
              ]}
            >
              <MainLayout>
                <Crops />
              </MainLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/market"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Market />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/bids"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
              ]}
            >
              <MainLayout>
                <Bids />
              </MainLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/weather"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
              ]}
            >
              <MainLayout>
                <Weather />
              </MainLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/ai-assistant"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
                'trader',
                'admin',
              ]}
            >
              <MainLayout>
                <AIAssistant />
              </MainLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/passbook"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Passbook />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================== */}
        {/* PARCHI                         */}
        {/* ============================== */}

        <Route
          path="/parchi"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Parchi />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================== */}
        {/* FARMER BACKHAUL                */}
        {/* ============================== */}

        <Route
          path="/backhaul"
          element={
            <RoleRoute
              allowedRoles={[
                'farmer',
              ]}
            >
              <MainLayout>
                <Backhaul />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* STORAGE & WAREHOUSES           */}
        {/* ============================== */}

        <Route
          path="/storage"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Storage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================== */}
        {/* SETTINGS                       */}
        {/* ============================== */}

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ============================== */}
        {/* TRADER DASHBOARD               */}
        {/* ============================== */}

        <Route
          path="/trader"
          element={
            <RoleRoute
              allowedRoles={[
                'trader',
              ]}
            >
              <MainLayout>
                <TraderDashboard />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* TRADER BACKHAUL                */}
        {/* ============================== */}

        <Route
          path="/trader/backhaul"
          element={
            <RoleRoute
              allowedRoles={[
                'trader',
              ]}
            >
              <MainLayout>
                <TraderBackhaul />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN DASHBOARD                */}
        {/* ============================== */}

        <Route
          path="/admin"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminDashboard />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN USERS                    */}
        {/* ============================== */}

        <Route
          path="/admin/users"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminUsers />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN MARKETS                  */}
        {/* ============================== */}

        <Route
          path="/admin/markets"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminMarkets />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN CROPS                    */}
        {/* ============================== */}

        <Route
          path="/admin/crops"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminCrops />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN STORAGE REQUESTS         */}
        {/* ============================== */}

        <Route
          path="/admin/storage-requests"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminStorageRequests />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN BIDS                     */}
        {/* ============================== */}

        <Route
          path="/admin/bids"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminBids />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN PARCHI                   */}
        {/* ============================== */}

        <Route
          path="/admin/parchi"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminParchi />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN TRANSACTIONS             */}
        {/* ============================== */}

        <Route
          path="/admin/transactions"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminTransactions />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN PAYMENTS                 */}
        {/* ============================== */}

        <Route
          path="/admin/payments"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminPayments />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ADMIN BACKHAUL                 */}
        {/* ============================== */}

        <Route
          path="/admin/backhaul"
          element={
            <RoleRoute
              allowedRoles={[
                'admin',
              ]}
            >
              <MainLayout>
                <AdminBackhaul />
              </MainLayout>
            </RoleRoute>
          }
        />

        {/* ============================== */}
        {/* ROOT                           */}
        {/* ============================== */}

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleRedirect />
            </ProtectedRoute>
          }
        />

        {/* ============================== */}
        {/* UNKNOWN ROUTES                 */}
        {/* ============================== */}

        <Route
          path="*"
          element={
            <ProtectedRoute>
              <RoleRedirect />
            </ProtectedRoute>
          }
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;