import {
  Bell,
  Leaf,
  UserCircle,
  LogOut,
  Languages,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

import './Navbar.css';

function Navbar() {
  const {
    user,
    logout,
  } = useAuth();

  const {
    lang,
    setLang,
    t,
  } = useLanguage();

  const userName = user?.name || t('User');

  const userRole =
    user?.role === 'trader'
      ? t('Trader')
      : user?.role === 'admin'
        ? t('Admin')
        : t('Farmer');

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">

        <div className="brand">

          <div className="brand-icon">
            <Leaf
              size={21}
              strokeWidth={2}
            />
          </div>

          <div className="brand-text">
            <h1>
              KrishiBandhu
            </h1>

            <span>
              {t('Smart farming platform')}
            </span>
          </div>

        </div>

        <div className="navbar-actions">

          <div
            className="lang-switch"
            title={t('Choose language')}
          >
            <Languages size={16} />

            {['en', 'mr', 'hi'].map((code) => (
              <button
                key={code}
                type="button"
                className={
                  lang === code ? 'active' : ''
                }
                onClick={() => setLang(code)}
                aria-label={`Language ${code}`}
              >
                {code === 'en'
                  ? 'EN'
                  : code === 'mr'
                    ? 'मराठी'
                    : 'हिंदी'}
              </button>
            ))}
          </div>

          <button
            className="icon-button"
            aria-label={t('Notifications')}
            type="button"
          >
            <Bell size={20} />
          </button>

          <div className="profile-wrapper">

            <div className="profile-button">

              <UserCircle size={22} />

              <div className="profile-info">
                <span className="profile-name">
                  {userName}
                </span>

                <span className="profile-role">
                  {userRole}
                </span>
              </div>

            </div>

            <button
              type="button"
              className="logout-button"
              onClick={handleLogout}
            >
              <LogOut size={17} />

              <span>
                {t('Logout')}
              </span>
            </button>

          </div>

        </div>

      </div>
    </header>
  );
}

export default Navbar;