let enrolEnabled = false;

exports.toggleEnrol = (req, res) => {
  enrolEnabled = !enrolEnabled;
  global._io.emit("enrol-mode", enrolEnabled); // push to ESP32
  res.json({ enrolEnabled });
};

exports.getEnrolState = (_, res) => res.json({ enrolEnabled });

/* PUT fingerprint slot after Arduino has enrolled */
const Student = require("../models/Student");
exports.setFingerprint = async (req, res) => {
  const { sapId } = req.params;
  const { fingerprintId } = req.body;

  if (typeof fingerprintId !== "number")
    return res.status(400).json({ message: "fingerprintId must be number" });

  const stu = await Student.findOneAndUpdate(
    { sapId },
    { fingerprintId },
    { new: true }
  );
  if (!stu) return res.status(404).json({ message: "Student not found" });
  res.json({ message: "Fingerprint saved", sapId, fingerprintId });
};
