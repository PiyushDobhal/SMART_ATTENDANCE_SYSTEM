// server/controllers/faceController.js
process.env.TFJS_DISABLE_BANNER = "true";

const tf = require("@tensorflow/tfjs-node");             // native TensorFlow
const faceapi = require("@vladmandic/face-api");         // optimized face-api for Node
const { Canvas, Image, ImageData } = require("canvas");
const path = require("path");
const fs = require("fs");
const Student = require("../models/Student");

// Monkey-patch
faceapi.env.monkeyPatch({ Canvas, Image, ImageData, fetch: global.fetch });

// Load models once
let modelsLoaded = false;
async function loadModels() {
  const modelPath = path.resolve(__dirname, "../models");

  // Check if model files exist
  const requiredFiles = [
    "tiny_face_detector_model-shard1",
    "tiny_face_detector_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1.bin",
    "ssd_mobilenetv1_model-shard2.bin",
    "ssd_mobilenetv1_model-weights_manifest.json",
    "face_landmark_68_model-shard1.bin",
    "face_landmark_68_model-weights_manifest.json",
    "face_recognition_model-shard1.bin",
    "face_recognition_model-shard2.bin",
    "face_recognition_model-weights_manifest.json"
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(modelPath, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`[loadModels] Missing required model file: ${filePath}`);
    }
  }

  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);  // optional fallback
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  modelsLoaded = true;
  console.log("[faceController] models loaded from", modelPath);
}
loadModels().catch(err => console.error("[faceController] model load error:", err));

// helper: upscale a canvas
function upscale(canvas, factor = 2) {
  const up = new Canvas(canvas.width * factor, canvas.height * factor);
  const ctx = up.getContext("2d");
  ctx.drawImage(canvas, 0, 0, up.width, up.height);
  return up;
}

exports.identify = async (req, res) => {
  const rawB64 = req.body.image || "";
  console.log("[identify] request, image length =", rawB64.length);

  if (!modelsLoaded) {
    console.log("[identify] models not ready");
    return res.status(503).json({ message: "Face models not loaded" });
  }
  if (typeof rawB64 !== "string") {
    return res.status(400).json({ message: "Missing image (base64)" });
  }

  // strip off data URI prefix
  const b64 = rawB64.replace(/^data:image\/\w+;base64,/, "");
  const imgBuffer = Buffer.from(b64, "base64");

  // draw to canvas
  const img = new Image();
  img.src = imgBuffer;
  let canvas = new Canvas(img.width, img.height);
  let ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  // 1) tiny face detector pass
  const tinyOpts = new faceapi.TinyFaceDetectorOptions({
    inputSize: 512,       // try smaller/larger if you want speed/accuracy trade-off
    scoreThreshold: 0.5
  });
  let detection = await faceapi
    .detectSingleFace(canvas, tinyOpts)
    .withFaceLandmarks()
    .withFaceDescriptor();

  // 2) if no detection, upscale and retry
  if (!detection) {
    console.log("[identify] no tiny face, upscaling & retry…");
    const up = upscale(canvas, 2);
    detection = await faceapi
      .detectSingleFace(up, tinyOpts)
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  // 3) optional SSD fallback
  if (!detection) {
    console.log("[identify] no tiny face, trying SSDMobilenetV1…");
    detection = await faceapi
      .detectSingleFace(canvas)
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  if (!detection) {
    console.log("[identify] still no face → recognized:false");
    return res.json({ recognized: false });
  }

  // compare against DB
  const descriptor = detection.descriptor;
  const students = await Student.find({}, "sapId faceDescriptor fingerprintId");

  let bestMatch = null, minDist = 0.6;
  for (const stu of students) {
    if (!Array.isArray(stu.faceDescriptor) || stu.faceDescriptor.length !== 128)
      continue;
    const d = faceapi.euclideanDistance(descriptor, stu.faceDescriptor);
    if (d < minDist) {
      minDist = d;
      bestMatch = stu;
    }
  }

  if (!bestMatch) {
    console.log("[identify] no DB match → recognized:false");
    return res.json({ recognized: false });
  }

  const slot = typeof bestMatch.fingerprintId === "number"
    ? bestMatch.fingerprintId
    : -1;

  console.log("[identify] matched", bestMatch.sapId, "slot", slot);
  return res.json({
    recognized: true,
    sapId: bestMatch.sapId,
    fingerprintId: slot
  });
};
