import React, { useState } from 'react';

import {
  Eye,
  EyeOff,
  Leaf,
  Lock,
  Mail,
  MapPin,
  Phone,
  User,
  Sprout,
  Store,
} from 'lucide-react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import { useLanguage } from '../context/LanguageContext';

import './Register.css';

const Register = () => {
  const navigate = useNavigate();

  const { register } = useAuth();

  const { t } = useLanguage();

  const [role, setRole] = useState('farmer');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    city: '',
    district: '',
    state: '',
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  // ==========================================
  // HANDLE INPUT
  // ==========================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================
  // HANDLE ROLE
  // ==========================================

  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setError('');
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');

    // Required fields
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.password
    ) {
      setError(
        t('Please fill in all required fields.'),
      );

      return;
    }

    // Password
    if (formData.password.length < 6) {
      setError(
        t('Password must contain at least 6 characters.'),
      );

      return;
    }

    // Phone
    const cleanPhone =
      formData.phone.replace(/\D/g, '');

    if (cleanPhone.length < 10) {
      setError(
        t('Please enter a valid phone number.'),
      );

      return;
    }

    try {
      setLoading(true);

      const data = await register({
        name: formData.name.trim(),

        email: formData.email
          .trim()
          .toLowerCase(),

        phone: cleanPhone,

        password: formData.password,

        role,

        location: {
          city: formData.city.trim(),
          district: formData.district.trim(),
          state: formData.state.trim(),
        },
      });

      if (!data.success) {
        throw new Error(
          t(data.message) ||
            t('Registration failed.'),
        );
      }

      // ======================================
      // REDIRECT BASED ON ROLE
      // ======================================

      if (data.user?.role === 'trader') {
        navigate('/trader', {
          replace: true,
        });
      } else {
        navigate('/dashboard', {
          replace: true,
        });
      }
    } catch (registrationError) {
      setError(
        t(registrationError.message) ||
          t('Unable to create your account.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      {/* ======================================
          BACKGROUND
      ====================================== */}

      <div className="register-background-shape register-shape-one" />

      <div className="register-background-shape register-shape-two" />

      <div className="register-container">

        {/* ====================================
            BRAND
        ==================================== */}

        <div className="register-brand">

          <div className="register-brand-icon">
            <Leaf
              size={26}
              strokeWidth={2.2}
            />
          </div>

          <div>
            <h1>
              KrishiBandhu
            </h1>

            <p>
              {t('Smart farming platform')}
            </p>
          </div>

        </div>

        {/* ====================================
            CARD
        ==================================== */}

        <div className="register-card">

          <div className="register-header">

            <h2>
              {t('Create your account 🌱')}
            </h2>

            <p>
              {t('Join KrishiBandhu and connect with the agricultural marketplace.')}
            </p>

          </div>

          {/* ==================================
              ERROR
          ================================== */}

          {error && (
            <div className="register-error">
              {error}
            </div>
          )}

          {/* ==================================
              ROLE
          ================================== */}

          <div className="role-section">

            <label className="role-label">
              {t('I am a...')}
            </label>

            <div className="role-options">

              {/* FARMER */}

              <button
                type="button"
                className={`role-option ${
                  role === 'farmer'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  handleRoleChange(
                    'farmer',
                  )
                }
              >

                <div className="role-icon">
                  <Sprout size={22} />
                </div>

                <div className="role-content">

                  <strong>
                    {t('Farmer')}
                  </strong>

                  <span>
                    {t('Sell crops and track agricultural transactions')}
                  </span>

                </div>

                <div className="role-radio">

                  {role === 'farmer' && (
                    <div />
                  )}

                </div>

              </button>

              {/* TRADER */}

              <button
                type="button"
                className={`role-option ${
                  role === 'trader'
                    ? 'active'
                    : ''
                }`}
                onClick={() =>
                  handleRoleChange(
                    'trader',
                  )
                }
              >

                <div className="role-icon">
                  <Store size={22} />
                </div>

                <div className="role-content">

                  <strong>
                    {t('Trader')}
                  </strong>

                  <span>
                    {t('Find crops, place bids and purchase produce')}
                  </span>

                </div>

                <div className="role-radio">

                  {role === 'trader' && (
                    <div />
                  )}

                </div>

              </button>

            </div>

          </div>

          {/* ==================================
              FORM
          ================================== */}

          <form
            className="register-form"
            onSubmit={handleSubmit}
          >

            {/* NAME */}

            <div className="register-field">

              <label htmlFor="name">
                {t('Full name')}
              </label>

              <div className="register-input-wrapper">

                <User size={18} />

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t('Enter your full name')}
                  value={formData.name}
                  onChange={handleChange}
                  autoComplete="name"
                />

              </div>

            </div>

            {/* EMAIL */}

            <div className="register-field">

              <label htmlFor="email">
                {t('Email address')}
              </label>

              <div className="register-input-wrapper">

                <Mail size={18} />

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

            {/* PHONE */}

            <div className="register-field">

              <label htmlFor="phone">
                {t('Phone number')}
              </label>

              <div className="register-input-wrapper">

                <Phone size={18} />

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  placeholder={t('Enter your phone number')}
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  maxLength="15"
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div className="register-field">

              <label htmlFor="password">
                {t('Password')}
              </label>

              <div className="register-input-wrapper">

                <Lock size={18} />

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  placeholder={t('Create a password')}
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous,
                    )
                  }
                  aria-label={
                    showPassword
                      ? t('Hide password')
                      : t('Show password')
                  }
                >

                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}

                </button>

              </div>

              <small>
                {t('Minimum 6 characters')}
              </small>

            </div>

            {/* =================================
                LOCATION
            ================================= */}

            <div className="location-heading">

              <MapPin size={17} />

              <span>
                {t('Location')}
              </span>

              <small>
                {t('Optional')}
              </small>

            </div>

            <div className="location-grid">

              {/* CITY */}

              <div className="register-field">

                <label htmlFor="city">
                  {t('City')}
                </label>

                <input
                  className="location-input"
                  id="city"
                  name="city"
                  type="text"
                  placeholder={t('City')}
                  value={formData.city}
                  onChange={handleChange}
                />

              </div>

              {/* DISTRICT */}

              <div className="register-field">

                <label htmlFor="district">
                  {t('District')}
                </label>

                <input
                  className="location-input"
                  id="district"
                  name="district"
                  type="text"
                  placeholder={t('District')}
                  value={formData.district}
                  onChange={handleChange}
                />

              </div>

            </div>

            {/* STATE */}

            <div className="register-field">

              <label htmlFor="state">
                {t('State')}
              </label>

              <input
                className="location-input"
                id="state"
                name="state"
                type="text"
                placeholder={t('State')}
                value={formData.state}
                onChange={handleChange}
              />

            </div>

            {/* =================================
                SUBMIT
            ================================= */}

            <button
              type="submit"
              className="register-submit"
              disabled={loading}
            >
              {loading
                ? t('Creating account...')
                : t('Create Account')}
            </button>

          </form>

          {/* ==================================
              LOGIN
          ================================== */}

          <div className="register-login">

            <span>
              {t('Already have an account?')}
            </span>

            <Link to="/login">
              {t('Login')}
            </Link>

          </div>

        </div>

        {/* FOOTER */}

        <p className="register-footer">
          © {new Date().getFullYear()}{' '}
          KrishiBandhu
        </p>

      </div>

    </div>
  );
};

export default Register;