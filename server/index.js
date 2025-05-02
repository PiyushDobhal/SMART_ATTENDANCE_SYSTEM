// server/index.js
require("dotenv").config();
const path      = require("path");
const express   = require("express");
const cors      = require("cors");
const mongoose  = require("mongoose");
const http      = require("http");
const { Server } = require("socket.io");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "*" }
});
global._io = io;

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB Error", err));

// your API routes here…
app.use("/api/admin",    require("./routes/adminRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/face",     require("./routes/faceRoutes"));

// ─── IMPORTANT: serve the production bundle ───────────────────────────────
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));

// send back index.html on all non-API routes
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
