const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

// ==========================================
// GENERATE JWT TOKEN
// ==========================================

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET is missing from the environment variables.',
    );
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '7d',
    },
  );
};

// ==========================================
// GENERATE / ROTATE REFRESH TOKEN
// ==========================================

const createRefreshToken = async (user) => {
  const rawToken = crypto.randomBytes(48).toString('hex');

  const record = await RefreshToken.create({
    user: user._id,
    token: rawToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  return { rawToken, record };
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'refreshToken is required.',
      });
    }

    const record = await RefreshToken.findOne({
      token: refreshToken,
      revokedAt: null,
    });

    if (!record) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or revoked refresh token.',
      });
    }

    if (record.expiresAt < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has expired. Please login again.',
      });
    }

    const user = await User.findById(record.user);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or deactivated.',
      });
    }

    // Rotate: revoke old, issue a fresh pair
    const replacement = await createRefreshToken(user);

    record.revokedAt = new Date();
    record.replacedBy = replacement.record.token;
    await record.save();

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Session refreshed.',
      token,
      refreshToken: replacement.rawToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error('Refresh Token Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to refresh session.',
    });
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await RefreshToken.updateOne(
        { token: refreshToken },
        { revokedAt: new Date() },
      );
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    console.error('Logout Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to logout.',
    });
  }
};

// ==========================================
// REGISTER
// ==========================================

const register = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      role = 'farmer',
      location = {},
    } = req.body;

    // Basic validation
    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Name, email, phone and password are required.',
      });
    }

    // Password validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          'Password must contain at least 6 characters.',
      });
    }

    // Public registration only allows farmer and trader
    if (!['farmer', 'trader'].includes(role)) {
      return res.status(403).json({
        success: false,
        message:
          'Invalid registration role.',
      });
    }

    // Check existing email
    const existingEmail =
      await User.findOne({
        email: email
          .toLowerCase()
          .trim(),
      });

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message:
          'An account with this email already exists.',
      });
    }

    // Check existing phone
    const existingPhone =
      await User.findOne({
        phone: phone.trim(),
      });

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message:
          'An account with this phone number already exists.',
      });
    }

    // Hash password
    const hashedPassword =
      await bcrypt.hash(
        password,
        10,
      );

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email
        .toLowerCase()
        .trim(),
      phone: phone.trim(),
      password: hashedPassword,
      role,
      location: {
        city:
          location.city || '',
        district:
          location.district || '',
        state:
          location.state || '',
      },
    });

    // Generate JWT
    const token =
      generateToken(user);

    // Create refresh token session
    const { rawToken: refreshToken } =
      await createRefreshToken(user);

    return res.status(201).json({
      success: true,
      message:
        'Registration successful.',
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error(
      'Register Error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to register user.',
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};

// ==========================================
// LOGIN
// ==========================================

const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          'Email and password are required.',
      });
    }

    // Check JWT configuration
    if (!process.env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET is missing from the environment variables.',
      );
    }

    // Find user
    const user =
      await User.findOne({
        email: email
          .toLowerCase()
          .trim(),
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password.',
      });
    }

    // Check account status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message:
          'Your account has been deactivated.',
      });
    }

    // Make sure password exists
    if (!user.password) {
      throw new Error(
        'User account does not contain a password hash.',
      );
    }

    // Compare password
    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password,
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          'Invalid email or password.',
      });
    }

    // Generate JWT
    const token =
      generateToken(user);

    // Create refresh token session
    const { rawToken: refreshToken } =
      await createRefreshToken(user);

    return res.status(200).json({
      success: true,
      message:
        'Login successful.',
      token,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        location: user.location,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    console.error(
      '==========================================',
    );

    console.error(
      'LOGIN ERROR:',
      error,
    );

    console.error(
      'ERROR MESSAGE:',
      error.message,
    );

    console.error(
      'ERROR STACK:',
      error.stack,
    );

    console.error(
      '==========================================',
    );

    return res.status(500).json({
      success: false,
      message:
        'Internal server error.',
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};

// ==========================================
// GET CURRENT LOGGED-IN USER
// ==========================================

const getMe = async (
  req,
  res,
) => {
  try {
    return res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        location: req.user.location,
        isActive: req.user.isActive,
        isVerified: req.user.isVerified,
      },
    });
  } catch (error) {
    console.error(
      'Get Me Error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to fetch user information.',
    });
  }
};

// ==========================================
// EXPORT
// ==========================================

module.exports = {
  register,
  login,
  getMe,
  refreshAccessToken,
  logout,
  createRefreshToken,
};