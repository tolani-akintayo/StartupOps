const pino = require('pino');
const path = require('path');
const fs = require('fs');

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '..', 'logs');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Three separate log streams on purpose:
//  - app.log    -> application/system events (startup, errors, business logic)
//  - access.log -> one line per HTTP request (used by pino-http in requestLogger.js)
//  - auth.log   -> authentication attempts only (this is what the Security + Data
//                  tracks will mine for brute-force / anomaly detection)
//
// Each is shipped to its own CloudWatch log group — see infrastructure/cloudwatch-agent-config.json

const appLogger = pino(
  { level: 'info', base: { service: 'startup-capstone-api' } },
  pino.destination(path.join(LOG_DIR, 'app.log'))
);

const authLogger = pino(
  { level: 'info', base: { service: 'startup-capstone-api', stream: 'auth' } },
  pino.destination(path.join(LOG_DIR, 'auth.log'))
);

// Access logger target used by pino-http (writes JSON per-request lines)
const accessDestination = pino.destination(path.join(LOG_DIR, 'access.log'));

module.exports = { appLogger, authLogger, accessDestination, LOG_DIR };
