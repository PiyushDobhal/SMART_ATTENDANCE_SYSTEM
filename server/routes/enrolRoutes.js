const router = require("express").Router();
const {
  getEnrolState,
  setFingerprint,
  handleFromDevice,
} = require("../controllers/enrolController");

// ESP32 → poll every 2 s
router.get   ("/status",                   (req, res) => res.json({ enrolEnabled: false }));
// (Optional) manual slot assign
router.put   ("/students/:sapId/fingerprint", setFingerprint);
// ESP32 → POST its Serial replies here
router.post  ("/from-device",              handleFromDevice);

module.exports = router;
