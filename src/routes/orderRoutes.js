const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Define boilerplate routes. The heavy lifting happens in the controller.
router.post('/', orderController.placeOrder);
router.get('/book', orderController.getOrderBook);

module.exports = router;
