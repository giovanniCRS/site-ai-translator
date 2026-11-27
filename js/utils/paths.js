// Se tutti i file stanno in un'unica cartella radice (tipico degli ZIP, es. "mysite/") la considera
// la radice del sito e la restituisce con lo slash finale; altrimenti stringa vuota.
export function detectSiteRoot(paths) {
  if (paths.length === 0 || paths.some((p) => /^index\.(html?|php)$/i.test(p))) return '';

  const firstSegments = new Set(paths.map((p) => p.split('/')[0]));
  if (firstSegments.size === 1 && paths.every((p) => p.includes('/'))) return `${[...firstSegments][0]}/`;

  return '';
}
