require("dotenv").config();
const path     = require("path");
const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const http     = require("http");
const { Server } = require("socket.io");

// pull in our in-memory flag (always false now)
const enrolController = require("./controllers/enrolController");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: true },
});
global._io = io;

// CORS
const allowedOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((o) => o.trim());
app.use(cors({ origin: allowedOrigins, credentials: true }));

// Health check to keep your host awake
app.get("/health", (_, res) => res.sendStatus(200));

// “SUPER-LIGHT” enroll-status endpoint (ESP polls this)
app.get("/api/enrol/status", (req, res) => {
  // always false, but ESP only uses it to decide whether to suppress ENROL_ON/OFF
  return res.json({ enrolEnabled: enrolController.enrolEnabled() });
});

// body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(express.text());

// mongo
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB Error", err));

// API routes
app.use("/api/admin",    require("./routes/adminRoutes"));
app.use("/api/students", require("./routes/studentRoutes"));
app.use("/api/face",     require("./routes/faceRoutes"));
app.use("/api/enrol",    require("./routes/enrolRoutes"));

// serve React
const publicPath = path.join(__dirname, "public");
app.use(express.static(publicPath));
app.get(/^(?!\/api).*/, (_, res) =>
  res.sendFile(path.join(publicPath, "index.html"))
);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
