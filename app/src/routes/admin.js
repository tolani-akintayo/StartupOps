const express = require('express');
const router = express.Router();
const { users, products, orders } = require('../data/store');

// Vulnerability 4 (planted): this "internal" stats endpoint was never wired
// up with requireAuth. It leaks business metrics to anyone who finds it —
// a realistic broken-access-control / misconfiguration finding. The traffic
// generator occasionally hits this route to simulate an attacker probing for
// exactly this kind of accidental exposure.
router.get('/admin/stats', (req, res) => {
  res.json({
    totalUsers: users.length,
    totalOrders: orders.length,
    totalRevenue: Number(orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)),
    productCount: products.length,
    generatedAt: new Date().toISOString(),
  });
});

module.exports = router;
