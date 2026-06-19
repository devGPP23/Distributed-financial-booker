const { Worker } = require("bullmq");
require('dotenv').config();
const {trades} = require('../db/schema.js');
const {db} = require('../config/postgres.js')
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
    connection: { host: 'localhost', port: 6379 }
});

worker.on('error', err => {
    console.error('Worker error:', err);
});
worker.on('completed', (job) => console.log(`Trade ${job.id} saved to Postgres`));
console.log("Worker started");
