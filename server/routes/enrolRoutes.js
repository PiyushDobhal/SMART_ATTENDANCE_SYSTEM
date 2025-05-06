const r = require("express").Router();
const {
  toggleEnrol,
  getEnrolState,
  setFingerprint,
} = require("../controllers/enrolController");

r.post("/toggle", toggleEnrol);
r.get("/state", getEnrolState);
r.put("/students/:sapId/fingerprint", setFingerprint);

module.exports = r;
