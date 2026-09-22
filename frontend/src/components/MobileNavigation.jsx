import {
  LayoutDashboard,
  Sprout,
  TrendingUp,
  ReceiptText,
  Warehouse,
  UserCircle,
} from 'lucide-react';

import { NavLink } from 'react-router-dom';

import { useLanguage } from '../context/LanguageContext';

import './MobileNavigation.css';

const items = [
  {
    label: 'Home',
    icon: LayoutDashboard,
    path: '/dashboard',
  },
  {
    label: 'Crops',
    icon: Sprout,
    path: '/crops',
  },
  {
    label: 'Market',
    icon: TrendingUp,
    path: '/market',
  },
  {
    label: 'Parchi',
    icon: ReceiptText,
    path: '/parchi',
  },
  {
    label: 'Storage',
    icon: Warehouse,
    path: '/storage',
  },
  {
    label: 'Profile',
    icon: UserCircle,
    path: '/settings',
  },
];

function MobileNavigation() {
  const { t } = useLanguage();

  return (
    <nav className="mobile-navigation">

      {items.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.label}
            to={item.path}
            className={({ isActive }) =>
              `mobile-nav-item ${
                isActive ? 'active' : ''
              }`
            }
          >
            <Icon size={20} />

            <span>
              {t(item.label)}
            </span>
          </NavLink>
        );
      })}

    </nav>
  );
}

export default MobileNavigation;