
// UI dashboard ke liye stats endpoint. Har 2s mein poll hota hai.
const express = require('express');
const router = express.Router();
const { getOrderBook, getAllSymbols } = require('../engine');
const redis = require('../config/redis');
const tradeQueue = require('../queue/tradeQueue');

router.get('/', async (req, res) => {
    try {
        const symbol = req.query.symbol ? req.query.symbol.toUpperCase() : 'BTC';
        const orderBook = getOrderBook(symbol);

        // Queue mein kitne jobs bache hai ya fail hue check karlo
        const [waiting, completed, failed] = await Promise.all([
            tradeQueue.getWaitingCount(),
            tradeQueue.getCompletedCount(),
            tradeQueue.getFailedCount(),
        ]);

        // Redis se orderbook ka cache nikal rahe hai
        const cachedRaw = await redis.get(`orderbook_${symbol}`);
        const cached = cachedRaw ? JSON.parse(cachedRaw) : null;

        // UI ko jo data chahiye wo sab yahan yha h
        const stats = {
            symbol,
            timestamp: new Date().toISOString(),

            orderBook: {
                bids: orderBook.bids.length,
                asks: orderBook.asks.length,
                totalTrades: orderBook.trades.length,
                bestBid: orderBook.bids[0] ? orderBook.bids[0].price : null,
                bestAsk: orderBook.asks[0] ? orderBook.asks[0].price : null,
                recentTrades: orderBook.trades.slice(-10).reverse(),
            },

            queue: {
                waiting,
                completed,
                failed,
            },

            cache: {
                hit: !!cachedRaw,
                bids: cached ? cached.bids.length : 0,
                asks: cached ? cached.asks.length : 0,
            },

            // Server ka uptime aur memory
            uptime: Math.floor(process.uptime()),
            memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        };

        res.json(stats);
    } catch (error) {
        console.error('Stats route error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
