const redis = require('../config/redis');
/*
 Token Bucket Rate Limiter using Redis to protecting APIs.
 A user starts with a bucket of tokens (e.g., 5 tokens)
  If the bucket is empty (0 tokens), they get HTTP 429 (Too Many Requests).
 */
const rateLimiter = async (req, res, next) => {
  try {
    // ip address is unique for particular device hence it is safer to use
    const ipAddress = req.headers['x-forwarded-for'] || req.ip || req.connection.remoteAddress;
    const bucketKey = `rate_limit:bucket:${ipAddress}`;
    const BUCKET_CAPACITY = parseInt(process.env.RATE_LIMIT_CAPACITY) || 2000; // 2000 is for loadtesting
    const REFILL_RATE_MS  = parseInt(process.env.RATE_LIMIT_REFILL_MS) || 10; // Refill 1 token every 10ms (100/sec)

    // Check if the bucket exists in Redis
    const exists = await redis.exists(bucketKey);

    if (!exists) {
      // First time we've seen this IP. Give them a full bucket minus 1 for this request.
      await redis.hmset(bucketKey, {
        tokens: BUCKET_CAPACITY - 1,
        lastRefill: Date.now()
      });
      // Set an expiry so Redis doesn't fill up with stale IP addresses
      await redis.expire(bucketKey, 60); 
      return next();
    }

    // Get current bucket state
    const bucket = await redis.hgetall(bucketKey);
    let tokens = parseInt(bucket.tokens);
    const lastRefill = parseInt(bucket.lastRefill);
    const now = Date.now();

    // Calculate how many tokens to add based on how much time has passed
    const timePassedMs = now - lastRefill;
    const tokensToAdd = Math.floor(timePassedMs / REFILL_RATE_MS);

    if (tokensToAdd > 0) {
      // Refill the bucket, but don't exceed capacity
      tokens = Math.min(BUCKET_CAPACITY, tokens + tokensToAdd);
      await redis.hset(bucketKey, 'lastRefill', now);
    }

    if (tokens > 0) {
      // Allow request, consume 1 token
      await redis.hset(bucketKey, 'tokens', tokens - 1);
      return next();
    } else {
      // Bucket is empty! Block the bot.
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'You have exceeded the rate limit. Please slow down.'
      });
    }

  } catch (error) {
    console.error('Rate Limiter Error:', error);
    // If Redis crashes, we usually want to fail OPEN (let traffic through) or fail CLOSED.
    // We'll fail OPEN so the site doesn't go down entirely if Redis restarts.
    return next();
  }
};

module.exports = rateLimiter;
