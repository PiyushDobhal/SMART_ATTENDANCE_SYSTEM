const express = require("express");
const router = express.Router();
const {
  adminLogin,
  getAttendanceSummary,
  deleteStudent,
  createStudent,
  attendanceSummary,
} = require("../controllers/adminController");

router.post("/login", adminLogin);
router.get("/attendance", getAttendanceSummary);

router.delete("/students/:id", deleteStudent);
router.post("/students", createStudent);

router.get("/students/:id/attendance-summary", attendanceSummary);

module.exports = router;
