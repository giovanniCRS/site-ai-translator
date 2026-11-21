import { storage } from '../services/storage.js';

// Toggle tema scuro / chiaro. Il tema salvato viene applicato da uno script inline in <head>
// (per evitare il flash); qui si gestisce solo il cambio e la persistenza.
export function initThemeToggle(themeBtn) {
  const root = document.documentElement;
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    themeBtn.setAttribute('aria-label', theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro');
    if (themeColorMeta) themeColorMeta.content = getComputedStyle(root).getPropertyValue('--bg').trim();
  }

  apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');

  themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    apply(next);
    storage.setTheme(next);
  });
}
