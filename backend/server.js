const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(cors());               // Allow requests from your frontend (different port)
app.use(express.json());       // Parse JSON request bodies

// ── Routes ───────────────────────────────────────────────────
app.use('/api/dashboard',        require('./routes/dashboard'));
app.use('/api/districts',        require('./routes/districts'));
app.use('/api/consumers',        require('./routes/consumers'));
app.use('/api/staff',            require('./routes/staff'));
app.use('/api/meters',           require('./routes/meters'));
app.use('/api/billing',          require('./routes/billing'));
app.use('/api/payments',         require('./routes/payments'));
app.use('/api/service-requests', require('./routes/serviceRequests'));

// ── Health check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'TapControl API running' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TapControl API → http://localhost:${PORT}`);
});
