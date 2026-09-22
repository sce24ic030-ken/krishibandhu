/* =========================================================
   WHISPER SERVICE (Groq speech-to-text)
   =========================================================
   Transcribes recorded farmer voice notes using Groq Whisper.

   Uses the SAME Groq key pool as chat (WHISPER_API_KEYS +
   LLM_API_KEYS + legacy single keys), rotated round-robin.
   On rate limit (429), server error (5xx), timeout or empty
   transcript the service moves to the next key automatically.

   Models tried: whisper-large-v3-turbo (fast) then
   whisper-large-v3 (higher accuracy, slower).
========================================================= */

const GROQ_TRANSCRIBE_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

const REQUEST_TIMEOUT_MS = 90000;

const DEFAULT_MODELS = [
  'whisper-large-v3-turbo',
  'whisper-large-v3',
];

/*
  Map MIME types to the filename extension Groq expects.
  Groq decides the audio codec from the file extension.
*/

const MIME_EXTENSIONS = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'm4a',
  'audio/flac': 'flac',
};

function getWhisperKeys() {
  const sources = [
    process.env.WHISPER_API_KEYS,
    process.env.LLM_API_KEYS,
    process.env.GROQ_API_KEYS,
    process.env.WHISPER_API_KEY,
    process.env.GROQ_API_KEY,
  ];

  const keys = [];

  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const key of source.split(',')) {
      const clean = key.trim();

      if (
        clean &&
        !keys.includes(clean)
      ) {
        keys.push(clean);
      }
    }
  }

  return keys;
}

function isWhisperConfigured() {
  return (
    getWhisperKeys().length > 0
  );
}

function getModels() {
  const model =
    (process.env.WHISPER_MODEL || '').trim();

  const models = model
    ? [model]
    : DEFAULT_MODELS;

  return models;
}

let transcribeCursor = 0;

/*
  Transcribes an audio buffer.

  Returns: transcript text (string, trimmed).

  Throws: Error with code WHISPER_ALL_KEYS_FAILED when every
  key (and model) fails.
*/

async function transcribeAudio({
  buffer,
  mimeType,
  language,
}) {
  const keys = getWhisperKeys();

  if (!keys.length) {
    const error = new Error(
      'No Whisper API keys configured.',
    );

    error.code =
      'WHISPER_NOT_CONFIGURED';

    throw error;
  }

  if (
    !buffer ||
    buffer.length === 0
  ) {
    throw new Error(
      'Audio data is required.',
    );
  }

  const mime =
    (mimeType || 'audio/webm').toLowerCase();

  const extension =
    MIME_EXTENSIONS[mime] ||
    'webm';

  const filename = `krishibandhu-voice-${Date.now()}.${extension}`;

  const models =
    getModels();

  const startIndex =
    transcribeCursor %
    keys.length;

  const attempts = [];

  for (const model of models) {
    for (
      let offset = 0;
      offset < keys.length;
      offset += 1
    ) {
      const index =
        (startIndex + offset) %
        keys.length;

      const apiKey = keys[index];

      try {
        const formData =
          new FormData();

        formData.append(
          'file',
          new Blob([buffer], {
            type: mime,
          }),
          filename,
        );

        formData.append(
          'model',
          model,
        );

        if (
          language &&
          typeof language === 'string' &&
          language.trim()
        ) {
          formData.append(
            'language',
            language.trim(),
          );
        }

        formData.append(
          'response_format',
          'json',
        );

        const controller =
          new AbortController();

        const timer = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS,
        );

        let response;

        try {
          response = await fetch(
            GROQ_TRANSCRIBE_URL,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
              },

              body: formData,

              signal: controller.signal,
            },
          );
        } finally {
          clearTimeout(timer);
        }

        if (
          response.status === 429 ||
          response.status >= 500
        ) {
          let detail = '';

          try {
            const errorBody =
              await response.json();

            detail =
              errorBody?.error?.message ||
              '';
          } catch {
            /* ignore parse failures */
          }

          transcribeCursor = index + 1;

          attempts.push(
            `${model} key#${index + 1}: HTTP ${response.status} ${detail}`.trim(),
          );

          continue;
        }

        const data =
          await response.json();

        if (!response.ok) {
          transcribeCursor = index + 1;

          attempts.push(
            `${model} key#${index + 1}: HTTP ${response.status} ${data?.error?.message || ''}`.trim(),
          );

          continue;
        }

        const transcript =
          data?.text;

        if (
          !transcript ||
          typeof transcript !== 'string' ||
          !transcript.trim()
        ) {
          transcribeCursor = index + 1;

          attempts.push(
            `${model} key#${index + 1}: empty transcript`,
          );

          continue;
        }

        transcribeCursor = index + 1;

        return transcript.trim();
      } catch (error) {
        transcribeCursor = index + 1;

        attempts.push(
          `${model} key#${index + 1}: ${
            error.name === 'AbortError'
              ? 'timeout'
              : error.message
          }`,
        );
      }
    }
  }

  const failedError = new Error(
    `All Whisper keys failed (${models.join(' → ')}). Attempts: ${attempts.join(' | ')}`,
  );

  failedError.code =
    'WHISPER_ALL_KEYS_FAILED';

  throw failedError;
}

module.exports = {
  transcribeAudio,
  isWhisperConfigured,
  getWhisperKeys,
};