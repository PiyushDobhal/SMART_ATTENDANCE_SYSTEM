const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const { identify} = require("../controllers/faceController");

router.post("/identify", identify);

module.exports = router;
