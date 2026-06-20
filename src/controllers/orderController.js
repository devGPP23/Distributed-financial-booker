const { getOrderBook } = require('../engine');
const redis = require('../config/redis');
const tradeQueue = require('../queue/tradeQueue');
// HTTP requests ke liye controller (order place karna, book get karna etc)
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
        
        // Redis me orderbook cache karlo (stringify karke kyunki redis me string hi jata hai)
        const orderBookState = JSON.stringify({
            bids: orderBook.bids,
            asks: orderBook.asks,
            trades : orderBook.trades
        });
        await redis.set(`orderbook_${symbol}`, orderBookState);
        // Redis pub/sub se sabhi clients ko update bhej do ki naya order aya hai
        await redis.publish(`ORDER_BOOK_UPDATE_${symbol}`, orderBookState);
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
