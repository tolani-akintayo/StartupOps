const pinoHttp = require('pino-http');
const { accessDestination } = require('../logger');

// One JSON line per request: method, url, status, responseTime, ip, requestId.
// This is the primary feed for the Data Analysis track and one of the feeds
// the Security track will use to spot scanning / abuse patterns.
const requestLogger = pinoHttp({
  stream: accessDestination,
  customProps: (req) => ({
    userId: req.user ? req.user.id : null,
  }),
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  // Trust X-Forwarded-For so the traffic generator can simulate different
  // client IPs (mirrors a real deployment behind a load balancer).
  genReqId: (req) => req.headers['x-request-id'] || require('crypto').randomUUID(),
});

module.exports = requestLogger;
