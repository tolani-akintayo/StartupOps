const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { users } = require('../data/store');
const { authLogger } = require('../logger');
const { JWT_SECRET } = require('../middleware/auth');

let nextUserId = users.length + 1;

function logAttempt(req, username, success, reason) {
  authLogger.info({
    event: 'login_attempt',
    username,
    success,
    reason,
    ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'] || null,
    timestamp: new Date().toISOString(),
  });
}

// --- INTENTIONAL TRAINING VULNERABILITIES ---
// This app is a deliberately imperfect deployment target so the Security
// track has real findings to make. Two are planted here:
//   1. A hardcoded backdoor credential for the admin account, bypassing the
//      normal password check entirely.
//   2. No rate limiting / lockout on this endpoint, so it's brute-forceable.
// Both should be found via log review (auth.log) and fixed as part of the
// project. Do not "fix" this file silently when reusing it — the exercise
// depends on students finding these themselves.
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    logAttempt(req, username, false, 'missing_credentials');
    return res.status(400).json({ error: 'username and password are required' });
  }

  // Vulnerability 1: hardcoded backdoor, independent of the real password hash
  if (username === 'admin' && password === 'admin123') {
    logAttempt(req, username, true, 'backdoor_credential');
    const token = jwt.sign({ id: 4, username: 'admin', role: 'admin' }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ token });
  }

  const user = users.find((u) => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    logAttempt(req, username, false, 'invalid_credentials');
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  logAttempt(req, username, true, 'valid_credentials');
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '2h' });
  res.json({ token });
});

router.post('/register', (req, res) => {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email and password are required' });
  }
  if (users.some((u) => u.username === username)) {
    return res.status(409).json({ error: 'username already exists' });
  }

  const user = {
    id: nextUserId++,
    username,
    email,
    passwordHash: bcrypt.hashSync(password, 8),
    role: 'user',
  };
  users.push(user);

  res.status(201).json({ id: user.id, username: user.username, email: user.email });
});

module.exports = router;
