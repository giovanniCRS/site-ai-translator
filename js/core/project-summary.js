import { toWorkingEntries } from '../io/file-source.js';
import { getExt } from '../utils/text.js';

const SILENT_LOGGER = { info() {} };

/**
 * Conta i file del progetto per tipo (anche dentro uno ZIP) per il riepilogo in UI.
 * @returns {Promise<{ total: number, html: number, js: number, php: number, assets: number, entries: Array }>}
 */
export async function summarizeProject(selectedFiles) {
  const entries = await toWorkingEntries(selectedFiles, SILENT_LOGGER);
  const counts = { total: entries.length, html: 0, js: 0, php: 0, assets: 0, entries };

  for (const { relPath } of entries) {
    const ext = getExt(relPath);
    if (ext === '.html' || ext === '.htm') counts.html++;
    else if (ext === '.js') counts.js++;
    else if (ext === '.php') counts.php++;
    else counts.assets++;
  }
  return counts;
}
