const express = require('express');
const router = express.Router();
const { products } = require('../data/store');

router.get('/products', (req, res) => {
  res.json(products);
});

router.get('/products/:id', (req, res) => {
  const product = products.find((p) => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

module.exports = router;
