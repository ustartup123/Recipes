const { OAuth2Client } = require('google-auth-library');
const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

function getClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not set');
  }
  return new OAuth2Client(clientId);
}

// Verify Google ID token and attach user to request
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const client = getClient();
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    // Find or create user
    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(payload.sub);

    if (!user) {
      const id = uuidv4();
      db.prepare(
        'INSERT INTO users (id, google_id, email, name, picture) VALUES (?, ?, ?, ?, ?)'
      ).run(id, payload.sub, payload.email, payload.name, payload.picture);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      // Update user info on each login
      db.prepare(
        'UPDATE users SET email = ?, name = ?, picture = ? WHERE google_id = ?'
      ).run(payload.email, payload.name, payload.picture, payload.sub);
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth error:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authMiddleware };
