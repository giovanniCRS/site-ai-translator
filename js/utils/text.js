export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function getExt(filepath) {
  const idx = filepath.lastIndexOf('.');
  return idx === -1 ? '' : filepath.slice(idx).toLowerCase();
}

// Rimuove solo i fence markdown che avvolgono l'intera risposta, non i backtick legittimi del codice.
export function stripCodeFences(text) {
  let t = text;
  const openFence = /^\s*```[a-zA-Z0-9]*[ \t]*\r?\n/;
  if (openFence.test(t)) {
    t = t.replace(openFence, '');
    t = t.replace(/\r?\n[ \t]*```[ \t]*$/, '');
  }
  return t.trimEnd();
}
