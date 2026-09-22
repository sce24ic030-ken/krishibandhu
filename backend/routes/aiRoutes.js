const express = require('express');

const multer = require('multer');

const {
  chatWithAI,
  sendTranscribedText,
} = require('../controllers/aiController');

const {
  protect,
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
 * In-memory upload for voice notes.
 * Groq Whisper accepts up to 25MB; we cap at 25MB.
 */

const uploadAudio = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 25 * 1024 * 1024,
  },
}).single('audio');

// Chat with KrishiBandhu AI
router.post('/chat', protect, chatWithAI);

// Transcribe a recorded voice note
router.post(
  '/transcribe',
  uploadAudio,
  sendTranscribedText,
);

module.exports = router;