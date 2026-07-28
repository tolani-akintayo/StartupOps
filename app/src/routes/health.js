const express = require('express');
const router = express.Router();

const startedAt = Date.now();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
