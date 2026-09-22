/* =========================================================
   GROQ SERVICE
   =========================================================
   Primary chat provider for KrishiBandhu AI.

   - Rotates through GROQ_API_KEYS (comma separated in .env)
     on rate limits (429), server errors (5xx), timeouts and
     malformed responses.
   - Round-robin: every successful call advances the rotation
     cursor, so load is spread across the keys.
   - Exposes isGroqConfigured() so callers can fall back to
     Gemini when no Groq keys are present.
========================================================= */

const GROQ_API_URL =
  'https://api.groq.com/openai/v1/chat/completions';

const REQUEST_TIMEOUT_MS = 60000;

function getGroqKeys() {
  /*
    Chat key pool (all Groq keys that may be used
    for chat). Order: LLM_API_KEYS, then WHISPER_API_KEYS,
    with legacy single-key fallbacks kept for safety.
  */

  const sources = [
    process.env.LLM_API_KEYS,
    process.env.WHISPER_API_KEYS,
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

function isGroqConfigured() {
  return getGroqKeys().length > 0;
}

/*
  Default model candidates. GROQ_MODEL is tried first when
  it is set to something usable; a bogus value (like the
  old default 'groq/compound', which does not exist on
  Groq) is skipped so we never waste attempts on a 404.
*/
const GROQ_MODEL_CANDIDATES = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'llama3-70b-8192',
  'llama3-8b-8192',
];

function getGroqModels() {
  const envModel =
    (process.env.GROQ_MODEL || '').trim();

  const models = [];

  if (
    envModel &&
    envModel !== 'groq/compound'
  ) {
    models.push(envModel);
  }

  for (const candidate of GROQ_MODEL_CANDIDATES) {
    if (!models.includes(candidate)) {
      models.push(candidate);
    }
  }

  return models;
}

/*
  Rotation cursor. Starts at 0; every attempt (success or
  failure) advances it so the next call begins with a
  different key.
*/
let rotationCursor = 0;

function mapContentsToMessages(contents) {
  /*
    Our internal chat shape is:
      [{ role: 'user' | 'model', parts: [{ text }] }]

    Groq expects OpenAI style:
      [{ role: 'user' | 'assistant', content }]
  */

  if (!Array.isArray(contents)) {
    return [];
  }

  return contents
    .map((item) => {
      if (!item || !item.parts) {
        return null;
      }

      const text =
        item.parts[0]?.text;

      if (
        !text ||
        typeof text !== 'string' ||
        !text.trim()
      ) {
        return null;
      }

      return {
        role:
          item.role === 'model'
            ? 'assistant'
            : 'user',

        content: text.trim(),
      };
    })
    .filter(Boolean);
}

async function groqChat({
  systemInstruction,
  contents,
  temperature = 0.4,
  maxTokens = 1200,
  model,
}) {
  const keys = getGroqKeys();

  if (!keys.length) {
    const error = new Error(
      'No Groq API keys configured.',
    );

    error.code = 'GROQ_NOT_CONFIGURED';

    throw error;
  }

  const chatModels = model
    ? [model]
    : getGroqModels();

  const messages = [];

  if (
    systemInstruction &&
    typeof systemInstruction === 'string' &&
    systemInstruction.trim()
  ) {
    messages.push({
      role: 'system',
      content: systemInstruction.trim(),
    });
  }

  messages.push(
    ...mapContentsToMessages(
      contents,
    ),
  );

  if (!messages.length) {
    throw new Error(
      'No messages provided to Groq.',
    );
  }

  const startIndex =
    rotationCursor % keys.length;

  const attempts = [];

  /*
    Hard budget: dead or misconfigured keys must never
    stall a chat. The whole Groq pool gets a few seconds
    before we bail to the fallback provider.
  */

  const budgetMs =
    Number(
      process.env.GROQ_BUDGET_MS,
    ) || 4000;

  const deadline =
    Date.now() + budgetMs;

  const sleep = (ms) =>
    new Promise((resolve) =>
      setTimeout(resolve, ms),
    );

  for (
    let offset = 0;
    offset < keys.length;
    offset += 1
  ) {
    const index =
      (startIndex + offset) %
      keys.length;

    const apiKey = keys[index];

    for (
      const chatModel of chatModels
    ) {
      if (Date.now() > deadline) {
        attempts.push(
          `budget exceeded with ${Math.max(keys.length - offset - 1, 0)} key(s) left`,
        );

        break;
      }

      const payload = {
        model: chatModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      };

      try {
        const controller =
          new AbortController();

        /*
          A single hung request must never blow past the
          pool budget — the effective per-attempt timeout
          is capped by however much budget is left.
        */

        const remainingMs =
          Math.max(deadline - Date.now(), 0);

        const timer = setTimeout(
          () => controller.abort(),
          Math.min(
            REQUEST_TIMEOUT_MS,
            remainingMs || 1,
          ),
        );

        let response;

        try {
          response = await fetch(
            GROQ_API_URL,
            {
              method: 'POST',
              headers: {
                'Content-Type':
                  'application/json',

                Authorization: `Bearer ${apiKey}`,
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

        /*
          Rate limited or server-side failure:
          rotate to the next key and retry.
        */

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

          rotationCursor = index + 1;

          attempts.push(
            `key#${index + 1}: HTTP ${response.status} ${detail}`.trim(),
          );

          // Give the rate limiter a moment
          // before trying the next key.
          if (
            response.status === 429
          ) {
            await sleep(600);
          }

          break; // next key
        }

        const data =
          await response.json();

        if (!response.ok) {
          rotationCursor = index + 1;

          attempts.push(
            `key#${index + 1} model ${chatModel}: HTTP ${response.status} ${data?.error?.message || ''}`.trim(),
          );

          continue; // next model on this key
        }

        const responseText =
          data?.choices?.[0]
            ?.message?.content;

        if (
          !responseText ||
          typeof responseText !== 'string' ||
          !responseText.trim()
        ) {
          rotationCursor = index + 1;

          attempts.push(
            `key#${index + 1} model ${chatModel}: empty response`,
          );

          continue;
        }

        /*
          Success — advance the cursor so the
          next chat starts on a different key.
        */

        rotationCursor = index + 1;

        return responseText.trim();
      } catch (error) {
        rotationCursor = index + 1;

        attempts.push(
          `key#${index + 1} model ${chatModel}: ${
            error.name === 'AbortError'
              ? 'timeout'
              : error.message
          }`,
        );
      }
    }

    if (Date.now() > deadline) {
      break;
    }
  }

  const failedError = new Error(
    `All Groq keys failed. Attempts: ${attempts.join(' | ')}`,
  );

  failedError.code =
    'GROQ_ALL_KEYS_FAILED';

  throw failedError;
}

module.exports = {
  groqChat,
  isGroqConfigured,
  getGroqKeys,
  getGroqModels,
};