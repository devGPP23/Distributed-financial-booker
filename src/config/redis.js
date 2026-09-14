const Redis = require('ioredis');
require('dotenv').config();

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,       // BullMQ ke liye zaroori hai
  enableReadyCheck: false,          // Upstash ready check skip karo
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);  // Max 5s wait, phir retry
    return delay;
  },
  reconnectOnError(err) {
    // ECONNRESET pe auto reconnect karo
    return err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT');
  },
});

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  // Sirf ek baar log karo, spam mat karo
  if (!redis._errorLogged || Date.now() - redis._errorLogged > 10000) {
    console.error('❌ Redis error:', err.message);
    redis._errorLogged = Date.now();
  }
});

module.exports = redis;
