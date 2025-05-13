const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {
  studentLogin,
  uploadFace,
  getAttendance,
  getAllDescriptors,
  markAttendance,
  getProfile,
  updateProfile,
  registerFingerprint,
} = require("../controllers/studentController");

// Public: login only
router.post("/login", studentLogin);

// All routes below require a valid JWT
router.use(auth);

// Profile endpoints
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

// Face descriptor upload
router.post("/upload-face", uploadFace);

// Fingerprint enrollment link
router.post("/register-fingerprint", registerFingerprint);

// Attendance endpoints
router.get("/attendance", getAttendance);
router.get("/all-descriptors", getAllDescriptors);
router.post("/mark-attendance", markAttendance);

module.exports = router;
