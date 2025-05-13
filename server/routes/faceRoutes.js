const router = require("express").Router();
const { identify } = require("../controllers/faceController");

// (optional) log inbound size
router.use("/identify", (req, _, next) => {
  console.log(`[ESP→BACKEND] /api/face/identify · image length=${(req.body.image||"").length}`);
  next();
});
router.post("/identify", identify);

module.exports = router;
