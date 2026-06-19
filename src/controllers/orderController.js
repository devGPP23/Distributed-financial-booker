const { getOrderBook } = require('../engine');
const redis = require('../config/redis');
const tradeQueue = require('../queue/tradeQueue');
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
        const symbol = req.body.symbol ? req.body.symbol.toUpperCase() : "BTC"; // default BTC
        const { side, price, quantity, type = "LIMIT" } = req.body;
        // If it's a MARKET order, price isn't strictly required (it's ignored anyway)
        if (!side || !quantity || (type === "LIMIT" && !price)) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        
        const orderBook = getOrderBook(symbol);
        // Pass to order add karne wale function ko bhej diye
        const newTrades = orderBook.addOrder(side, symbol, price || 0, quantity, type); // matching and sorting yahi pe hogyi
        //ek ek karke queue me job dalenge toh better recovery hogi rather than puri array ek sath
        if(newTrades.length>0){
            for(const trade of newTrades){
            await tradeQueue.add('save-trade',trade); // queue me dal diya
        }
    }
        
    //  Interview : We use JSON.stringify because Redis only stores strings! remember 
        // Cache the updated state to Redis
        const orderBookState = JSON.stringify({
            bids: orderBook.bids,
            asks: orderBook.asks,
            trades : orderBook.trades
        });
        await redis.set(`orderbook_${symbol}`, orderBookState);
            // REDIS PUB/SUB - signal bhej diye ki orderbook update ho gya hai 
        // Publish an event to Redis Pub/Sub This decouples the engine from the WebSockets. 
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
        const cachedBook = await redis.get(`orderbook_${symbol}`);
        if (cachedBook) {
            return res.json(JSON.parse(cachedBook));
        }
        
        const orderBook = getOrderBook(symbol);
        res.json({
            bids: orderBook.bids, 
            asks: orderBook.asks  
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

exports.cancelOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const symbol = req.query.symbol ? req.query.symbol.toUpperCase() : "BTC";
        const orderBook = getOrderBook(symbol);
        // Search in bids'
        let bidIndex = -1,askIndex=-1;
         bidIndex = orderBook.bids.findIndex(order => order.id === id);
        if (bidIndex !== -1) {
            const removed = orderBook.bids.splice(bidIndex, 1)[0];
            await redis.set(`orderbook_${symbol}`, JSON.stringify({
                bids: orderBook.bids, asks: orderBook.asks, trades: orderBook.trades
            }));
            return res.json({ message: "Order cancelled", order: removed });
        }

        // Search in asks
         askIndex = orderBook.asks.findIndex(order => order.id === id);
        if (askIndex !== -1) {
            const removed = orderBook.asks.splice(askIndex, 1)[0];  // delete logic ye lo
            await redis.set(`orderbook_${symbol}`, JSON.stringify({
                bids: orderBook.bids, asks: orderBook.asks, trades: orderBook.trades
            }));
            return res.json({ message: "Order cancelled", order: removed });
        }

        res.status(404).json({ error: "Order not found in the book" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
