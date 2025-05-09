process.env.TFJS_DISABLE_BANNER = "true";
require("@tensorflow/tfjs-backend-cpu");
const tf = require("@tensorflow/tfjs");
tf.setBackend("cpu");

const faceapi = require("face-api.js");
const { Canvas, Image, ImageData } = require("canvas");

const path = require("path");
const Student = require("../models/Student");

// Polyfill for face-api.js to use node-canvas and fetch
faceapi.env.monkeyPatch({ Canvas, Image, ImageData, fetch: global.fetch });

// Load models once at startup
let modelsLoaded = false;
async function loadModels() {
  const modelPath = path.join(__dirname, "../models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  modelsLoaded = true;
}
loadModels().catch((err) => console.error("Model loading error:", err));

// POST /api/face/identify
exports.identify = async (req, res) => {
  try {
    if (!modelsLoaded) {
      return res.status(503).json({ message: "Face models not loaded yet" });
    }

    const inputDescriptor = req.body.descriptor;
    if (!Array.isArray(inputDescriptor) || inputDescriptor.length !== 128) {
      return res.status(400).json({ message: "Invalid descriptor" });
    }

    // fetch only needed fields
    const students = await Student.find(
      {},
      "_id name sapId faceDescriptor fingerprintId"
    );

    let bestMatch = null;
    let minDistance = 0.6;

    for (const stu of students) {
      if (
        !Array.isArray(stu.faceDescriptor) ||
        stu.faceDescriptor.length !== 128
      )
        continue;
      const dist = faceapi.euclideanDistance(
        inputDescriptor,
        stu.faceDescriptor
      );
      if (dist < minDistance) {
        minDistance = dist;
        bestMatch = stu;
      }
    }

    if (bestMatch) {
      return res.json({
        recognized: true,
        studentId: bestMatch._id,
        name: bestMatch.name,
        sapId: bestMatch.sapId,
        fingerprintId: bestMatch.fingerprintId, // locked‑in slot
      });
    } else {
      return res.json({ recognized: false });
    }
  } catch (err) {
    console.error("faceMatch error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
