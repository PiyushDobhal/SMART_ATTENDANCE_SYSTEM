process.env.TFJS_DISABLE_BANNER = "true";
const tf = require("@tensorflow/tfjs-node");         // ← native binding
const faceapi = require("@vladmandic/face-api"); 

// Load node-canvas and patch it into face-api environment for image parsing
const { Canvas, Image, ImageData } = require("canvas");
faceapi.env.monkeyPatch({ Canvas, Image, ImageData, fetch: global.fetch });

// Flag to ensure models are loaded only once
let modelsLoaded = false;
async function loadModels() {
  const modelPath = require("path").join(__dirname, "../models");
  // Load face-api models from disk
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  modelsLoaded = true;
}
loadModels().catch(err => console.error("Model loading error:", err));

/**
 * POST /api/face/identify
 * Body: { image: "<base64-jpeg-string>" }
 * Returns: { recognized, sapId?, fingerprintId? }
 */
exports.identify = async (req, res) => {
  try {
    if (!modelsLoaded) {
      return res.status(503).json({ message: "Face models not loaded yet" });
    }
    const { image } = req.body;
    if (typeof image !== "string") {
      return res.status(400).json({ message: "Missing image (base64 string)" });
    }

    // Strip any "data:image/…;base64," prefix from the base64 string
    const b64 = image.replace(/^data:image\/\w+;base64,/, "");
    const imgBuffer = Buffer.from(b64, "base64");

    // Create an Image from the buffer and draw it to a Canvas
    const img = new Image();
    img.src = imgBuffer;
    const canvas = new Canvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Perform face detection with landmarks and compute face descriptor
    const result = await faceapi.detectSingleFace(canvas)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result) {
      return res.json({ recognized: false }); // No face found
    }
    const queryDescriptor = result.descriptor;

    // Fetch all stored students' face descriptors from DB (sapId, faceDescriptor, fingerprintId)
    const students = await require("../models/Student").find(
      {}, "sapId faceDescriptor fingerprintId"
    );

    // Find the best match by Euclidean distance
    let bestMatch = null;
    let minDist = 0.6;  // distance threshold
    for (const stu of students) {
      if (!Array.isArray(stu.faceDescriptor)) continue;  // skip if no face data
      const dist = faceapi.euclideanDistance(queryDescriptor, stu.faceDescriptor);
      if (dist < minDist) {
        minDist = dist;
        bestMatch = stu;
      }
    }

    if (!bestMatch) {
      return res.json({ recognized: false }); // no known face matched within threshold
    }

    // Determine fingerprint slot (if no fingerprint assigned yet, use -1)
    const slot = (typeof bestMatch.fingerprintId === "number") 
                   ? bestMatch.fingerprintId 
                   : -1;

    return res.json({
      recognized: true,
      sapId: bestMatch.sapId,
      fingerprintId: slot
    });
  } catch (err) {
    console.error("identify error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
