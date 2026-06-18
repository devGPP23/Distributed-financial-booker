const redis = require('../config/redis');

/**
 * Token Bucket Rate Limiter using Redis.
 * This is an elite algorithmic approach to protecting APIs.
 * 
 * Rules:
 * - A user starts with a bucket of tokens (e.g., 5 tokens).
 * - Every request they make costs 1 token.
 * - The bucket refills at a certain rate (e.g., 1 token per second).
 * - If the bucket is empty (0 tokens), they get HTTP 429 (Too Many Requests).
 */
const rateLimiter = async (req, res, next) => {
  try {
    // Identify the user. In production, this might be a JWT ID.
    // For this project, we'll use their IP address to block spam bots.
    const ipAddress = req.ip || req.connection.remoteAddress;
    const bucketKey = `rate_limit:bucket:${ipAddress}`;
    
    // Configuration
    const BUCKET_CAPACITY = 5; // Max burst of 5 requests
    const REFILL_RATE_MS = 1000; // Refill 1 token every 1000ms (1 second)

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
