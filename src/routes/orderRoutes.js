const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// Public route — koi bhi order book dekh sakta hai
router.get('/book', orderController.getOrderBook);

// Protected route — login karna zaroori hai trade ke liye
router.post('/', authMiddleware, orderController.placeOrder);
router.delete('/:id', authMiddleware, orderController.cancelOrder);

module.exports = router;
