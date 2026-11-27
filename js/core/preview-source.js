// Motore dell'anteprima: trasforma una lista di file in memoria in pagine HTML autosufficienti
// (CSS, immagini, font e script locali incorporati come data: URL) da mostrare in un iframe in sandbox.
//
// Per il sito tradotto i link `/en/pagina.html` (prefisso lingua) vengono risolti togliendo il prefisso.

import { escapeHtml, getExt, replaceAsync } from '../utils/text.js';
import { serializeHtmlDoc } from '../utils/html.js';
import { mimeFor } from '../utils/mime.js';
import { detectSiteRoot } from '../utils/paths.js';
import { BRIDGE_SCRIPT, buildScrollToHashScript } from './preview-bridge.js';

const MAX_ASSET_BYTES = 6 * 1024 * 1024;        // oltre questa soglia l'asset non viene incorporato
const CACHE_BUDGET_CHARS = 120 * 1024 * 1024;   // oltre questo budget la cache degli asset viene svuotata
const MAX_CSS_IMPORT_DEPTH = 5;

const PAGE_EXTS = new Set(['.html', '.htm']);
const NAVIGABLE_EXTS = new Set(['.html', '.htm', '.php']);

// ---------- Utilità di percorso ----------

const safeDecode = (s) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function messagePage(title, text) {
  return `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;font:14px/1.55 system-ui,-apple-system,'Segoe UI',sans-serif;background:#f4f2fa;color:#3b3852;text-align:center}
h1{font-size:16px;margin:0 0 6px}p{margin:0;opacity:.75;max-width:420px}code{font-family:ui-monospace,Consolas,monospace;font-size:12.5px}</style></head>
<body><div><h1>${escapeHtml(title)}</h1><p>${text}</p></div></body></html>`;
}

/**
 * @param {Array<{ relPath: string, getText: () => Promise<string>, getBlob: () => Promise<Blob> }>} entries
 * @param {{ prefix?: string }} [options]  prefix: prefisso lingua dei link (es. "/en/"), solo per il sito tradotto
 */
export function createPreviewSource(entries, { prefix = '/' } = {}) {
  const root = detectSiteRoot(entries.map((e) => e.relPath));
  const prefixDir = prefix && prefix !== '/' ? prefix.replace(/^\/+/, '') : null; // "en/"

  /** @type {Map<string, object>} percorso (relativo alla radice del sito) -> entry */
  const files = new Map();
  for (const entry of entries) {
    if (entry.relPath.startsWith(root)) files.set(entry.relPath.slice(root.length), entry);
  }

  // ---------- Elenco pagine ----------
  const depth = (p) => p.split('/').length;
  const pages = [...files.keys()]
    .filter((p) => PAGE_EXTS.has(getExt(p)))
    .sort((a, b) => depth(a) - depth(b) || (a === 'index.html' ? -1 : b === 'index.html' ? 1 : a.localeCompare(b)));
  const defaultPage = pages.includes('index.html') ? 'index.html' : pages[0] ?? null;

  // ---------- Risoluzione riferimenti ----------
  function findFile(path) {
    const variants = (p) => (p === '' || p.endsWith('/')
      ? [`${p}index.html`, `${p}index.htm`, `${p}index.php`]
      : [p, `${p}.html`, `${p}/index.html`]);

    for (const v of variants(path)) if (files.has(v)) return v;

    // Link del sito tradotto: /en/pagina.html -> pagina.html
    if (prefixDir) {
      const bare = prefixDir.replace(/\/$/, '');
      let stripped = null;
      if (path === bare) stripped = '';
      else if (path.startsWith(prefixDir)) stripped = path.slice(prefixDir.length);
      if (stripped !== null) {
        for (const v of variants(stripped)) if (files.has(v)) return v;
      }
    }
    return null;
  }

  // Restituisce null (nulla da fare), { external: true } oppure { path, hash }
  function parseRef(ref, fromPath) {
    const raw = (ref || '').trim();
    if (!raw || raw.startsWith('#')) return null;
    if (raw.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(raw)) return { external: true };

    const [, pathPart, , hash = ''] = raw.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
    if (!pathPart) return null; // solo query string

    let pathname;
    try {
      pathname = new URL(pathPart, `https://site.local/${fromPath}`).pathname;
    } catch {
      return null;
    }
    return { path: safeDecode(pathname).replace(/^\/+/, ''), hash };
  }

  // ---------- Asset -> data URL (con cache) ----------
  const dataUrlCache = new Map();
  const cssCache = new Map();
  let cachedChars = 0;

  function assetDataUrl(path) {
    if (dataUrlCache.has(path)) return dataUrlCache.get(path);

    const promise = (async () => {
      const blob = await files.get(path).getBlob();
      if (blob.size > MAX_ASSET_BYTES) return null;
      const url = await blobToDataUrl(new Blob([blob], { type: mimeFor(path) }));
      cachedChars += url.length;
      if (cachedChars > CACHE_BUDGET_CHARS) {
        dataUrlCache.clear();
        cssCache.clear();
        cachedChars = 0;
      }
      return url;
    })();

    dataUrlCache.set(path, promise);
    return promise;
  }

  async function inlineRef(ref, fromPath) {
    const parsed = parseRef(ref, fromPath);
    if (!parsed || parsed.external) return null;
    const found = findFile(parsed.path);
    return found ? assetDataUrl(found) : null;
  }

  // ---------- CSS: @import e url() ----------
  const IMPORT_RE = /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)\s*([^;]*);/gi;
  const URL_RE = /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi;

  async function rewriteCss(css, cssPath, stack) {
    const withImports = await replaceAsync(css, IMPORT_RE, async (m) => {
      const parsed = parseRef(m[2] ?? m[4], cssPath);
      if (!parsed || parsed.external) return m[0]; // es. @import da Google Fonts: resta com'è
      const found = findFile(parsed.path);
      if (!found || stack.size >= MAX_CSS_IMPORT_DEPTH) return m[0];

      const inner = await processCssFile(found, stack);
      const media = (m[5] || '').trim();
      return media ? `@media ${media} {\n${inner}\n}` : inner;
    });

    return replaceAsync(withImports, URL_RE, async (m) => {
      const ref = m[2].trim();
      if (!ref || ref.startsWith('data:') || ref.startsWith('#')) return m[0];
      const dataUrl = await inlineRef(ref, cssPath);
      return dataUrl ? `url("${dataUrl}")` : m[0];
    });
  }

  async function processCssFile(path, stack = new Set()) {
    if (stack.has(path)) return ''; // import circolare
    if (cssCache.has(path)) return cssCache.get(path);

    const nextStack = new Set(stack).add(path);
    const promise = (async () => rewriteCss(await files.get(path).getText(), path, nextStack))();
    cssCache.set(path, promise);
    return promise;
  }

  // ---------- Costruzione di una pagina ----------
  const SRC_SELECTOR = 'img[src],source[src],video[src],audio[src],track[src],input[type="image"][src]';

  async function inlineAttr(el, attr, fromPath) {
    const value = el.getAttribute(attr);
    if (!value) return;
    const dataUrl = await inlineRef(value, fromPath);
    if (dataUrl) el.setAttribute(attr, dataUrl);
  }

  async function inlineSrcset(el, attr, fromPath) {
    const value = el.getAttribute(attr);
    if (!value) return;

    const parts = await Promise.all(
      value.split(',').map(async (candidate) => {
        const [url, ...descriptor] = candidate.trim().split(/\s+/);
        if (!url) return '';
        const dataUrl = await inlineRef(url, fromPath);
        return [dataUrl || url, ...descriptor].join(' ');
      })
    );
    el.setAttribute(attr, parts.filter(Boolean).join(', '));
  }

  function rewriteAnchors(doc, pagePath) {
    for (const a of doc.querySelectorAll('a[href]')) {
      const href = a.getAttribute('href');
      const parsed = parseRef(href, pagePath);
      if (!parsed) continue;

      if (parsed.external) {
        if (/^(https?:)?\/\//i.test(href.trim())) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
        continue;
      }

      const found = findFile(parsed.path);
      if (!found) {
        a.setAttribute('data-st-miss', href);
      } else if (found === pagePath) {
        a.setAttribute('href', parsed.hash || '#'); // stessa pagina: ancora nativa
      } else if (NAVIGABLE_EXTS.has(getExt(found))) {
        a.setAttribute('data-st-path', found);
        a.setAttribute('data-st-hash', parsed.hash);
      } else {
        a.setAttribute('data-st-skip', '');
      }
    }
  }

  /**
   * @returns {Promise<{ html: string, title: string }>}
   */
  async function buildPage(path, { hash = '' } = {}) {
    const entry = files.get(path);
    if (!entry) {
      return { html: messagePage('Pagina non trovata', `Nel progetto non esiste <code>${escapeHtml(path || '')}</code>.`), title: '' };
    }
    if (!PAGE_EXTS.has(getExt(path))) {
      return {
        html: messagePage('Anteprima non disponibile', `<code>${escapeHtml(path)}</code> è un file PHP: richiede un server per essere eseguito.`),
        title: path,
      };
    }

    const source = await entry.getText();
    const doc = new DOMParser().parseFromString(source, 'text/html');
    doc.querySelectorAll('base').forEach((b) => b.remove());

    const tasks = [];

    // Fogli di stile e icone
    for (const link of doc.querySelectorAll('link[href]')) {
      const rel = (link.getAttribute('rel') || '').toLowerCase();

      if (rel.includes('stylesheet')) {
        tasks.push((async () => {
          const parsed = parseRef(link.getAttribute('href'), path);
          const found = parsed && !parsed.external ? findFile(parsed.path) : null;
          if (!found) return;

          const style = doc.createElement('style');
          const media = link.getAttribute('media');
          if (media) style.setAttribute('media', media);
          style.textContent = (await processCssFile(found)).replace(/<\/style/gi, '<\\/style');
          link.replaceWith(style);
        })());
      } else if (rel.includes('icon')) {
        tasks.push(inlineAttr(link, 'href', path));
      }
    }

    // Script locali: data URL (mantiene defer/async/type=module)
    for (const script of doc.querySelectorAll('script[src]')) {
      tasks.push((async () => {
        const parsed = parseRef(script.getAttribute('src'), path);
        const found = parsed && !parsed.external ? findFile(parsed.path) : null;
        if (!found) return;

        const dataUrl = await assetDataUrl(found);
        if (!dataUrl) return;
        script.setAttribute('src', dataUrl);
        script.removeAttribute('integrity');
        script.removeAttribute('crossorigin');
      })());
    }

    // Media
    for (const el of doc.querySelectorAll(SRC_SELECTOR)) tasks.push(inlineAttr(el, 'src', path));
    for (const el of doc.querySelectorAll('[data-src]')) tasks.push(inlineAttr(el, 'data-src', path));
    for (const el of doc.querySelectorAll('video[poster]')) tasks.push(inlineAttr(el, 'poster', path));
    for (const el of doc.querySelectorAll('[srcset]')) tasks.push(inlineSrcset(el, 'srcset', path));
    for (const el of doc.querySelectorAll('[data-srcset]')) tasks.push(inlineSrcset(el, 'data-srcset', path));

    // CSS inline: <style> e attributo style
    for (const style of doc.querySelectorAll('style')) {
      tasks.push((async () => {
        style.textContent = await rewriteCss(style.textContent, path, new Set([path]));
      })());
    }
    for (const el of doc.querySelectorAll('[style*="url("]')) {
      tasks.push((async () => {
        el.setAttribute('style', await rewriteCss(el.getAttribute('style'), path, new Set([path])));
      })());
    }

    rewriteAnchors(doc, path);
    await Promise.all(tasks);

    // Script di supporto: navigazione tra pagine e scroll all'ancora
    const bridge = doc.createElement('script');
    bridge.textContent = BRIDGE_SCRIPT;
    doc.head.prepend(bridge);

    const scrollScript = buildScrollToHashScript(hash);
    if (scrollScript) {
      const el = doc.createElement('script');
      el.textContent = scrollScript;
      doc.body.append(el);
    }

    return { html: serializeHtmlDoc(doc, source), title: doc.title || path };
  }

  return {
    pages,
    defaultPage,
    hasPage: (path) => pages.includes(path),
    buildPage,
  };
}
