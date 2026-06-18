const OrderBook = require('./OrderBook');

const book = new OrderBook("BTC");

// 1. Buyer wants to pay 25,000. Seller wants 25,100. (NO MATCH)
book.addOrder("BUY", "BTC", "25000", "5");
book.addOrder("SELL", "BTC", "25100", "3"); 

// 2. Buyer wants to pay 24,900. Seller wants 24,850. (MATCH!)
book.addOrder("BUY", "BTC", "24900", "10");
book.addOrder("SELL", "BTC", "24850", "7"); 

console.log("Remaining Bids:", book.bids);
console.log("Remaining Asks:", book.asks);
console.log("Executed Trades:", book.trades);
