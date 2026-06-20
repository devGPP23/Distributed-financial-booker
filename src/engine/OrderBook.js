const Order = require('./Order');
// Orderbook structure jo memory (RAM) me store hota hai fast speed ke liye
class OrderBook {
    constructor(symbol) {
        this.symbol = symbol;
        this.bids = []; // empty arrays of bids and asks
        this.asks = [];
        this.trades = [];
    }
    // Price aur time ke hisaab se sort karna
    sortBook() {
        // Buyers: Jo sabse zyada price dega wo pehle, agar same price toh jo pehle aya wo pehle
        this.bids.sort((a, b) => {
            if (b.price === a.price) return a.timestamp - b.timestamp;
            return b.price - a.price;
        });

        // Sellers: Jo sabse kam price me bechega wo pehle, same logic
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
                // Agar highest buyer bhi agree nahi kar raha, toh aage koi match nahi hoga
                break;
            }
        }
        // Naye trades array me save karlo
        this.trades.push(...newTrades);
        // API ko trades return kardo
        return newTrades;
    }
    // adding order matlab usko sort karana and match karana ki kaise hota hai

    addOrder(side, symbol, price, quantity, type = "LIMIT") {
        // Market order aaya toh price Infinity ya 0 set karo taaki turant match ho
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