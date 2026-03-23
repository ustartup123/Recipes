const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
const recipesRouter = require('./routes/recipes');
const aiRouter = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

// API Routes
app.use('/api/recipes', recipesRouter);
app.use('/api/ai', aiRouter);

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
