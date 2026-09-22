import React, { useState } from 'react';
import { Eye, EyeOff, Leaf, Lock, Mail } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import './Login.css';

const Login = () => {
  const navigate = useNavigate();

  const { login } = useAuth();

  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');

    if (!formData.email || !formData.password) {
      setError(t('Please enter your email and password.'));
      return;
    }

    try {
      setLoading(true);

      const data = await login(
        formData.email,
        formData.password,
      );

      if (!data.success) {
        throw new Error(
          t(data.message) || t('Login failed.'),
        );
      }

      const role = data.user?.role;

      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'trader') {
        navigate('/trader');
      } else {
        navigate('/dashboard');
      }
    } catch (loginError) {
      setError(
        t(loginError.message) ||
          t('Unable to login. Please try again.'),
      );
    } finally {
      setLoading(false);
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
            <p>{t('Smart farming platform')}</p>
          </div>
        </div>

        {/* Login Card */}
        <div className="login-card">
          <div className="login-header">
            <h2>{t('Welcome back 👋')}</h2>

            <p>
              {t('Login to continue to your KrishiBandhu account.')}
            </p>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form
            className="login-form"
            onSubmit={handleSubmit}
          >
            {/* Email */}
            <div className="login-field">
              <label htmlFor="email">
                {t('Email address')}
              </label>

              <div className="login-input-wrapper">
                <Mail size={19} />

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('Enter your email')}
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password */}
            <div className="login-field">
              <label htmlFor="password">
                {t('Password')}
              </label>

              <div className="login-input-wrapper">
                <Lock size={19} />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  placeholder={t('Enter your password')}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous,
                    )
                  }
                  aria-label={
                    showPassword
                      ? t('Hide password')
                      : t('Show password')
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="login-submit"
              disabled={loading}
            >
              {loading ? (
                <span>{t('Logging in...')}</span>
              ) : (
                <span>{t('Login')}</span>
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>{t('OR')}</span>
          </div>

          <div className="login-register">
            <span>
              {t("Don't have an account?")}
            </span>

            <Link to="/register">
              {t('Create an account')}
            </Link>
          </div>
        </div>

        <p className="login-footer">
          © {new Date().getFullYear()} KrishiBandhu
        </p>
      </div>
    </div>
  );
};

export default Login;