import { TRANSLATABLE_EXTS } from '../config/constants.js';
import { toWorkingEntries } from '../io/file-source.js';
import { OutputArchive } from '../io/zip-io.js';
import { getExt } from '../utils/text.js';
import { normalizePrefix } from '../utils/url.js';
import { translateCode } from './code-translator.js';
import { translateHtml } from './html-translator.js';

const TRANSLATION_SPAN = 70; // % della barra globale riservata alla fase di traduzione
const TRANSLATION_START = 15;

/**
 * Pipeline completa: analisi -> traduzione -> esportazione.
 *
 * @param {object} params
 * @param {Array}  params.selectedFiles   file selezionati ({ file, relPath })
 * @param {object} params.options         { apiKey, model, targetLang, langPrefix, wrapInPrefix }
 * @param {object} params.client          client Groq
 * @param {object} params.logger          logger (info/dim/warn/error/success/node)
 * @param {object} params.progress        progresso ({ update })
 * @returns {Promise<{ blob: Blob, stats: { translated: number, copied: number, failed: number } }>}
 */
export async function runTranslation({ selectedFiles, options, client, logger, progress }) {
  const { apiKey, model, targetLang, langPrefix, wrapInPrefix } = options;

  // ---------- Fase 1: Scanner ----------
  logger.node(`[Fase 1: Scanner] Analisi file del progetto (Modello: ${model})...`);
  progress.update({ percent: 5, stage: 'scanner', label: 'Analisi file in corso...', subPercent: 0, subLabel: 'Preparazione' });

  const entries = await toWorkingEntries(selectedFiles, logger);

  const toTranslate = [];
  const toCopy = [];
  for (const entry of entries) {
    const ext = getExt(entry.relPath);
    if (TRANSLATABLE_EXTS.has(ext)) toTranslate.push({ ...entry, ext });
    else toCopy.push(entry);
  }

  logger.info(`Trovati ${toTranslate.length} file da tradurre e ${toCopy.length} asset statici da copiare.`);
  progress.update({
    percent: 15,
    stage: 'scanner',
    label: `Trovati ${toTranslate.length} file da tradurre`,
    subPercent: 100,
    subLabel: 'Scansione completata',
  });

  // ---------- Fase 2: Translator ----------
  logger.node(`[Fase 2: Translator] Avvio traduzione verso ${targetLang}...`);

  const normalizedPrefix = normalizePrefix(langPrefix);
  const outRoot = wrapInPrefix && normalizedPrefix !== '/' ? normalizedPrefix.slice(1) : '';
  const archive = new OutputArchive(outRoot);
  if (outRoot) logger.info(`I file verranno inseriti nella cartella "${outRoot}" dello ZIP.`);

  const total = Math.max(toTranslate.length, 1);
  const stats = { translated: 0, copied: toCopy.length, failed: 0 };

  for (let idx = 0; idx < toTranslate.length; idx++) {
    const file = toTranslate[idx];
    const label = `Traduzione (${idx + 1}/${toTranslate.length}): ${file.relPath}`;

    logger.info(`Elaborazione (${idx + 1}/${toTranslate.length}): ${file.relPath}`);
    progress.update({
      percent: TRANSLATION_START + Math.round((idx / total) * TRANSLATION_SPAN),
      stage: 'translator',
      label,
      subPercent: 0,
      subLabel: 'Lettura file...',
    });

    const onSubProgress = (step, steps) => {
      const fraction = step / Math.max(steps, 1);
      progress.update({
        percent: TRANSLATION_START + Math.round(((idx + fraction) / total) * TRANSLATION_SPAN),
        stage: 'translator',
        label,
        subPercent: Math.round(fraction * 100),
        subLabel: `Batch / Blocco ${step} di ${steps}`,
      });
    };

    try {
      const content = await file.getText();
      const ctx = { client, apiKey, model, targetLang, langPrefix, logger, onSubProgress };

      const translated = file.ext === '.html' || file.ext === '.htm'
        ? await translateHtml(content, file.relPath, ctx)
        : await translateCode(content, file.ext, file.relPath, ctx);

      archive.add(file.relPath, translated);
      stats.translated++;
      logger.success(`Completato: ${file.relPath}`);
    } catch (err) {
      stats.failed++;
      logger.error(`Errore su ${file.relPath}: ${err.message}`);
      archive.add(file.relPath, await file.getBlob()); // fallback: copia l'originale
    }
  }

  // ---------- Fase 3: Saver ----------
  logger.node('[Fase 3: Saver] Copia asset e generazione archivio ZIP...');
  progress.update({ percent: 90, stage: 'saver', label: 'Compressione archivio ZIP...', subPercent: 50, subLabel: 'Aggiunta asset...' });

  for (const asset of toCopy) {
    archive.add(asset.relPath, await asset.getBlob());
  }

  const blob = await archive.generate();
  return { blob, stats };
}
