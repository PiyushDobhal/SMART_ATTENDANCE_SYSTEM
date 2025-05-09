const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { faceMatch } = require("../controllers/faceController");

router.post("/identify", faceMatch);

module.exports = router;
