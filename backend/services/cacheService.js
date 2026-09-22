// ==========================================
// CACHE SERVICE
// Redis-backed when REDIS_URL is configured,
// otherwise falls back to an in-memory cache
// so the platform keeps working everywhere.
// ==========================================

let redisClient = null;
let redisAvailable = false;

if (process.env.REDIS_URL) {
  try {
    // eslint-disable-next-line global-require
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    redisClient.on('error', () => {
      redisAvailable = false;
    });

    redisClient.on('ready', () => {
      redisAvailable = true;
    });

    redisClient
      .connect()
      .then(() => {
        redisAvailable = true;
      })
      .catch(() => {
        redisAvailable = false;
      });
  } catch {
    redisClient = null;
    redisAvailable = false;
  }
}

const memory = new Map();

const TTL_FOREVER = 0;

const get = async (key) => {
  if (redisAvailable && redisClient) {
    try {
      const raw = await redisClient.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      // fall through to memory
    }
  }

  const entry = memory.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt !== TTL_FOREVER && Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }

  return entry.value;
};

const set = async (key, value, ttlSeconds = 60) => {
  if (redisAvailable && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      return;
    } catch {
      // fall through to memory
    }
  }

  memory.set(key, {
    value,
    expiresAt: ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : TTL_FOREVER,
  });
};

const del = async (pattern) => {
  if (redisAvailable && redisClient) {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length) {
        await redisClient.del(...keys);
      }
    } catch {
      // ignore
    }
  }

  if (typeof pattern !== 'string') {
    return;
  }

  const regex = new RegExp(`^${pattern.replace(/\*/g, '.*')}$`);

  [...memory.keys()].forEach((key) => {
    if (regex.test(key)) {
      memory.delete(key);
    }
  });
};

const flushMemory = () => {
  memory.clear();
};

module.exports = {
  get,
  set,
  del,
  flushMemory,
  isRedisAvailable: () => redisAvailable,
};