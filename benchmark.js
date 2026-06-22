const OrderBook = require('./src/engine/OrderBook');
const { performance } = require('perf_hooks');

console.log("🚀 Starting Benchmark: In-Memory Order Matching Engine");

const book = new OrderBook("BTC");
const iterations = 10000;

// Warmup
for (let i = 0; i < 100; i++) {
    book.addOrder("BUY", "BTC", "25000", "1");
}

console.log(`\nTesting ${iterations} matches...`);
const start = performance.now();

for (let i = 0; i < iterations; i++) {
    book.addOrder("BUY", "BTC", "25000", "5");
    book.addOrder("SELL", "BTC", "25000", "5");
}

const end = performance.now();
const totalTimeMs = end - start;
const timePerMatchMs = totalTimeMs / iterations;
const matchesPerSec = (iterations / totalTimeMs) * 1000;

console.log(`\n✅ Benchmark Complete!`);
console.log(`Total time for ${iterations} matches: ${totalTimeMs.toFixed(2)} ms`);
console.log(`Average time per match execution: ${timePerMatchMs.toFixed(4)} ms`);
console.log(`Throughput: ${matchesPerSec.toFixed(0)} matching operations / sec (engine only)`);
