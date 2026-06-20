const OrderBook = require('./OrderBook');

// Registry to hold all active order books by symbol
const orderBooks = {};

// Helper to get or create an order book
const getOrderBook = (symbol) => {
    const upperSymbol = symbol.toUpperCase();
    if (!orderBooks[upperSymbol]) {
        orderBooks[upperSymbol] = new OrderBook(upperSymbol);
    }
    return orderBooks[upperSymbol];
};

// Returns all active symbol names (e.g. ['BTC','ETH'])
const getAllSymbols = () => Object.keys(orderBooks);

module.exports = {
    getOrderBook,
    getAllSymbols,
};
