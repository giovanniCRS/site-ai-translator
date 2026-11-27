import { MAX_CHARS_PER_CODE_CHUNK } from '../config/constants.js';
import { stripCodeFences } from '../utils/text.js';
import { codeSystemPrompt } from './prompts.js';

// Divide il codice per righe in blocchi di dimensione massima MAX_CHARS_PER_CODE_CHUNK.
function splitIntoChunks(code) {
  const chunks = [];
  let current = [];
  let currentLen = 0;

  for (const line of code.split('\n')) {
    if (currentLen + line.length > MAX_CHARS_PER_CODE_CHUNK && current.length > 0) {
      chunks.push(current.join('\n'));
      current = [];
      currentLen = 0;
    }
    current.push(line);
    currentLen += line.length + 1;
  }
  if (current.length > 0) chunks.push(current.join('\n'));

  return chunks;
}

/**
 * Traduce solo le stringhe user-facing di un file JS / PHP, a blocchi.
 */
export async function translateCode(codeContent, ext, relPath, ctx) {
  const { client, apiKey, model, targetLang, logger, onSubProgress } = ctx;

  const chunks = splitIntoChunks(codeContent);
  logger.info(`${relPath}: diviso in ${chunks.length} blocchi sicuri.`);

  const systemPrompt = codeSystemPrompt(ext, targetLang);
  const translated = [];

  for (let i = 0; i < chunks.length; i++) {
    logger.dim(`  ${relPath} — Blocco ${i + 1}/${chunks.length}...`);
    onSubProgress(i + 1, chunks.length);

    const result = await client.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: chunks[i] },
      ],
      { apiKey, model }
    );
    translated.push(stripCodeFences(result));
  }

  return translated.join('\n');
}
