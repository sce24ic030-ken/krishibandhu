import React, { useState } from 'react';
import {
  ChevronRight,
  Leaf,
  Loader2,
  ShieldCheck,
  Sprout,
  Store,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import './Login.css';

// ==========================================
// ROLE LOGIN — one-tap demo accounts
// ==========================================

const ROLE_ACCOUNTS = [
  {
    role: 'admin',
    icon: ShieldCheck,
    title: 'Admin',
    description: 'Manage markets, users & platform control',
    email: 'admin@krishibandhu.com',
    password: 'Admin123',
  },
  {
    role: 'trader',
    icon: Store,
    title: 'Trader',
    description: 'Place bids, manage logistics & trading',
    email: 'trader@krishibandhu.com',
    password: 'Trader123',
  },
  {
    role: 'farmer',
    icon: Sprout,
    title: 'Farmer',
    description: 'Crops, markets, parchi & farm tools',
    email: 'farmer@krishibandhu.com',
    password: 'Farmer123',
  },
];

const Login = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  const { t } = useLanguage();

  const [loadingRole, setLoadingRole] =
    useState('');

  const [error, setError] = useState('');

  const handleRoleLogin = async (account) => {
    setError('');

    try {
      setLoadingRole(account.role);

      const data = await login(
        account.email,
        account.password,
      );

      if (!data.success) {
        throw new Error(
          t(data.message) ||
            t('Login failed.'),
        );
      }

      const role = data.user?.role;

      if (role === 'admin') {
        navigate('/admin');
      } else if (
        role === 'trader'
      ) {
        navigate('/trader');
      } else {
        navigate('/dashboard');
      }
    } catch (loginError) {
      setError(
        t(loginError.message) ||
          t(
            'Unable to login. Please try again.',
          ),
      );
    } finally {
      setLoadingRole('');
    }
  };

  return (
    <div className="login-page">
      <div className="login-background-shape login-shape-one" />
      <div className="login-background-shape login-shape-two" />

      <div className="login-container">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-brand-icon">
            <Leaf size={26} strokeWidth={2.2} />
          </div>

          <div>
            <h1>KrishiBandhu</h1>
            <p>
              {t('Smart farming platform')}
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <div className="login-header">
            <h2>
              {t('Welcome back 👋')}
            </h2>

            <p>
              {t(
                'Choose your role to login.',
              )}
            </p>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div className="login-roles">
            {ROLE_ACCOUNTS.map(
              (account) => {
                const Icon =
                  account.icon;

                const isActive =
                  loadingRole ===
                  account.role;

                const isDisabled =
                  loadingRole !== '';

                return (
                  <button
                    type="button"
                    key={account.role}
                    className={`login-role login-role--${account.role}`}
                    onClick={() =>
                      handleRoleLogin(
                        account,
                      )
                    }
                    disabled={isDisabled}
                  >
                    <span className="login-role-icon">
                      <Icon
                        size={22}
                        strokeWidth={2.1}
                      />
                    </span>

                    <span className="login-role-body">
                      <span className="login-role-title">
                        {t(
                          account.title,
                        )}
                      </span>

                      <span className="login-role-desc">
                        {t(
                          account.description,
                        )}
                      </span>
                    </span>

                    <span className="login-role-action">
                      {isActive ? (
                        <Loader2
                          size={19}
                          className="login-role-spinner"
                        />
                      ) : (
                        <ChevronRight
                          size={19}
                        />
                      )}
                    </span>
                  </button>
                );
              },
            )}
          </div>

          <p className="login-footer">
            © {new Date().getFullYear()}{' '}
            KrishiBandhu
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;