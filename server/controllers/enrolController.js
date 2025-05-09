// controllers/enrolController.js

let enrolEnabled = false;
const Student = require("../models/Student");
const Attendance = require("../models/Attendance"); // adjust path as needed

/**
 * Toggle enroll mode on/off.
 * POST /api/enrol/toggle
 */
exports.toggleEnrol = (req, res) => {
  enrolEnabled = !enrolEnabled;
  // push real‐time update to any WebSocket listeners (e.g. admin UI)
  global._io.emit("enrol-mode", enrolEnabled);
  return res.json({ enrolEnabled });
};

/**
 * Get current enroll state.
 * GET /api/enrol/status
 */
exports.getEnrolState = (req, res) => {
  return res.json({ enrolEnabled });
};

/**
 * Save the fingerprint slot after the Arduino enrolls a finger.
 * PUT /api/enrol/students/:sapId/fingerprint
 */
exports.setFingerprint = async (req, res) => {
  const { sapId } = req.params;
  const { fingerprintId } = req.body;

  if (typeof fingerprintId !== "number") {
    return res
      .status(400)
      .json({ message: "fingerprintId must be a number" });
  }

  const stu = await Student.findOneAndUpdate(
    { sapId },
    { fingerprintId },
    { new: true }
  );
  if (!stu) {
    return res.status(404).json({ message: "Student not found" });
  }

  return res.json({
    message: "Fingerprint slot saved",
    sapId,
    fingerprintId,
  });
};

/**
 * Handle messages from the ESP32/Arduino.
 * POST /api/enrol/from-device
 * Body (text/plain): "ENROL_OK:<sapId>:<slot>" or "FINGER_OK" or "FINGER_BAD"
 */
// controllers/enrolController.js

exports.handleFromDevice = async (req, res) => {
  const msg = req.body.trim();

  // --- Enrollment success: update fingerprint slot ---
  if (msg.startsWith("ENROL_OK:")) {
    const [, sapId, slotStr] = msg.split(":");
    const fingerprintId = parseInt(slotStr, 10);
    if (!sapId || isNaN(fingerprintId)) {
      return res.status(400).json({ message: "Invalid ENROL_OK format" });
    }
    await Student.findOneAndUpdate(
      { sapId },
      { fingerprintId },
      { new: true }
    );
    return res.json({ message: `Enrolled ${sapId} → slot ${fingerprintId}` });
  }

  // --- Fingerprint check success: record attendance ---
  if (msg.startsWith("FINGER_OK:")) {
    // msg is like "FINGER_OK:5"
    const [, slotStr] = msg.split(":");
    const fingerprintId = parseInt(slotStr, 10);
    if (isNaN(fingerprintId)) {
      return res.status(400).json({ message: "Invalid FINGER_OK format" });
    }

    // 1) find the student by slot
    const stu = await Student.findOne({ fingerprintId });
    if (!stu) {
      return res.status(404).json({ message: "Student slot not found" });
    }

    // 2) record attendance
    await Attendance.create({
      studentId: stu._id,
      status: "present",     // your schema’s default is "present"
    });

    return res.json({
      message: `Attendance recorded for ${stu.sapId}`,
      sapId: stu.sapId,
    });
  }

  // --- Fingerprint check failed ---
  if (msg === "FINGER_BAD") {
    return res.json({ message: "Fingerprint did not match" });
  }

  // --- Unknown message ---
  return res.status(400).json({ message: "Unknown device message" });
};

