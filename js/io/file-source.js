import { IGNORED_DIRS } from '../config/constants.js';
import { detectSiteRoot } from '../utils/paths.js';
import { loadZipEntries } from './zip-io.js';

// ---------- Lettura ricorsiva di cartelle trascinate ----------

async function readAllEntries(reader) {
  const all = [];
  for (;;) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (batch.length === 0) return all;
    all.push(...batch);
  }
}

export async function readEntryRecursively(entry, basePath = '') {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file((file) => resolve([{ file, relPath: basePath + file.name }]));
    });
  }

  if (entry.isDirectory) {
    if (IGNORED_DIRS.includes(entry.name)) return [];
    const children = await readAllEntries(entry.createReader());
    const results = [];
    for (const child of children) {
      results.push(...(await readEntryRecursively(child, basePath + entry.name + '/')));
    }
    return results;
  }

  return [];
}

// ---------- Sorgenti di selezione: drop / input cartella / input zip ----------

export async function collectFromDrop(dataTransfer) {
  const items = [...(dataTransfer.items || [])];
  const collected = [];
  let rootName = 'Progetto';

  // Le DataTransferItem vanno lette in modo sincrono: dopo il primo await il browser le invalida.
  const resolved = items.map((item) => ({
    entry: item.webkitGetAsEntry?.() ?? null,
    file: item.kind === 'file' ? item.getAsFile() : null,
  }));

  for (const { entry, file } of resolved) {
    if (entry) {
      rootName = entry.name;
      collected.push(...(await readEntryRecursively(entry)));
    } else if (file) {
      rootName = file.name;
      collected.push({ file, relPath: file.name });
    }
  }

  // Rimuove il nome della cartella radice dai percorsi
  if (collected.length > 1 && items.length === 1 && collected.every((c) => c.relPath.startsWith(rootName + '/'))) {
    collected.forEach((c) => { c.relPath = c.relPath.slice(rootName.length + 1); });
  }

  return { files: collected, rootName };
}

export function collectFromFolderInput(fileList) {
  const files = [...fileList];
  if (!files.length) return null;

  const rootName = files[0].webkitRelativePath.split('/')[0] || 'Cartella';
  const list = files
    .filter((f) => !f.webkitRelativePath.includes('/node_modules/') && !f.webkitRelativePath.includes('/.git/'))
    .map((f) => ({
      file: f,
      relPath: f.webkitRelativePath.startsWith(rootName + '/')
        ? f.webkitRelativePath.slice(rootName.length + 1)
        : f.name,
    }));

  return { files: list, rootName };
}

export function collectFromZipInput(file) {
  if (!file) return null;
  return { files: [{ file, relPath: file.name }], rootName: file.name };
}

// ---------- Normalizzazione: cartella o zip -> entry { relPath, getText, getBlob } ----------

export async function toWorkingEntries(selectedFiles, logger) {
  const isZip = selectedFiles.length === 1 && selectedFiles[0].relPath.toLowerCase().endsWith('.zip');

  if (isZip) {
    logger.info('Estrazione archivio ZIP in memoria...');
    const entries = await loadZipEntries(selectedFiles[0].file);

    // Uno ZIP con una cartella radice unica (es. "mysite/"): i percorsi devono partire dalla radice del sito,
    // altrimenti il prefisso lingua dei link ("/en/") finirebbe davanti al nome della cartella.
    const root = detectSiteRoot(entries.map((e) => e.relPath));
    if (!root) return entries;

    logger.info(`Cartella radice "${root}" dello ZIP trattata come radice del sito.`);
    return entries.map((entry) => ({ ...entry, relPath: entry.relPath.slice(root.length) }));
  }

  return selectedFiles.map((item) => ({
    relPath: item.relPath,
    getText: () => item.file.text(),
    getBlob: () => Promise.resolve(item.file),
  }));
}
