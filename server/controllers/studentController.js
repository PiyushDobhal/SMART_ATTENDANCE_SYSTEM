const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");

// Student login
exports.studentLogin = async (req, res) => {
  try {
    // 1) normalize & log the incoming email
    const emailIn = (req.body.email || "")
      .toLowerCase()
      .trim();
    console.log("🔑 Login attempt for:", JSON.stringify(emailIn));

    // 2) lookup
    const student = await Student.findOne({ email: emailIn });
    console.log(
      "🔍 Student found:",
      student ? JSON.stringify(student.email) : "none"
    );
    if (!student)
      return res.status(404).json({ message: "Student not found" });

    // 3) bcrypt check
    const isMatch = await bcrypt.compare(req.body.password, student.password);
    console.log("🛡️  Password match:", isMatch);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid password" });

    // 4) success!
    const token = jwt.sign({ id: student._id }, process.env.JWT_SECRET);
    return res.json({ token });
  } catch (err) {
    console.error("🔥 Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Upload face descriptor
exports.uploadFace = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.faceDescriptor = req.body.descriptor; // 128D array
    await student.save();

    res.json({ message: "Face registered successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Register fingerprint slot ↔ student
exports.registerFingerprint = async (req, res) => {
  try {
    const { studentId, templateId } = req.body;
    if (templateId == null)
      return res.status(400).json({ message: "Missing templateId" });

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ message: "Student not found" });

    student.fingerprintId = templateId;
    await student.save();
    res.json({ message: "Fingerprint linked", fingerprintId: templateId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get attendance records
exports.getAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ studentId: req.user.id });
    const formatted = records.map((r) => ({
      date: r.date.toISOString().split("T")[0],
      status: r.status,
    }));
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get all descriptors (for hardware matching )
exports.getAllDescriptors = async (req, res) => {
  try {
    const students = await Student.find(
      {},
      "_id name sapId email faceDescriptor fingerprintId"
    );
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Mark attendance (face and fingerprint)
exports.markAttendance = async (req, res) => {
  try {
    const { studentId, templateId } = req.body;
    let student;

    if (studentId) {
      student = await Student.findById(studentId);
    } else if (templateId != null) {
      student = await Student.findOne({ fingerprintId: templateId });
    }

    if (!student) return res.status(404).json({ message: "Student not found" });

    const record = new Attendance({
      studentId: student._id,
      status: "present",
    });
    await record.save();

    // Real-time push via Socket.IO
    global._io.emit("attendance-updated", {
      studentId: student._id,
      name: student.name,
      sapId: student.sapId,
    });

    res.json({ message: "Attendance marked" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get student profile
exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user.id, "name sapId email");
    if (!student) return res.status(404).json({ message: "Not found" });
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update student profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, sapId } = req.body;
    const student = await Student.findById(req.user.id);
    if (!student) return res.status(404).json({ message: "Not found" });

    if (name) student.name = name;
    if (sapId) student.sapId = sapId;
    await student.save();

    res.json({
      message: "Profile updated",
      name: student.name,
      sapId: student.sapId,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
