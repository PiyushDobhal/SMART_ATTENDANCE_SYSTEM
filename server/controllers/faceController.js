// controllers/faceController.js
process.env.TFJS_DISABLE_BANNER = "true";

const tf = require("@tensorflow/tfjs-node");        // native bindings for best performance
const faceapi = require("@vladmandic/face-api");    // Vlad Mandic’s fork, works nicely in Node.js
const { Canvas, Image, ImageData } = require("canvas");
const path = require("path");
const Student = require("../models/Student");

// — monkey-patch node-canvas + global.fetch into face-api environment
faceapi.env.monkeyPatch({ Canvas, Image, ImageData, fetch: global.fetch });

// — load models once at startup
let modelsLoaded = false;
async function loadModels() {
  const modelPath = path.join(__dirname, "../models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  modelsLoaded = true;
  console.log("[faceController] models loaded from", modelPath);
}
loadModels().catch(err => console.error("[faceController] model load error:", err));

/**
 * POST /api/face/identify
 * Body: { image: "<base64-jpeg-string>" }
 * Returns: { recognized, sapId?, fingerprintId? }
 */
exports.identify = async (req, res) => {
  console.log("[identify] incoming request, image length =", (req.body.image || "").length);

  try {
    if (!modelsLoaded) {
      console.log("[identify] models not ready yet");
      return res.status(503).json({ message: "Face models not loaded yet" });
    }

    const { image } = req.body;
    if (typeof image !== "string") {
      console.log("[identify] bad request: missing image");
      return res.status(400).json({ message: "Missing image (base64 string)" });
    }

    // strip any "data:image/...;base64," prefix
    const b64 = image.replace(/^data:image\/\w+;base64,/, "");
    const imgBuffer = Buffer.from(b64, "base64");

    // draw into canvas
    const img = new Image();
    img.src = imgBuffer;
    const canvas = new Canvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // run detection + descriptor
    const detection = await faceapi
      .detectSingleFace(canvas)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.log("[identify] no face detected → returning recognized:false");
      return res.json({ recognized: false });
    }

    const queryDescriptor = detection.descriptor;

    // fetch students from DB
    const students = await Student.find({}, "sapId faceDescriptor fingerprintId");

    // find best match
    let bestMatch = null;
    let minDist = 0.6;
    for (const stu of students) {
      if (!Array.isArray(stu.faceDescriptor) || stu.faceDescriptor.length !== 128) {
        continue;
      }
      const dist = faceapi.euclideanDistance(queryDescriptor, stu.faceDescriptor);
      if (dist < minDist) {
        minDist = dist;
        bestMatch = stu;
      }
    }

    if (!bestMatch) {
      console.log("[identify] no known face within threshold → recognized:false");
      return res.json({ recognized: false });
    }

    // determine fingerprint slot
    const slot = typeof bestMatch.fingerprintId === "number" ? bestMatch.fingerprintId : -1;
    const output = {
      recognized: true,
      sapId: bestMatch.sapId,
      fingerprintId: slot,
    };
    console.log("[identify] match found →", output);
    return res.json(output);

  } catch (err) {
    console.error("[identify] server error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
