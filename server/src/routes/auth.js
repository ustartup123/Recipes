const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/auth/google - verify Google token and return user
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'Google OAuth is not configured' });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    const db = getDb();
    let user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(payload.sub);

    if (!user) {
      const id = uuidv4();
      db.prepare(
        'INSERT INTO users (id, google_id, email, name, picture) VALUES (?, ?, ?, ?, ?)'
      ).run(id, payload.sub, payload.email, payload.name, payload.picture);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      db.prepare(
        'UPDATE users SET email = ?, name = ?, picture = ? WHERE google_id = ?'
      ).run(payload.email, payload.name, payload.picture, payload.sub);
      user = db.prepare('SELECT * FROM users WHERE google_id = ?').get(payload.sub);
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      token: credential, // Pass back the Google ID token for subsequent requests
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ error: 'Invalid Google credential' });
  }
});

// GET /api/auth/client-id - return the Google Client ID for the frontend
router.get('/client-id', (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Google OAuth is not configured' });
  }
  res.json({ clientId });
});

module.exports = router;
