const OrderBook = require('./OrderBook');

// This acts as our in-memory singleton instance for the BTC order book.
// In a highly distributed architecture, we might have different nodes managing different symbols.
const btcOrderBook = new OrderBook("BTC");

module.exports = {
    btcOrderBook
};
