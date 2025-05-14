// server/controllers/faceController.js
process.env.TFJS_DISABLE_BANNER = "true";

const tf = require("@tensorflow/tfjs-node");            // native TensorFlow
const faceapi = require("@vladmandic/face-api");        // optimized face-api for Node
const { Canvas, Image, ImageData } = require("canvas");
const path = require("path");
const fs = require("fs");
const Student = require("../models/Student");

// Monkey-patch canvas + fetch into face-api
faceapi.env.monkeyPatch({ Canvas, Image, ImageData, fetch: global.fetch });

// ─── load all models once ───────────────────────────────────
let modelsLoaded = false;
async function loadModels() {
  const modelPath = path.resolve(__dirname, "../models");

  // sanity-check that we actually have the files
  const required = [
    "tiny_face_detector_model-shard1",
    "tiny_face_detector_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1.bin",
    "ssd_mobilenetv1_model-shard2.bin",
    "ssd_mobilenetv1_model-weights_manifest.json",
    "face_landmark_68_model-shard1.bin",
    "face_landmark_68_model-weights_manifest.json",
    "face_recognition_model-shard1.bin",
    "face_recognition_model-shard2.bin",
    "face_recognition_model-weights_manifest.json",
  ];
  for (const f of required) {
    if (!fs.existsSync(path.join(modelPath, f))) {
      throw new Error(`Missing model file: ${path.join(modelPath, f)}`);
    }
  }

  await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  modelsLoaded = true;
  console.log("[faceController] models loaded");
}
loadModels().catch(err => console.error("[faceController] model load error:", err));

// helper: double the canvas size
function upscale(canvas, factor = 2) {
  const up = new Canvas(canvas.width * factor, canvas.height * factor);
  up.getContext("2d").drawImage(canvas, 0, 0, up.width, up.height);
  return up;
}

// POST /api/face/identify
exports.identify = async (req, res) => {
  console.log("[identify] incoming request, image length =", (req.body.image||"").length);
  if (!modelsLoaded) {
    return res.status(503).json({ message: "Face models not loaded yet" });
  }
  const raw = req.body.image;
  if (typeof raw !== "string") {
    return res.status(400).json({ message: "Missing image (base64)" });
  }

  // strip off data URI prefix
  const b64 = raw.replace(/^data:image\/\w+;base64,/, "");
  const imgBuffer = Buffer.from(b64, "base64");
  const img = new Image();
  img.src = imgBuffer;
  let canvas = new Canvas(img.width, img.height);
  canvas.getContext("2d").drawImage(img, 0, 0);

  // 1) tiny face detector
  const tinyOpts = new faceapi.TinyFaceDetectorOptions({
    inputSize: 640,     // smaller = faster; increase for more resolution
    scoreThreshold: 0.05 // lower = more sensitive (↑ false-positives)
  });
  let detection = await faceapi
    .detectSingleFace(canvas, tinyOpts)
    .withFaceLandmarks()
    .withFaceDescriptor();

  // 2) if none, upscale & retry
  if (!detection) {
    console.log("[identify] no tiny face, upscaling & retry");
    const up = upscale(canvas, 2);
    detection = await faceapi
      .detectSingleFace(up, tinyOpts)
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  // 3) SSD fallback with low threshold
  if (!detection) {
    console.log("[identify] trying SSDMobilenetV1 fallback");
    const ssdOpts = new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.05 // lower = more detections
    });
    detection = await faceapi
      .detectSingleFace(canvas, ssdOpts)
      .withFaceLandmarks()
      .withFaceDescriptor();
  }

  if (!detection) {
    console.log("[identify] no face → recognized:false");
    return res.json({ recognized: false });
  }

  // compare to DB
  const descriptor = detection.descriptor;
  const students = await Student.find({}, "sapId faceDescriptor fingerprintId");
  let best = null, minDist = 0.45;
  for (const s of students) {
    if (!Array.isArray(s.faceDescriptor) || s.faceDescriptor.length !== 128)
      continue;
    const d = faceapi.euclideanDistance(descriptor, s.faceDescriptor);
    if (d < minDist) {
      minDist = d;
      best = s;
    }
  }

  if (!best) {
    console.log("[identify] no DB match → recognized:false");
    return res.json({ recognized: false });
  }

  const slot = typeof best.fingerprintId === "number" ? best.fingerprintId : -1;
  console.log("[identify] matched", best.sapId, "slot", slot);
  return res.json({ recognized: true, sapId: best.sapId, fingerprintId: slot });
};
