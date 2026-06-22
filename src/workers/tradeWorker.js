const { Worker } = require("bullmq");
require('dotenv').config();
const {trades} = require('../db/schema.js');
const {db} = require('../config/postgres.js')

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

const worker = new Worker('save-trade', async (job) => {
    const { buyerId, sellerId, symbol, price, quantity } = job.data;
    const crypto = require('crypto');
    const tradeId = crypto.createHash('sha256').update(`${buyerId}-${sellerId}`).digest('hex');
    // Insert into Postgres using Drizzle
    await db.insert(trades).values({
        tradeId: tradeId,  // unique ID for idempotency, now 64 chars
        buyOrderId: buyerId,
        sellOrderId: sellerId,
        symbol,
        price,
        quantity,
    });
}, {
    connection: getRedisConnection()
});

worker.on('error', err => {
    console.error('Worker error:', err);
});
worker.on('completed', (job) => console.log(`Trade ${job.id} saved to Postgres`));
console.log("Worker started");
