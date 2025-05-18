const Student    = require("../models/Student");
const Attendance = require("../models/Attendance");

// enrolEnabled is always false; ESP only polls for it
let enrolEnabled = false;
exports.enrolEnabled = () => enrolEnabled;

// // (Optional) manually assign a slot
// exports.setFingerprint = async (req, res) => {
//   const { sapId } = req.params;
//   const { fingerprintId } = req.body;
//   if (typeof fingerprintId !== "number") {
//     return res.status(400).json({ message: "fingerprintId must be a number" });
//   }
//   const stu = await Student.findOneAndUpdate(
//     { sapId },
//     { fingerprintId },
//     { new: true }
//   );
//   if (!stu) return res.status(404).json({ message: "Student not found" });
//   return res.json({ message: "Fingerprint slot saved", sapId, fingerprintId });
// };

// ESP32 POSTs here its Serial replies: ENROL\_OK:…, FINGER\_OK:… or FINGER\_BAD
exports.handleFromDevice = async (req, res) => {
const msg = (req.body || "").trim();

// 1) Enrollment success
if (msg.startsWith("ENROL\_OK:")) {
const [, sapId, slotStr] = msg.split(":");
const fingerprintId = parseInt(slotStr, 10);
if (!sapId || isNaN(fingerprintId)) {
return res.status(400).json({ message: "Invalid ENROL_OK format" });
}
await Student.findOneAndUpdate({ sapId }, { fingerprintId }, { new: true });
return res.json({ message: `Enrolled ${sapId} → slot ${fingerprintId}` });
}

// 2) Fingerprint check success → record attendance
if (msg.startsWith("FINGER_OK:")) {
const [, slotStr] = msg.split(":");
const fingerprintId = parseInt(slotStr, 10);
if (isNaN(fingerprintId)) {
return res.status(400).json({ message: "Invalid FINGER_OK format" });
}
const stu = await Student.findOne({ fingerprintId });
if (!stu) {
return res.status(404).json({ message: "Student slot not found" });
}
await Attendance.create({
studentId: stu._id,
status:    "present",
});
global._io.emit("attendance-updated", { sapId: stu.sapId });
return res.json({ message: `Attendance recorded for ${stu.sapId}`, sapId: stu.sapId });
}

// 3) Fingerprint check failed
if (msg === "FINGER_BAD") {
return res.json({ message: "Fingerprint did not match" });
}

// 4) Unknown
return res.status(400).json({ message: "Unknown device message" });
};
