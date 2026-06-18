const crypto = require('crypto');

 /**
     * Represents a single order in the order book.
     * * @param {string} side - "BUY" or "SELL"
     * @param {string} symbol - The ticker symbol (e.g., "AAPL")
     * @param {number} price - The limit price
     * @param {number} quantity - The number of shares
     */
class Order {
    constructor(side, symbol, price, quantity) {
        this.id = crypto.randomUUID();
        this.side = side;
        this.symbol = symbol;
        this.price = Number(price);
        this.quantity = Number(quantity);
        this.timestamp = Date.now();
    }
}

module.exports = Order;