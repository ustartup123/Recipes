require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
const recipesRouter = require('./routes/recipes');
const aiRouter = require('./routes/ai');
const authRouter = require('./routes/auth');
const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : null;
app.use(cors(allowedOrigins ? { origin: allowedOrigins } : {}));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Simple rate limiter for AI endpoints (prevent API key abuse)
const aiRateLimit = new Map();
const AI_RATE_LIMIT = 30; // max requests per window
const AI_RATE_WINDOW = 60 * 1000; // 1 minute
app.use('/api/ai', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = aiRateLimit.get(ip);
  if (!entry || now - entry.start > AI_RATE_WINDOW) {
    aiRateLimit.set(ip, { start: now, count: 1 });
    return next();
  }
  entry.count++;
  if (entry.count > AI_RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  next();
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/recipes', authMiddleware, recipesRouter);
app.use('/api/ai', authMiddleware, aiRouter);

// SPA fallback for production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

// Initialize database and start server
initDatabase();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
