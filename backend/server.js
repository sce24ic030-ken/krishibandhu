require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const cropRoutes = require('./routes/cropRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const marketRoutes = require('./routes/marketRoutes');
const marketPriceRoutes = require('./routes/marketPriceRoutes');
const bidRoutes = require('./routes/bidRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const aiRoutes = require('./routes/aiRoutes');
const aiImageRoutes = require('./routes/aiImageRoutes');

const adminRoutes = require('./routes/adminRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminMarketRoutes = require('./routes/adminMarketRoutes');
const adminCropRoutes = require('./routes/adminCropRoutes');

const saleListingRoutes = require('./routes/saleListingRoutes');

const parchiRoutes = require('./routes/parchiRoutes');

const storageRoutes = require('./routes/storageRoutes');

const backhaulRoutes = require('./routes/backhaulRoutes');

const traceRoutes = require('./routes/traceRoutes');

const analyticsRoutes = require('./routes/analyticsRoutes');

const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');

const { sanitizePayload } = require('./middleware/sanitize');

const {
  authLimiter,
  aiLimiter,
  apiLimiter,
} = require('./middleware/rateLimiter');

const app = express();

connectDB();

const PORT = process.env.PORT || 5000;

// ==========================================
// SECURITY
// ==========================================

app.use(helmet());

// ==========================================
// CORS
// ==========================================

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://krishibandhu-frontend.onrender.com',
];

if (process.env.FRONTEND_URL) {
  const configuredOrigins = process.env.FRONTEND_URL
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  allowedOrigins.push(...configuredOrigins);
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // such as server-to-server requests and health checks.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(
        `⚠️ CORS blocked request from origin: ${origin}`,
      );

      return callback(
        new Error('Not allowed by CORS'),
      );
    },
    credentials: true,
  }),
);

// ==========================================
// BODY PARSERS
// ==========================================

app.use(
  express.json({
    limit: '12mb',
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '12mb',
  }),
);

// ==========================================
// SANITIZE  (prototype-pollution guard)
// ==========================================

app.use(sanitizePayload);

// ==========================================
// RATE LIMITING
// ==========================================

app.use('/api', apiLimiter);

// ==========================================
// LOGGER
// ==========================================

app.use(morgan('dev'));

// ==========================================
// STATIC UPLOADS
// ==========================================

app.use(
  '/uploads',
  express.static(
    path.join(
      __dirname,
      'uploads',
    ),
  ),
);

// ==========================================
// HEALTH
// ==========================================

app.get(
  '/api/health',
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        'KrishiBandhu API is running',
      timestamp:
        new Date().toISOString(),
    });
  },
);

// ==========================================
// API ROOT
// ==========================================

app.get(
  '/api',
  (req, res) => {
    res.status(200).json({
      success: true,
      message:
        'Welcome to KrishiBandhu API',
      version: '1.0.0',
    });
  },
);

// ==========================================
// API ROUTES
// ==========================================

app.use(
  '/api/auth',
  authLimiter,
  authRoutes,
);

app.use(
  '/api/crops',
  cropRoutes,
);

app.use(
  '/api/weather',
  weatherRoutes,
);

app.use(
  '/api/markets',
  marketRoutes,
);

app.use(
  '/api/market-prices',
  marketPriceRoutes,
);

app.use(
  '/api/bids',
  bidRoutes,
);

app.use(
  '/api/transactions',
  transactionRoutes,
);

app.use(
  '/api/ai',
  aiLimiter,
  aiRoutes,
);

app.use(
  '/api/ai/image',
  aiLimiter,
  aiImageRoutes,
);

app.use(
  '/api/trace',
  traceRoutes,
);

app.use(
  '/api/analytics',
  analyticsRoutes,
);

app.use(
  '/api/admin/analytics',
  adminAnalyticsRoutes,
);

app.use(
  '/api/admin',
  adminRoutes,
);

app.use(
  '/api/admin/users',
  adminUserRoutes,
);

app.use(
  '/api/admin/markets',
  adminMarketRoutes,
);

app.use(
  '/api/admin/crops',
  adminCropRoutes,
);

app.use(
  '/api/sale-listings',
  saleListingRoutes,
);

app.use(
  '/api/parchi',
  parchiRoutes,
);

app.use(
  '/api/storage',
  storageRoutes,
);

app.use(
  '/api/backhaul',
  backhaulRoutes,
);

// ==========================================
// 404 HANDLER
// ==========================================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        'API endpoint not found',
      path: req.originalUrl,
    });
  },
);

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(
  (
    error,
    req,
    res,
    next,
  ) => {
    console.error('');
    console.error(
      '==========================================',
    );
    console.error(
      '🚨 UNHANDLED SERVER ERROR',
    );
    console.error(
      '==========================================',
    );

    console.error(
      'Method:',
      req.method,
    );

    console.error(
      'URL:',
      req.originalUrl,
    );

    console.error(
      'Error Name:',
      error?.name,
    );

    console.error(
      'Error Message:',
      error?.message,
    );

    console.error(
      'Error Stack:',
      error?.stack,
    );

    if (error?.errors) {
      console.error(
        'Validation Errors:',
        Object.fromEntries(
          Object.entries(
            error.errors,
          ).map(
            ([
              field,
              validationError,
            ]) => [
              field,
              validationError.message,
            ],
          ),
        ),
      );
    }

    console.error(
      '==========================================',
    );
    console.error('');

    const statusCode =
      error?.statusCode ||
      error?.status ||
      500;

    return res
      .status(
        statusCode >= 400 &&
          statusCode < 600
          ? statusCode
          : 500,
      )
      .json({
        success: false,

        message:
          process.env.NODE_ENV ===
          'development'
            ? error?.message ||
              'Internal server error.'
            : 'Internal server error.',

        error:
          process.env.NODE_ENV ===
          'development'
            ? {
                name:
                  error?.name,
                message:
                  error?.message,
                stack:
                  error?.stack,
              }
            : undefined,
      });
  },
);

// ==========================================
// START SERVER
// ==========================================

app.listen(
  PORT,
  () => {
    console.log('');
    console.log(
      '🌾 KrishiBandhu Backend',
    );
    console.log(
      '-------------------------',
    );
    console.log(
      `🚀 Server: http://localhost:${PORT}`,
    );
    console.log(
      `🩺 Health: http://localhost:${PORT}/api/health`,
    );
    console.log(
      `🌤️ Weather: http://localhost:${PORT}/api/weather?city=Bengaluru`,
    );
    console.log(
      `📈 Markets: http://localhost:${PORT}/api/markets`,
    );
    console.log(
      `💰 Market Prices: http://localhost:${PORT}/api/market-prices`,
    );
    console.log(
      `🔗 Trace/QR: http://localhost:${PORT}/api/trace`,
    );
    console.log(
      `📊 Analytics: http://localhost:${PORT}/api/analytics`,
    );
    console.log(
      `🛡️ Admin: http://localhost:${PORT}/api/admin`,
    );
    console.log(
      `📐 Admin Analytics: http://localhost:${PORT}/api/admin/analytics`,
    );
    console.log(
      `👥 Admin Users: http://localhost:${PORT}/api/admin/users`,
    );
    console.log(
      `🏪 Admin Markets: http://localhost:${PORT}/api/admin/markets`,
    );
    console.log(
      `🌱 Admin Crops: http://localhost:${PORT}/api/admin/crops`,
    );
    console.log(
      `🛒 Sale Listings: http://localhost:${PORT}/api/sale-listings`,
    );
    console.log(
      `📄 Parchi: http://localhost:${PORT}/api/parchi`,
    );
    console.log(
      `🏬 Storage & Warehouses: http://localhost:${PORT}/api/storage`,
    );
    console.log(
      `🚚 Backhaul: http://localhost:${PORT}/api/backhaul`,
    );
    console.log(
      `📎 Uploads: http://localhost:${PORT}/uploads`,
    );
    console.log(
      `🎤 Voice Transcribe: http://localhost:${PORT}/api/ai/transcribe`,
    );
    console.log('');
    console.log(
      '🌐 Allowed CORS Origins:',
    );
    allowedOrigins.forEach((origin) => {
      console.log(`   ✓ ${origin}`);
    });
    console.log('');
  },
);