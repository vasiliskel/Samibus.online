'use strict';

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'samibus-dev-secret-change-me';
const EXPIRES_IN = '8h';

function sign(user) {
  return jwt.sign({ sub: user.id, username: user.username }, SECRET, { expiresIn: EXPIRES_IN });
}

// Express middleware that rejects requests without a valid bearer token.
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { sign, requireAuth };
