const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Attendance = require("../models/Attendance");

exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email });
  if (!admin) return res.status(400).json({ message: "Invalid credentials" });

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  res.json({ token });
};

exports.getAttendanceSummary = async (req, res) => {
  const attendance = await Attendance.find().populate("studentId", "name sapId email");
  const stats = {
    present: attendance.filter(a => a.status === "present").length,
    absent:  attendance.filter(a => a.status === "absent").length,
  };
  // Send back the full student list with name & sapId
  const students = await Student.find({}, "name sapId email");
  res.json({ stats, students });
};

// DELETE /api/admin/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await Student.findByIdAndDelete(id);
    await Attendance.deleteMany({ studentId: id });
    return res.json({ message: "Student and attendance deleted" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to delete student" });
  }
};

// POST /api/admin/students
exports.createStudent = async (req, res) => {
  try {
    const { name, sapId } = req.body;
    // 1) count existing
    const count = await Student.countDocuments();
    const email = `student${count + 1}@gmail.com`;
    // 2) default password
    const defaultPass = "123456";
    const hashed      = await bcrypt.hash(defaultPass, 10);
    // 3) create
    const student = new Student({
      email,
      password: hashed,
      name,
      sapId,
      faceDescriptor: []
    });
    await student.save();
    return res.status(201).json({
      message: "Student created",
      student: { _id: student._id, email, name, sapId }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Failed to create student" });
  }
};
exports.attendanceSummary = async (req, res) => {
  try {
    const studentId = req.params.id;

    // 1) how many days this student was present:
    const presentCount = await Attendance
      .find({ studentId })
      .distinct("date")
      .then(dates => dates.length);

    // 2) how many total session‑days were ever taken:
    const totalSessions = await Attendance
      .distinct("date")
      .then(dates => dates.length);

    // 3) absents = sessions – presents
    const absentCount = totalSessions - presentCount;

    return res.json({
      present: presentCount,
      absent:  absentCount,
    });
  } catch (err) {
    console.error("attendanceSummary error:", err);
    return res
      .status(500)
      .json({ message: "Failed to compute attendance summary" });
  }
};
