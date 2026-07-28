/**
 * Traffic generator for the startup-capstone-api.
 *
 * Runs continuously, firing a variable rate of requests that mimics real
 * SaaS usage (quiet overnight, peaks mid-day), producing:
 *   - normal browsing/purchase traffic (Data track's primary dataset)
 *   - a steady mix of valid/invalid logins (auth.log signal)
 *   - occasional 5xx errors (from the API's built-in simulated failure rate)
 *   - periodic brute-force bursts and admin-endpoint probes (Security signal)
 *
 * Requires Node 18+ (uses global fetch).
 */

const cfg = require('./config');

function log(msg, extra = {}) {
  console.log(`[${new Date().toISOString()}] ${msg}`, Object.keys(extra).length ? extra : '');
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickIp() {
  return cfg.NORMAL_IPS[randomInt(0, cfg.NORMAL_IPS.length - 1)];
}

function weightedChoice(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    if (r < w) return key;
    r -= w;
  }
  return entries[entries.length - 1][0];
}

function currentMultiplier() {
  const hour = new Date().getHours();
  return cfg.HOURLY_MULTIPLIERS[hour];
}

async function request(path, options = {}, ip = pickIp()) {
  const url = `${cfg.BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    'X-Forwarded-For': ip,
    'User-Agent': 'capstone-traffic-generator/1.0',
    ...(options.headers || {}),
  };
  try {
    const res = await fetch(url, { ...options, headers });
    return res;
  } catch (err) {
    log('request_failed', { path, error: err.message });
    return null;
  }
}

// --- session cache so createOrder/viewOrders/viewUserProfile have a token ---
const sessions = new Map(); // username -> { token, expiresAt }

async function getToken(username, password) {
  const cached = sessions.get(username);
  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const res = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (!res || !res.ok) return null;
  const data = await res.json();
  sessions.set(username, { token: data.token, expiresAt: Date.now() + 60 * 60 * 1000 });
  return data.token;
}

function randomValidUser() {
  return cfg.VALID_USERS[randomInt(0, cfg.VALID_USERS.length - 1)];
}

// --- individual simulated actions ---

async function browseProducts() {
  await request('/api/products');
}

async function viewProduct() {
  await request(`/api/products/${randomInt(1, 6)}`);
}

async function login() {
  const isInvalid = Math.random() < cfg.INVALID_LOGIN_RATE;
  if (isInvalid) {
    const fakeUsers = ['guest', 'test', 'user1', 'newuser', randomValidUser().username];
    await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: fakeUsers[randomInt(0, fakeUsers.length - 1)], password: 'wrongpass123' }),
    });
    return;
  }
  const u = randomValidUser();
  await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: u.username, password: u.password }),
  });
}

async function register() {
  const id = randomInt(10000, 99999);
  await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username: `user${id}`, email: `user${id}@example.com`, password: `Pass${id}!` }),
  });
}

async function createOrder() {
  const u = randomValidUser();
  const token = await getToken(u.username, u.password);
  if (!token) return;
  await request('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ productId: randomInt(1, 6), quantity: randomInt(1, 3) }),
  });
}

async function viewOrders() {
  const u = randomValidUser();
  const token = await getToken(u.username, u.password);
  if (!token) return;
  await request('/api/orders', { headers: { Authorization: `Bearer ${token}` } });
}

async function viewUserProfile() {
  const u = randomValidUser();
  const token = await getToken(u.username, u.password);
  if (!token) return;
  // Occasionally requests a different user's id than the one logged in —
  // this is what generates real IDOR traffic for the Security track to spot.
  await request(`/api/users/${randomInt(1, 4)}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function probeAdminStats() {
  await request('/api/admin/stats', {}, cfg.SUSPICIOUS_IP);
}

const ACTIONS = {
  browseProducts,
  viewProduct,
  login,
  register,
  createOrder,
  viewOrders,
  viewUserProfile,
  probeAdminStats,
};

// --- main tick loop ---

async function tick() {
  const n = Math.max(0, Math.round(cfg.BASE_REQUESTS_PER_TICK * currentMultiplier() * (0.7 + Math.random() * 0.6)));
  for (let i = 0; i < n; i++) {
    const action = weightedChoice(cfg.ACTION_WEIGHTS);
    ACTIONS[action]().catch((err) => log('action_error', { action, error: err.message }));
  }
}

// --- brute-force burst simulation ---

async function runBruteForceBurst() {
  log('BRUTE_FORCE_BURST_START', { attempts: cfg.BRUTE_FORCE_ATTEMPTS, ip: cfg.SUSPICIOUS_IP });
  for (let i = 0; i < cfg.BRUTE_FORCE_ATTEMPTS; i++) {
    await request(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ username: 'admin', password: `guess${randomInt(1, 9999)}` }) },
      cfg.SUSPICIOUS_IP
    );
    await new Promise((r) => setTimeout(r, cfg.BRUTE_FORCE_INTERVAL_MS));
  }
  log('BRUTE_FORCE_BURST_END');
}

function scheduleNextBurst() {
  const dayMs = 24 * 60 * 60 * 1000;
  const perDay = cfg.BRUTE_FORCE_BURSTS_PER_DAY;
  for (let i = 0; i < perDay; i++) {
    const delay = randomInt(0, dayMs);
    setTimeout(async () => {
      await runBruteForceBurst();
    }, delay);
  }
  // Reschedule the next day's bursts a bit after this day's window closes.
  setTimeout(scheduleNextBurst, dayMs);
}

// --- entrypoint ---

function main() {
  log('traffic_generator_started', { target: cfg.BASE_URL, tickMs: cfg.TICK_INTERVAL_MS });
  setInterval(tick, cfg.TICK_INTERVAL_MS);
  scheduleNextBurst();
}

main();
