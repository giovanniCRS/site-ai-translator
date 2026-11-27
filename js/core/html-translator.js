import {
  MAX_CHARS_PER_HTML_BATCH,
  META_SELECTORS,
  SKIP_HTML_TAGS,
  TRANSLATABLE_ATTRS,
} from '../config/constants.js';
import { resolveLangCode } from '../config/languages.js';
import { serializeHtmlDoc } from '../utils/html.js';
import { normalizePrefix, prefixInternalHref } from '../utils/url.js';
import { htmlSystemPrompt } from './prompts.js';

const TAG_REGEX = /<t\s+id=["']?(\d+)["']?\s*>([\s\S]*?)<\/t>/g;

// ---------- Estrazione ----------

function collectItems(doc) {
  const items = [];

  const walk = (node) => {
    if (node.nodeType === Node.ELEMENT_NODE && SKIP_HTML_TAGS.has(node.tagName.toUpperCase())) return;
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue && node.nodeValue.trim().length > 0) {
      items.push({ type: 'text', node, original: node.nodeValue });
    }
    for (const child of node.childNodes) walk(child);
  };
  walk(doc.documentElement);

  doc.querySelectorAll('*').forEach((el) => {
    if (SKIP_HTML_TAGS.has(el.tagName.toUpperCase())) return;
    for (const attr of TRANSLATABLE_ATTRS) {
      const val = el.getAttribute(attr);
      if (val && val.trim().length > 0) items.push({ type: 'attr', node: el, attr, original: val });
    }
  });

  doc.querySelectorAll(META_SELECTORS).forEach((el) => {
    const val = el.getAttribute('content');
    if (val && val.trim().length > 0) items.push({ type: 'attr', node: el, attr: 'content', original: val });
  });

  return items;
}

// ---------- Aggiornamenti deterministici ----------

function rewriteInternalLinks(doc, relPath, normalizedPrefix) {
  doc.querySelectorAll('a[href]').forEach((el) => {
    const newHref = prefixInternalHref(el.getAttribute('href'), relPath, normalizedPrefix);
    if (newHref) el.setAttribute('href', newHref);
  });
}

// ---------- Batching ----------

const toTagLine = (id, item) => `<t id="${id}">${item.original}</t>`;

// Ogni batch è una lista di indici di `items`.
function buildBatches(items) {
  const batches = [];
  let currentIds = [];
  let currentLen = 0;

  items.forEach((item, idx) => {
    const lineLen = toTagLine(idx, item).length;
    if (currentLen + lineLen > MAX_CHARS_PER_HTML_BATCH && currentIds.length > 0) {
      batches.push(currentIds);
      currentIds = [];
      currentLen = 0;
    }
    currentIds.push(idx);
    currentLen += lineLen + 1;
  });
  if (currentIds.length > 0) batches.push(currentIds);

  return batches;
}

function applyTranslation(item, text) {
  if (item.type === 'text') item.node.nodeValue = text;
  else item.node.setAttribute(item.attr, text);
}

// ---------- API pubblica ----------

/**
 * Traduce un file HTML: estrae i testi, li invia a Groq in micro-batch XML e li riapplica al DOM.
 */
export async function translateHtml(htmlContent, relPath, ctx) {
  const { client, apiKey, model, targetLang, langPrefix, logger, onSubProgress } = ctx;

  const doc = new DOMParser().parseFromString(htmlContent, 'text/html');
  const normalizedPrefix = normalizePrefix(langPrefix);

  if (/<html[\s>]/i.test(htmlContent)) {
    doc.documentElement.setAttribute('lang', resolveLangCode(targetLang, normalizedPrefix));
  }
  rewriteInternalLinks(doc, relPath, normalizedPrefix);

  const items = collectItems(doc);
  if (items.length === 0) return serializeHtmlDoc(doc, htmlContent);

  const batches = buildBatches(items);
  logger.info(`${relPath}: estratti ${items.length} testi -> ${batches.length} micro-batch.`);

  const systemPrompt = htmlSystemPrompt(targetLang);

  // Traduce una lista di id e restituisce gli id che il modello NON ha restituito.
  const translateIds = async (ids) => {
    const expected = new Set(ids);
    const applied = new Set();
    const batchText = ids.map((id) => toTagLine(id, items[id])).join('\n');

    const rawOutput = await client.chat(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: batchText },
      ],
      { apiKey, model }
    );

    for (const match of rawOutput.matchAll(TAG_REGEX)) {
      const idx = Number(match[1]);
      if (!expected.has(idx)) continue;
      applyTranslation(items[idx], match[2]);
      applied.add(idx);
    }
    return ids.filter((id) => !applied.has(id));
  };

  for (let i = 0; i < batches.length; i++) {
    logger.dim(`  ${relPath} — Batch ${i + 1}/${batches.length}...`);
    onSubProgress(i + 1, batches.length);

    let missing = await translateIds(batches[i]);

    if (missing.length > 0) {
      logger.warn(`  ${relPath} — Batch ${i + 1}: ${missing.length} testi non restituiti dal modello, riprovo...`);
      missing = await translateIds(missing);
      if (missing.length > 0) {
        const preview = missing.slice(0, 8).join(', ') + (missing.length > 8 ? '…' : '');
        logger.warn(`  ${relPath} — Batch ${i + 1}: ${missing.length} testi lasciati in lingua originale (id ${preview}).`);
      }
    }
  }

  return serializeHtmlDoc(doc, htmlContent);
}
