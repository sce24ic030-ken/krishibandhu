const { generateAIResponse } = require('../services/aiService');

const { transcribeAudio } = require('../services/whisperService');

const chatWithAI = async (req, res) => {
  try {
    const { message, history = [], language } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid message is required.',
      });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({
        success: false,
        message: 'History must be an array.',
      });
    }

    const validLanguages = ['en', 'mr', 'hi'];

    const chatLanguage =
      validLanguages.includes(language)
        ? language
        : 'en';

    const response = await generateAIResponse(
      message.trim(),
      history,
      chatLanguage,
      req.user?._id,
    );

    return res.status(200).json({
      success: true,
      message: response,
    });
  } catch (error) {
    console.error('AI Controller Error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to get a response from AI.',
      error:
        process.env.NODE_ENV === 'development'
          ? error.message
          : undefined,
    });
  }
};

const sendTranscribedText = async (
  req,
  res,
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          'An audio file is required.',
      });
    }

    const mimeType =
      req.file.mimetype ||
      'audio/webm';

    const language =
      req.body?.language &&
      typeof req.body.language ===
        'string'
        ? req.body.language.trim()
        : undefined;

    console.log('');
    console.log(
      '========================================',
    );
    console.log(
      '🎤 Voice Transcription Request',
    );
    console.log(
      '========================================',
    );

    console.log(
      `🎧 Audio: ${req.file.originalname} (${mimeType}, ${(req.file.size / 1024 / 1024).toFixed(2)} MB)`,
    );

    const transcript =
      await transcribeAudio({
        buffer: req.file.buffer,
        mimeType,
        language,
      });

    console.log(
      `✅ Transcript: ${transcript}`,
    );

    return res.status(200).json({
      success: true,
      transcript,
    });
  } catch (error) {
    console.error(
      'Whisper Transcription Error:',
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        'Unable to transcribe audio.',
      error:
        process.env.NODE_ENV ===
        'development'
          ? error.message
          : undefined,
    });
  }
};

module.exports = {
  chatWithAI,
  sendTranscribedText,
};