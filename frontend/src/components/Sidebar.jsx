import {
  LayoutDashboard,
  Sprout,
  Store,
  Gavel,
  CloudSun,
  Bot,
  WalletCards,
  FileText,
  Warehouse,
  Settings,
  Users,
  Truck,
  CreditCard,
} from 'lucide-react';

import {
  NavLink,
} from 'react-router-dom';

import {
  useAuth,
} from '../context/AuthContext';

import {
  useLanguage,
} from '../context/LanguageContext';

import './Sidebar.css';

function Sidebar() {
  const {
    user,
  } = useAuth();

  const {
    t,
  } = useLanguage();

  const farmerMenu = [
    {
      label: t('Dashboard'),
      icon: LayoutDashboard,
      path: '/dashboard',
    },
    {
      label: t('Crops'),
      icon: Sprout,
      path: '/crops',
    },
    {
      label: t('Market'),
      icon: Store,
      path: '/market',
    },
    {
      label: t('Bids'),
      icon: Gavel,
      path: '/bids',
    },
    {
      label: t('Weather'),
      icon: CloudSun,
      path: '/weather',
    },
    {
      label: t('AI Assistant'),
      icon: Bot,
      path: '/ai-assistant',
    },
    {
      label: t('Passbook'),
      icon: WalletCards,
      path: '/passbook',
    },
    {
      label: t('Parchi'),
      icon: FileText,
      path: '/parchi',
    },
    {
      label: t('Backhaul'),
      icon: Truck,
      path: '/backhaul',
    },
    {
      label: t('Storage'),
      icon: Warehouse,
      path: '/storage',
    },
  ];

  const traderMenu = [
    {
      label: t('Dashboard'),
      icon: LayoutDashboard,
      path: '/trader',
    },
    {
      label: t('Market'),
      icon: Store,
      path: '/market',
    },
    {
      label: t('Bids'),
      icon: Gavel,
      path: '/bids',
    },
    {
      label: t('AI Assistant'),
      icon: Bot,
      path: '/ai-assistant',
    },
    {
      label: t('Parchi'),
      icon: FileText,
      path: '/parchi',
    },
    {
      label: t('Backhaul'),
      icon: Truck,
      path: '/trader/backhaul',
    },
    {
      label: t('Transactions'),
      icon: WalletCards,
      path: '/passbook',
    },
    {
      label: t('Payments'),
      icon: CreditCard,
      path: '/parchi',
    },
  ];

  const adminMenu = [
    {
      label: t('Dashboard'),
      icon: LayoutDashboard,
      path: '/admin',
    },
    {
      label: t('Users'),
      icon: Users,
      path: '/admin/users',
    },
    {
      label: t('Markets'),
      icon: Store,
      path: '/admin/markets',
    },
    {
      label: t('Crops'),
      icon: Sprout,
      path: '/admin/crops',
    },
    {
      label: t('Bids'),
      icon: Gavel,
      path: '/admin/bids',
    },
    {
      label: t('AI Assistant'),
      icon: Bot,
      path: '/ai-assistant',
    },
    {
      label: t('Parchi'),
      icon: FileText,
      path: '/admin/parchi',
    },
    {
      label: t('Backhaul'),
      icon: Truck,
      path: '/admin/backhaul',
    },
    {
      label: t('Storage'),
      icon: Warehouse,
      path: '/admin/storage-requests',
    },
    {
      label: t('Transactions'),
      icon: WalletCards,
      path: '/admin/transactions',
    },
    {
      label: t('Payments'),
      icon: CreditCard,
      path: '/admin/payments',
    },
  ];

  let menu = farmerMenu;

  if (user?.role === 'trader') {
    menu = traderMenu;
  }

  if (user?.role === 'admin') {
    menu = adminMenu;
  }

  return (
    <aside className="sidebar">

      <nav className="sidebar-nav">

        {menu.map(
          ({
            label,
            icon: Icon,
            path,
          }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive
                    ? 'active'
                    : ''
                }`
              }
            >

              <Icon
                size={19}
                strokeWidth={1.8}
              />

              <span>
                {label}
              </span>

            </NavLink>
          ),
        )}

      </nav>

      <div className="sidebar-bottom">

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `sidebar-link ${
              isActive
                ? 'active'
                : ''
            }`
          }
        >

          <Settings
            size={19}
            strokeWidth={1.8}
          />

          <span>
            {t('Settings')}
          </span>

        </NavLink>

      </div>

    </aside>
  );
}

export default Sidebar;