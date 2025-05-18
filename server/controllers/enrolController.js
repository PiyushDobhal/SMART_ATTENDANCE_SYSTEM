// server/controllers/enrolController.js
const Student    = require("../models/Student");
const Attendance = require("../models/Attendance");

// import the same Set instance used by faceController
const { processingDevices } = require("./faceController");

function getDeviceKey(req) {
  if (req.ip === '::1' || req.ip === '127.0.0.1') {
    return 'localhost';
  }
  return req.ip;
}


// enrolEnabled is always false; ESP only polls for it
let enrolEnabled = false;
exports.enrolEnabled = () => enrolEnabled;

// ESP32 POSTs here its Serial replies: ENROL_OK:<sapId>:<slot>, FINGER_OK:<slot> or FINGER_BAD
exports.handleFromDevice = async (req, res) => {
  const deviceKey = getDeviceKey(req); 
  const msg = (req.body || "").trim();
  console.log("[handleFromDevice] from", deviceKey, "msg=", req.body);
  // 1) Enrollment success
  if (msg.startsWith("ENROL_OK:")) {
    const [, sapId, slotStr] = msg.split(":");
    const fingerprintId = parseInt(slotStr, 10);
    if (!sapId || isNaN(fingerprintId)) {
      // clear the lock so ESP can retry
      processingDevices.delete(deviceKey);
      return res.status(400).json({ message: "Invalid ENROL_OK format" });
    }
    await Student.findOneAndUpdate(
      { sapId },
      { fingerprintId },
      { new: true }
    );
    // unlock device now that Arduino finished enrollment
    processingDevices.delete(deviceKey);
    return res.json({ message: `Enrolled ${sapId} → slot ${fingerprintId}` });
  }

  // 2) Fingerprint check success → record attendance
  if (msg.startsWith("FINGER_OK:")) {
    const [, slotStr] = msg.split(":");
    const fingerprintId = parseInt(slotStr, 10);
    if (isNaN(fingerprintId)) {
      processingDevices.delete(deviceKey);
      return res.status(400).json({ message: "Invalid FINGER_OK format" });
    }
    const stu = await Student.findOne({ fingerprintId });
    if (!stu) {
      processingDevices.delete(deviceKey);
      return res.status(404).json({ message: "Student slot not found" });
    }
    await Attendance.create({
      studentId: stu._id,
      status:    "present",
    });
    global._io.emit("attendance-updated", { sapId: stu.sapId });
    // unlock device now that Arduino finished checking
    processingDevices.delete(deviceKey);
    return res.json({ message: `Attendance recorded for ${stu.sapId}`, sapId: stu.sapId });
  }

  // 3) Fingerprint check failed
  if (msg === "FINGER_BAD") {
    // still clear lock so ESP can retry or enroll
    processingDevices.delete(deviceKey);
    return res.json({ message: "Fingerprint did not match" });
  }

  // 4) Unknown message — clear lock to prevent permanent block
  processingDevices.delete(deviceKey);
  return res.status(400).json({ message: "Unknown device message" });
};
