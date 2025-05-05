/* server/index.js  */
require('dotenv').config();
const path       = require('path');
const express    = require('express');
const cors       = require('cors');
const mongoose   = require('mongoose');
const http       = require('http');
const { Server } = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: true }              // Socket.IO → reflect caller’s origin
});
global._io = io;

/* ───────────────  CORS (REST endpoints)  ──────────────── */
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(o => o.trim());

app.use(
  cors({
    origin: allowedOrigins,   // <-- array of strings
    credentials: true,        // only if you ever send cookies
  })
);

app.use(express.json());

/* ───────────────  DATABASE  ─────────────── */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB Error', err));

/* ───────────────  API ROUTES  ───────────── */
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/face',     require('./routes/faceRoutes'));

/* ───────────────  STATIC REACT BUILD  ────── */
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

/* Single‑page‑app fallback (after static): */
app.get(/^(?!\/api).*/, (_, res) =>
  res.sendFile(path.join(publicPath, 'index.html'))
);

/* ───────────────  START  ─────────────────── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
