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

// Come String.replace, ma con callback asincrona. `regex` deve avere il flag "g".
export async function replaceAsync(str, regex, asyncFn) {
  const matches = [...str.matchAll(regex)];
  if (matches.length === 0) return str;

  const replacements = await Promise.all(matches.map((m) => asyncFn(m)));

  let out = '';
  let last = 0;
  matches.forEach((m, i) => {
    out += str.slice(last, m.index) + replacements[i];
    last = m.index + m[0].length;
  });
  return out + str.slice(last);
}

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
