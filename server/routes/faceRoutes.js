// server/routes/faceRoutes.js
const express       = require('express');
const router        = express.Router();
const auth          = require('../middleware/auth');
const { faceMatch } = require('../controllers/faceController');

router.post('/face-match', auth, faceMatch);

module.exports = router;
