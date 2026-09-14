const redis = require('../config/redis');

// Helper to prevent hanging requests if Redis gets stuck
const withTimeout = (promise, ms, fallback) =>
    Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Redis Timeout')), ms))]);

const rateLimiter = async (req, res, next) => {
  try {
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    const bucketKey = `rate_limit:bucket:${ipAddress}`;
    const BUCKET_CAPACITY = parseInt(process.env.RATE_LIMIT_CAPACITY) || 2000;
    const REFILL_RATE_MS  = parseInt(process.env.RATE_LIMIT_REFILL_MS) || 10;
    const TIMEOUT_MS = 1500; // 1.5 seconds max wait for Redis

    // Check if the bucket exists in Redis (with timeout)
    const exists = await withTimeout(redis.exists(bucketKey), TIMEOUT_MS);

    if (!exists) {
      await withTimeout(redis.hmset(bucketKey, { tokens: BUCKET_CAPACITY - 1, lastRefill: Date.now() }), TIMEOUT_MS);
      await withTimeout(redis.expire(bucketKey, 60), TIMEOUT_MS); 
      return next();
    }

    const bucket = await withTimeout(redis.hgetall(bucketKey), TIMEOUT_MS);
    let tokens = parseInt(bucket.tokens) || 0;
    const lastRefill = parseInt(bucket.lastRefill) || Date.now();
    const now = Date.now();

    const timePassedMs = now - lastRefill;
    const tokensToAdd = Math.floor(timePassedMs / REFILL_RATE_MS);

    if (tokensToAdd > 0) {
      tokens = Math.min(BUCKET_CAPACITY, tokens + tokensToAdd);
      await withTimeout(redis.hset(bucketKey, 'lastRefill', now), TIMEOUT_MS);
    }

    if (tokens > 0) {
      await withTimeout(redis.hset(bucketKey, 'tokens', tokens - 1), TIMEOUT_MS);
      return next();
    } else {
      return res.status(429).json({ error: 'Too Many Requests', message: 'You have exceeded the rate limit. Please slow down.' });
    }

  } catch (error) {
    console.error('Rate Limiter Error/Timeout:', error.message);
    // Fail OPEN if Redis crashes or times out
    return next();
  }
};

module.exports = rateLimiter;
