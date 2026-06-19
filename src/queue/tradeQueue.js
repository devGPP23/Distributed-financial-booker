const { Queue } = require('bullmq');
const tradeQueue = new Queue('save-trade', {
    connection: { host: 'localhost', port: 6379 }
});
module.exports = tradeQueue;
