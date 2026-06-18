const { btcOrderBook } = require('../engine');
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
        const { side, price, quantity } = req.body;

        // Boilerplate Validation
        if (!side || !price || !quantity) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Pass to Engine (In-Memory Processing is extremely fast)
        btcOrderBook.addOrder(side, "BTC", price, quantity);

        // 2. CORE LOGIC TO WRITE: Cache the updated state to Redis
        // Google Interview Focus: How do we serialize this efficiently? How do we ensure consistency?
        // TODO: Write code to save `btcOrderBook.bids` and `btcOrderBook.asks` to Redis

        // 3. CORE LOGIC TO WRITE: Publish an event to Redis Pub/Sub
        // Google Interview Focus: This enables a decoupled event-driven architecture. WebSocket servers will listen to this.
        // TODO: Write code to publish the latest order book state to a channel (e.g., 'ORDER_BOOK_UPDATE')

        // Boilerplate Response
        res.status(201).json({
            message: "Order placed successfully",
            // We return the trades that just happened (if any)
            trades: btcOrderBook.trades 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.getOrderBook = async (req, res) => {
    try {
        // CORE LOGIC TO WRITE: Fetch the order book from Redis instead of RAM.
        // Google Interview Focus: Why not just return `btcOrderBook.bids` directly?
        // Answer: Because in a microservices architecture, the API server serving GET requests 
        // might be on a different server than the matching engine! Redis acts as our centralized, high-speed cache.
        
        // TODO: Write code to fetch from Redis. If Redis is down, fallback to memory (btcOrderBook).

        res.json({
            bids: btcOrderBook.bids, // Replace this with Redis data
            asks: btcOrderBook.asks  // Replace this with Redis data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
