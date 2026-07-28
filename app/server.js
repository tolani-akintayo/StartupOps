require('dotenv').config();
const express = require('express');

const { appLogger } = require('./src/logger');
const requestLogger = require('./src/middleware/requestLogger');

app.get('/', (req, res) => {
  res.json({
    service: 'startup-capstone-api',
    status: 'running',
    endpoints: ['/health', '/api/products', '/api/auth/login', '/api/orders', '/api/users/:id', '/api/admin/stats'],
  });
});

const healthRoute = require('./src/routes/health');
const authRoute = require('./src/routes/auth');
const productsRoute = require('./src/routes/products');
const ordersRoute = require('./src/routes/orders');
const usersRoute = require('./src/routes/users');
const adminRoute = require('./src/routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(requestLogger);

app.use('/', healthRoute);
app.use('/api/auth', authRoute);
app.use('/api', productsRoute);
app.use('/api', ordersRoute);
app.use('/api', usersRoute);
app.use('/api', adminRoute);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  appLogger.error({ event: 'unhandled_error', message: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => {
  appLogger.info({ event: 'server_started', port: PORT });
  // eslint-disable-next-line no-console
  console.log(`startup-capstone-api listening on :${PORT}`);
});

function shutdown(signal) {
  appLogger.info({ event: 'server_shutdown', signal });
  server.close(() => process.exit(0));
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
