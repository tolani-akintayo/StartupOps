const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { orders, createOrder, products } = require('../data/store');
const { appLogger } = require('../logger');

// Simulated downstream dependency failure rate. This is what produces the
// "occasional errors" the traffic generator description calls for, and gives
// the Data track real error-rate trends to chart, and DevOps real signal for
// error-rate alarms.
const SIMULATED_FAILURE_RATE = 0.03;

router.get('/orders', requireAuth, (req, res) => {
  const mine = orders.filter((o) => o.userId === req.user.id);
  res.json(mine);
});

router.post('/orders', requireAuth, (req, res) => {
  const { productId, quantity } = req.body || {};

  if (!productId || !quantity || quantity < 1) {
    return res.status(400).json({ error: 'productId and quantity (>=1) are required' });
  }

  if (!products.find((p) => p.id === Number(productId))) {
    return res.status(404).json({ error: 'Product not found' });
  }

  if (Math.random() < SIMULATED_FAILURE_RATE) {
    appLogger.error({ event: 'order_processing_failed', userId: req.user.id, productId });
    return res.status(503).json({ error: 'Order processing temporarily unavailable, please retry' });
  }

  const order = createOrder(req.user.id, Number(productId), Number(quantity));
  appLogger.info({ event: 'order_created', orderId: order.id, userId: req.user.id, total: order.total });
  res.status(201).json(order);
});

module.exports = router;
