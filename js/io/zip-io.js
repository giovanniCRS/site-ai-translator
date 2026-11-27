// Adattatore su JSZip (caricato come script globale da CDN in index.html).

function getJSZip() {
  if (!window.JSZip) throw new Error('JSZip non caricato (controlla la connessione o il blocco della CDN).');
  return window.JSZip;
}

// Legge un archivio .zip e restituisce le entry nel formato interno { relPath, getText, getBlob }.
export async function loadZipEntries(file) {
  const zip = await getJSZip().loadAsync(file);
  const entries = [];
  zip.forEach((relPath, zipEntry) => {
    if (zipEntry.dir || relPath.startsWith('__MACOSX/') || relPath.includes('node_modules/')) return;
    entries.push({
      relPath,
      getText: () => zipEntry.async('string'),
      getBlob: () => zipEntry.async('blob'),
    });
  });
  return entries;
}

// Archivio di output, con cartella radice opzionale (es. "en/").
export class OutputArchive {
  constructor(rootDir = '') {
    this.rootDir = rootDir;
    this.zip = new (getJSZip())();
  }

  add(relPath, data) {
    this.zip.file(this.rootDir + relPath, data);
  }

  generate() {
    return this.zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  }
}
