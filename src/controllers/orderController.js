const { getOrderBook } = require('../engine');
const redis = require('../config/redis');

/**
 * Controller: Handles incoming HTTP requests for orders.
 * 
 * ARCHITECTURE DECISION FOR INTERVIEW:
 * We decouple the HTTP layer from the matching engine. The HTTP request comes in, 
 * we pass data to the in-memory engine, and then we cache the result in Redis.
 * Why Redis?
 * 1. Read-heavy operations (like getting the current order book) shouldn't block the Node.js event loop or hit a slow DB.
 * 2. It allows us to scale out our WebSocket servers later (Pub/Sub).
 */
exports.placeOrder = async (req, res) => {
    try {
        // Support dynamic symbol, fallback to BTC
        const symbol = req.body.symbol ? req.body.symbol.toUpperCase() : "BTC";
        const { side, price, quantity } = req.body;
        if (!side || !price || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        const orderBook = getOrderBook(symbol);
        // Pass to order add karne wale function ko bhej diye
        orderBook.addOrder(side, symbol, price, quantity); // matching and sorting yahi pe hogyi

    //  Interview : We use JSON.stringify because Redis only stores strings! remember 
        // Cache the updated state to Redis
        const orderBookState = JSON.stringify({
            bids: orderBook.bids,
            asks: orderBook.asks,
            trades : orderBook.trades
        });
        await redis.set(`orderbook_${symbol}`, orderBookState);
            // REDIS PUB/SUB - signal bhej diye ki orderbook update ho gya hai 
        // Publish an event to Redis Pub/Sub
        //  This decouples the engine from the WebSockets. 
        // We broadcast to the 'ORDER_BOOK_UPDATE' channel so all servers know instantly.
        await redis.publish(`ORDER_BOOK_UPDATE_${symbol}`, orderBookState);
 // publishing does is that it sends a signal to all the connected clients through the channel name  which is ORDER_BOOK_UPDATE in our case that there is a new update in the order book so that the clients can update their order book and show it to the users
        res.status(201).json({
            message: "Order placed successfully",
            trades: orderBook.trades  // ye sb trade hue h
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getOrderBook = async (req, res) => {
    try {
        const symbol = req.query.symbol ? req.query.symbol.toUpperCase() : "BTC";
        // CORE LOGIC: Fetch the order book from Redis instead of RAM.
        // Google Interview Focus: We fetch from the cache so we don't overload the matching engine!
        const cachedBook = await redis.get(`orderbook_${symbol}`);
        if (cachedBook) {
            // We must JSON.parse() to turn the Redis string back into a Javascript Object
            return res.json(JSON.parse(cachedBook));
        }
        
        const orderBook = getOrderBook(symbol);
        // Fallback just in case Redis is completely empty
        res.json({
            bids: orderBook.bids, 
            asks: orderBook.asks  
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
