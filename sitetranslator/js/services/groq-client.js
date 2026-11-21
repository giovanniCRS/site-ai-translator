import { DELAY_BETWEEN_CALLS_MS, GROQ_API_BASE, MAX_RETRIES } from '../config/constants.js';
import { sleep } from '../utils/text.js';

// Calcola l'attesa esatta su 429 (header retry-after oppure messaggio di errore di Groq).
export function extractRetrySeconds(res, errText, attempt) {
  // 1. Header HTTP retry-after (se esposto da CORS)
  const retryHeader = res.headers.get('retry-after');
  if (retryHeader) {
    const parsed = parseFloat(retryHeader);
    if (!Number.isNaN(parsed) && parsed > 0) return Math.ceil(parsed + 1.5);
  }

  // 2. Messaggio Groq: "Please try again in 1m12.4s" / "in 24.8s" / "in 300ms"
  const minSec = errText.match(/try again in\s+(\d+)m([\d.]+)s/i);
  if (minSec) return Math.ceil(Number(minSec[1]) * 60 + parseFloat(minSec[2]) + 1.5);

  const sec = errText.match(/try again in\s+([\d.]+)s/i);
  if (sec) return Math.ceil(parseFloat(sec[1]) + 1.5);

  const ms = errText.match(/try again in\s+([\d.]+)ms/i);
  if (ms) return Math.ceil(parseFloat(ms[1]) / 1000 + 1.5);

  // 3. Fallback progressivo
  return attempt * 15;
}

function isReasoningModel(model) {
  return model.includes('qwen') || model.includes('deepseek');
}

/**
 * Client per le API OpenAI-compatibili di Groq.
 * @param {{ logger: { warn: (msg: string) => void } }} deps
 */
export function createGroqClient({ logger }) {
  async function chat(messages, { apiKey, model, retries = MAX_RETRIES }) {
    const body = { model, messages, temperature: 0.1 };

    if (isReasoningModel(model)) {
      body.reasoning_format = 'hidden';
      body.reasoning_effort = 'none';
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      const res = await fetch(`${GROQ_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (res.status === 429 && attempt < retries) {
        const errText = await res.text();
        const waitSec = extractRetrySeconds(res, errText, attempt);
        logger.warn(`Rate limit (429) raggiunto. Attendo esattamente ${waitSec}s (tentativo ${attempt}/${retries})...`);
        await sleep(waitSec * 1000);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content || '';
      await sleep(DELAY_BETWEEN_CALLS_MS);
      return content;
    }
  }

  // Restituisce gli id dei modelli attivi sull'account.
  async function listModelIds(apiKey) {
    const res = await fetch(`${GROQ_API_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return (json.data || []).map((m) => m.id).filter(Boolean);
  }

  return { chat, listModelIds };
}
