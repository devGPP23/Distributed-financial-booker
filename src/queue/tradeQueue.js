const { Queue } = require('bullmq');
require('dotenv').config();

// Parse REDIS_URL for BullMQ connection (supports both local and Upstash TLS)
function getRedisConnection() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const parsed = new URL(url);
    const connection = {
        host: parsed.hostname,
        port: parseInt(parsed.port) || 6379,
    };
    if (parsed.password) connection.password = parsed.password;
    if (parsed.username && parsed.username !== 'default') connection.username = parsed.username;
    if (parsed.protocol === 'rediss:') connection.tls = {};  // Enable TLS for Upstash
    return connection;
}

const tradeQueue = new Queue('save-trade', {
    connection: getRedisConnection()
});
module.exports = tradeQueue;
