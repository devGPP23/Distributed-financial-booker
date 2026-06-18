require('dotenv').config();
const express = require('express');
const http = require('http');
const connectMongo = require('./src/config/mongo');

const app = express();
const server = http.createServer(app);  // We'll attach Socket.io to this later
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Order Matching Engine',
    status: 'running',
    databases: ['PostgreSQL (Ledger)', 'Redis (Order Book)', 'MongoDB (Users)'],
  });
});

// Start the server and connect databases
const start = async () => {
  // Connect to MongoDB
  try {
    await connectMongo();
  } catch (err) {
    console.error('⚠️ Skipping MongoDB connection for now due to timeout error.');
  }
  // Redis connects automatically on require (see src/config/redis.js)
  require('./src/config/redis');

  server.listen(PORT, () => {
    console.log(`🚀 Order Matching Engine running on port ${PORT}`);
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
