const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// Public route — anyone can view the order book
router.get('/book', orderController.getOrderBook);

// Protected routes — must be logged in to trade
router.post('/', authMiddleware, orderController.placeOrder);
router.delete('/:id', authMiddleware, orderController.cancelOrder);

module.exports = router;
