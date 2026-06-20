require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const connectMongo = require('./src/config/mongo');
const initWebSockets = require('./src/websockets/index');


const app = express();
const server = http.createServer(app);  // We'll attach Socket.io to this later
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Dashboard UI serve karne ke liye
app.use(express.static(path.join(__dirname, 'src', 'Views')));

const rateLimiter = require('./src/middleware/rateLimiter');
const orderRoutes = require('./src/routes/orderRoutes');
const userRouter = require('./src/routes/users.router');
const statsRoutes = require('./src/routes/statsRoutes');

// Apply rate limiter to API routes only (skip the UI files)
app.use('/api', rateLimiter);

// Mount routes
app.use('/api/order', orderRoutes);
app.use('/api/auth', userRouter);
app.use('/api/stats', statsRoutes);

// Health check API (JSON)
app.get('/api/health', (req, res) => {
  res.json({
    service: 'Flash Sale Order Matching Engine',
    status: 'running',
    version: '1.0.0',
    databases: ['PostgreSQL (Ledger)', 'Redis (Order Book)', 'MongoDB (Users)'],
    docs: 'Open http://localhost:3000 for the live dashboard',
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
  // WebSocket server initialize karna
  initWebSockets(server);

  // Start the server
  server.listen(PORT, () => {
    console.log(`[HTTP] Server is running on port ${PORT}`);
    
    // Start worker in the same process if env var is set
    // This allows us to run both Express and BullMQ on a single free Render instance
    if (process.env.START_WORKER === 'true') {
        console.log(`[WORKER] Starting BullMQ trade worker in the main process...`);
        require('./src/workers/tradeWorker.js');
    }
  });
};

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
