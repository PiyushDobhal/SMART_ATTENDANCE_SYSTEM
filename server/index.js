/* server/index.js -------------------------------------------------------- */
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
  cors: { origin: process.env.CLIENT_URL || '*' }
});
global._io = io;

/* ────────────────────────  MIDDLEWARE  ──────────────────────── */
app.use(cors());
app.use(express.json());

/* ────────────────────────  DATABASE  ────────────────────────── */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB Error', err));

/* ────────────────────────  ROUTES  ──────────────────────────── */
app.use('/api/admin',    require('./routes/adminRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/face',     require('./routes/faceRoutes'));

/* ────────────────────────  STATIC BUILD  ───────────────────────
   Vite build copies files to  server/public/
   (see client/vite.config.js -> outDir = ../server/public)       */
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

/* All non‑API routes → React’s index.html */
app.get(/^(?!\/api).*/, (_, res) =>
  res.sendFile(path.join(publicPath, 'index.html'))
);

/* ────────────────────────  START  ───────────────────────────── */
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
