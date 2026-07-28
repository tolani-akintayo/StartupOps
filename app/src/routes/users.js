const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { users } = require('../data/store');

// Vulnerability 3 (planted): broken object-level access control. Any
// authenticated user can fetch any other user's profile by guessing the id —
// there's no check that req.user.id matches the requested :id. This is a
// standard IDOR (insecure direct object reference) finding for the Security
// track to identify, document, and propose a fix for.
router.get('/users/:id', requireAuth, (req, res) => {
  const user = users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

module.exports = router;
