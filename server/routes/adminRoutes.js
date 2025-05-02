// server/routes/adminRoutes.js
const express = require("express");
const router  = express.Router();
const {
  adminLogin,
  getAttendanceSummary,
  deleteStudent,
  createStudent,
  attendanceSummary,      // ← import the new controller
} = require("../controllers/adminController");

router.post("/login", adminLogin);
router.get("/attendance", getAttendanceSummary);

router.delete("/students/:id", deleteStudent);
router.post("/students", createStudent);

// New: per‑student attendance summary
router.get(
  "/students/:id/attendance-summary",
  attendanceSummary
);

module.exports = router;
