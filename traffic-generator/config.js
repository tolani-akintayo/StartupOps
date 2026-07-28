module.exports = {
  BASE_URL: process.env.TARGET_URL || 'http://localhost:3000',

  // How often the generator "ticks" and decides how many requests to fire.
  TICK_INTERVAL_MS: 10_000,

  // Baseline requests-per-tick at the quietest hour of the day. Actual volume
  // per tick = BASE_REQUESTS_PER_TICK * hourMultiplier(currentHour), jittered.
  BASE_REQUESTS_PER_TICK: 2,

  // 24 values, one per hour (0-23, local server time), modeling a typical
  // SaaS traffic curve: quiet overnight, ramps up during business hours,
  // peaks mid-afternoon, tapers into the evening.
  HOURLY_MULTIPLIERS: [
    0.2, 0.15, 0.1, 0.1, 0.15, 0.3, // 00-05
    0.6, 1.0, 1.6, 2.0, 2.3, 2.5,   // 06-11
    2.6, 2.4, 2.5, 2.6, 2.3, 1.9,   // 12-17
    1.5, 1.1, 0.8, 0.6, 0.4, 0.3,   // 18-23
  ],

  // Relative weights for which action a simulated visitor takes this tick.
  ACTION_WEIGHTS: {
    browseProducts: 35,
    viewProduct: 20,
    login: 20,
    register: 5,
    createOrder: 12,
    viewOrders: 6,
    viewUserProfile: 1.5, // occasionally probes another user's id (IDOR traffic)
    probeAdminStats: 0.5, // occasional "recon" hit on the exposed admin endpoint
  },

  // Credentials the generator knows are valid, used to weight realistic
  // successful logins. Anything outside this list is a deliberately invalid
  // attempt (wrong password / made-up username), which is what feeds the
  // Security track's failed-login analysis.
  VALID_USERS: [
    { username: 'alice', password: 'Alice#2024' },
    { username: 'bob', password: 'Bob#2024' },
    { username: 'carol', password: 'Carol#2024' },
  ],

  // Chance that a login attempt is intentionally invalid (wrong password or
  // unknown username), simulating typos, expired sessions, and casual
  // credential-stuffing background noise.
  INVALID_LOGIN_RATE: 0.35,

  // Simulated source IPs. A handful are treated as "regular" residential/
  // office IPs; a couple are reused deliberately across many requests to
  // create a recognizable pattern for log-based investigation.
  NORMAL_IPS: [
    '41.203.72.14', '105.112.44.9', '197.210.28.61',
    '154.113.16.203', '102.89.44.17', '41.184.9.201',
  ],

  // Used only by the brute-force burst simulation below.
  SUSPICIOUS_IP: '185.220.101.7',

  // Brute-force burst: roughly this many times per 24h of continuous running,
  // the generator fires a rapid sequence of failed admin logins from a single
  // IP. This is the "attack" the Security track should be able to find in
  // auth.log and that the CloudWatch alarm (see infrastructure/) should catch.
  BRUTE_FORCE_BURSTS_PER_DAY: 2,
  BRUTE_FORCE_ATTEMPTS: 25,
  BRUTE_FORCE_INTERVAL_MS: 1500,
};
