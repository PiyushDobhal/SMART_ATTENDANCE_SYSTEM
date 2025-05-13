// controllers/adminController.js

const jwt        = require("jsonwebtoken");
const bcrypt     = require("bcryptjs");
const Admin      = require("../models/Admin");
const Student    = require("../models/Student");
const Attendance = require("../models/Attendance");

let enrolEnabled = false;

// ─── Admin login ─────────────────────────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (err) {
    console.error("adminLogin error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─── List students & attendance summary ──────────────────────────────
exports.getAttendanceSummary = async (req, res) => {
  try {
    const attendance = await Attendance
      .find()
      .populate("studentId", "name sapId email");
    const stats = {
      present: attendance.filter(a => a.status === "present").length,
      absent:  attendance.filter(a => a.status === "absent").length,
    };
    const students = await Student.find({}, "name sapId email");
    res.json({ stats, students });
  } catch (err) {
    console.error("getAttendanceSummary error:", err);
    res.status(500).json({ message: "Failed to load summary" });
  }
};

// ─── Delete student & their attendance ───────────────────────────────
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    await Attendance.deleteMany({ studentId: id });
    res.json({ message: "Student and attendance deleted" });
  } catch (err) {
    console.error("deleteStudent error:", err);
    res.status(500).json({ message: "Failed to delete student" });
  }
};

// ─── Create new student (uses schema hook to hash once) ──────────────
exports.createStudent = async (req, res) => {
  try {
    const { name, sapId } = req.body;

    // 1) Count existing students
    const count = await Student.countDocuments();

    // 2) Generate email
    const email = `student${count + 1}@gmail.com`.toLowerCase().trim();

    // 3) Default password (plain)
    const defaultPass = "123456";

    // 4) Create and save; the pre('save') hook in Student model will hash it
    const student = new Student({
      email,
      password: defaultPass,
      name: name.trim(),
      sapId: sapId.trim(),
      faceDescriptor: []
    });
    await student.save();

    // 5) Return credentials so admin can share them
    res.status(201).json({
      message: "Student created",
      student: { _id: student._id, email, name: student.name, sapId: student.sapId },
      defaultPass
    });
  } catch (err) {
    console.error("createStudent error:", err);
    res.status(500).json({ message: "Failed to create student" });
  }
};

// ─── Per-student attendance summary ──────────────────────────────────
exports.attendanceSummary = async (req, res) => {
  try {
    const studentId = req.params.id;
    const presentCount = await Attendance
      .find({ studentId, status: "present" })
      .distinct("date")
      .then(dates => dates.length);

    const totalSessions = await Attendance
      .distinct("date")
      .then(dates => dates.length);

    res.json({
      present: presentCount,
      absent:  totalSessions - presentCount,
    });
  } catch (err) {
    console.error("attendanceSummary error:", err);
    res.status(500).json({ message: "Failed to compute attendance summary" });
  }
};

// ─── Toggle fingerprint enroll mode ─────────────────────────────────
exports.toggleEnrol = (req, res) => {
  enrolEnabled = !enrolEnabled;
  global._io.emit("enrol-mode", enrolEnabled);
  res.json({ enrolEnabled });
};

// ─── Read current enroll state ──────────────────────────────────────
exports.getEnrolState = (_, res) => {
  res.json({ enrolEnabled });
};

// ─── Handle plain‐text from Arduino (via ESP32) ──────────────────────
exports.handleFromDevice = async (req, res) => {
  const msg = req.body.trim();

  if (msg.startsWith("ENROL_OK:")) {
    const [, sapId, slotStr] = msg.split(":");
    const fingerprintId = parseInt(slotStr, 10);
    if (!sapId || isNaN(fingerprintId)) {
      return res.status(400).json({ message: "Invalid ENROL_OK format" });
    }
    await Student.findOneAndUpdate({ sapId }, { fingerprintId });
    return res.json({ message: `Enrolled ${sapId} → slot ${fingerprintId}` });
  }

  if (msg.startsWith("FINGER_OK:")) {
    const [, slotStr] = msg.split(":");
    const fingerprintId = parseInt(slotStr, 10);
    if (isNaN(fingerprintId)) {
      return res.status(400).json({ message: "Invalid FINGER_OK format" });
    }
    const stu = await Student.findOne({ fingerprintId });
    if (!stu) return res.status(404).json({ message: "Student slot not found" });

    await Attendance.create({ studentId: stu._id, status: "present" });
    return res.json({ message: `Attendance recorded for ${stu.sapId}` });
  }

  if (msg === "FINGER_BAD") {
    return res.json({ message: "Fingerprint did not match" });
  }

  return res.status(400).json({ message: "Unknown device message" });
};
