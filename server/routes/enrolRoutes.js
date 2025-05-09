const r = require("express").Router();
const {
  toggleEnrol,
  getEnrolState,
  setFingerprint,
  handleFromDevice,    // <- import the new handler
} = require("../controllers/enrolController");

r.post("/toggle",                toggleEnrol);
r.get ("/status",                getEnrolState);
r.put ("/students/:sapId/fingerprint", setFingerprint);

// ESP32 → server relay of Arduino responses (plain‐text body)
r.post("/from-device",           handleFromDevice);

module.exports = r;
