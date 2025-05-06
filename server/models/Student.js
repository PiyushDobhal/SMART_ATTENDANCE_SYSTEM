const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema({
  email: String,
  password: String,
  faceDescriptor: { type: [Number], default: [] },
  name: { type: String, default: "" },
  sapId: { type: String, default: "" },
  fingerprintId: { type: Number, default: null },
});

// hash on save…
studentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("Student", studentSchema, "STUDENTS");
