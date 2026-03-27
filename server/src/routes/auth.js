const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const { v4: uuidv4 } = require('uuid');
const { findUserByGoogleId, createUser, updateUser } = require('../database');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/google - verify Google token and return user + JWT
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

    let user = await findUserByGoogleId(payload.sub);

    if (!user) {
      const id = uuidv4();
      user = await createUser(id, payload.sub, payload.email, payload.name, payload.picture);
    } else {
      await updateUser(payload.sub, payload.email, payload.name, payload.picture);
      user = await findUserByGoogleId(payload.sub);
    }

    // Issue our own long-lived JWT instead of passing back the Google ID token
    const token = signToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      token,
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
