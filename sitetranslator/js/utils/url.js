export function normalizePrefix(prefix) {
  const clean = (prefix || '').replace(/^\/+|\/+$/g, '');
  return clean ? `/${clean}/` : '/';
}

// Restituisce il nuovo href con prefisso lingua, oppure null se il link non va toccato.
// I link relativi vengono risolti rispetto alla posizione del file (gestisce ../ e ./).
export function prefixInternalHref(href, relPath, normalizedPrefix) {
  if (!href || normalizedPrefix === '/') return null;

  const h = href.trim();
  if (
    !h ||
    h.startsWith('#') ||
    h.startsWith('?') ||
    h.startsWith('//') ||
    /^[a-z][a-z0-9+.-]*:/i.test(h)
  ) {
    return null;
  }

  let url;
  try {
    url = new URL(h, 'https://site.local/' + relPath.replace(/^\/+/, ''));
  } catch {
    return null;
  }

  const path = url.pathname;
  if (path.startsWith(normalizedPrefix)) return null;

  const last = path.split('/').pop();
  const isPage = /\.(html?|php)$/i.test(last);
  const isFolder = path.endsWith('/') || (last !== '' && !last.includes('.'));
  if (!isPage && !isFolder) return null;

  return normalizedPrefix.slice(0, -1) + path + url.search + url.hash;
}
