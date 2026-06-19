const Order = require('./Order');
/**
 * The core matching engine data structure.
 * This lives entirely in memory (RAM) for maximum speed.
 */
// define what the orderbook contains when new order comes in 
class OrderBook {
    constructor(symbol) {
        this.symbol = symbol;
        this.bids = []; // empty arrays of bids and asks
        this.asks = [];
        this.trades = [];
    }
    // Sorts the order book according to Price-Time Priority.
    sortBook() {
        // BIDS (Buyers): Highest price first. If tied, oldest timestamp first.
        this.bids.sort((a, b) => {
            if (b.price === a.price) return a.timestamp - b.timestamp;
            return b.price - a.price;
        });

        // ASKS (Sellers): Lowest price first. If tied, oldest timestamp first.
        this.asks.sort((a, b) => {
            if (a.price === b.price) return a.timestamp - b.timestamp;
            return a.price - b.price;
        });
    }
    matchOrders() {
        let newTrades = [];
        while (this.bids.length > 0 && this.asks.length > 0) {
            let bestBid = this.bids[0] // HIGHEST BUYER
            let bestAsk = this.asks[0]; // LOWEST SELLER
            if (bestBid.price >= bestAsk.price) { // DEAL DONE BRO
                let tradedQuantity = Math.min(bestBid.quantity, bestAsk.quantity);
                bestBid.quantity -= tradedQuantity;
                bestAsk.quantity -= tradedQuantity;
                let tradedPrice = bestBid.timestamp < bestAsk.timestamp ? bestBid.price : bestAsk.price;
                newTrades.push({
                    buyerId: bestBid.id,
                    sellerId: bestAsk.id,
                    symbol: this.symbol,
                    price: tradedPrice,
                    quantity: tradedQuantity,
                    timestamp: Date.now()
                });
                if (bestBid.quantity === 0) {
                    this.bids.shift(); // Removes the first element
                }
                if (bestAsk.quantity === 0) {
                    this.asks.shift(); // Removes the first element
                }
            } else {
                // The highest buyer refuses to pay the lowest seller's price.
                // Since the arrays are sorted, NO OTHER matches are possible. Stop looking.
                break;
            }
        }
        // Add the new trades to our historical ledger
        this.trades.push(...newTrades);
        // Return the trades we just made so the API can tell the users!
        return newTrades;
    }
    // adding order matlab usko sort karana and match karana ki kaise hota hai

    addOrder(side, symbol, price, quantity, type = "LIMIT") {
        // If it's a MARKET order, set the price so it executes instantly against anything
        let effectivePrice = price;
        if (type === "MARKET") {
            effectivePrice = side === "BUY" ? Infinity : 0;
        }

        const order = new Order(side, symbol, effectivePrice, quantity, type);

        if (side === "BUY") {
            this.bids.push(order);
        } else {
            this.asks.push(order);
        }

        this.sortBook();
        const newTrades = this.matchOrders();
        if(type=="MARKET"){
            this.bids = this.bids.filter(o=>o.id !== order.id);
            this.asks = this.asks.filter(o=>o.id !== order.id);
        }
        return newTrades;
    }
}

module.exports = OrderBook;