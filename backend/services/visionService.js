/* =========================================================
   VISION SERVICE (Gemini)
   =========================================================
   Powered by the VISION_LLM_API_KEYS pool in .env.

   - Rotates across all Gemini keys on rate limits (429),
     server errors (5xx), timeouts and empty responses.
   - Round-robin: each successful call advances the cursor.
   - GEMINI_API_KEY is used as a final fallback key so the
     feature keeps working even if VISION_LLM_API_KEYS is
     not set.
========================================================= */

const REQUEST_TIMEOUT_MS = 60000;

/*
  Models tried in order. gemini-3.6-flash is the primary;
  gemini-flash-latest is a load-shedding alternative that is
  served from a different capacity pool, so it usually stays
  available when 3.6-flash is saturated (HTTP 503).
*/

const DEFAULT_VISION_MODELS = [
  'gemini-3.6-flash',
  'gemini-flash-latest',
];

function visionApiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

function getVisionKeys() {
  const sources = [
    process.env.VISION_LLM_API_KEYS,
    process.env.GEMINI_API_KEY,
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

function isVisionConfigured() {
  return (
    getVisionKeys().length > 0
  );
}

let visionCursor = 0;

/*
  Returns: response text (string).

  Throws: Error with code VISION_ALL_KEYS_FAILED when
  every configured key fails.
*/

async function generateVision({
  model,
  models,
  contents,
  temperature = 0.4,
  maxOutputTokens = 1200,
}) {
  const keys = getVisionKeys();

  if (!keys.length) {
    const error = new Error(
      'No vision API keys configured.',
    );

    error.code = 'VISION_NOT_CONFIGURED';

    throw error;
  }

  const explicitModels =
    Array.isArray(models) &&
    models.length
      ? models
      : model
        ? [model]
        : [];

  const modelList =
    explicitModels.length
      ? explicitModels
      : DEFAULT_VISION_MODELS;

  const payloadTemplate = {
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  const startIndex =
    visionCursor % keys.length;

  const attempts = [];

  for (const chatModel of modelList) {
    const payload = {
      ...payloadTemplate,

      contents,
    };

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
        const controller =
          new AbortController();

        const timer = setTimeout(
          () => controller.abort(),
          REQUEST_TIMEOUT_MS,
        );

        let response;

        try {
          response = await fetch(
            `${visionApiUrl(chatModel)}?key=${encodeURIComponent(apiKey)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify(
                payload,
              ),

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

          visionCursor = index + 1;

          attempts.push(
            `${chatModel} key#${index + 1}: HTTP ${response.status} ${detail}`.trim(),
          );

          continue;
        }

        const data =
          await response.json();

        if (!response.ok) {
          visionCursor = index + 1;

          attempts.push(
            `${chatModel} key#${index + 1}: HTTP ${response.status} ${data?.error?.message || ''}`.trim(),
          );

          continue;
        }

        const parts =
          data?.candidates?.[0]
            ?.content?.parts;

        const text = Array.isArray(
          parts,
        )
          ? parts
              .map((part) =>
                part?.text || '',
              )
              .join('')
              .trim()
          : '';

        if (!text) {
          visionCursor = index + 1;

          attempts.push(
            `${chatModel} key#${index + 1}: empty response`,
          );

          continue;
        }

        visionCursor = index + 1;

        return text;
      } catch (error) {
        visionCursor = index + 1;

        attempts.push(
          `${chatModel} key#${index + 1}: ${
            error.name === 'AbortError'
              ? 'timeout'
              : error.message
          }`,
        );
      }
    }
  }

  const failedError = new Error(
    `All vision keys failed (${modelList.join(' → ')}). Attempts: ${attempts.join(' | ')}`,
  );

  failedError.code =
    'VISION_ALL_KEYS_FAILED';

  throw failedError;
}

module.exports = {
  generateVision,
  isVisionConfigured,
  getVisionKeys,
};