import { MOBILE_BREAKPOINT_PX } from '../config/constants.js';

const COLLAPSE_FALLBACK_MS = 700;

/**
 * Sidebar richiudibile.
 * - Desktop: si nasconde e si riapre (la colonna della griglia si anima da/verso 0).
 * - Mobile: è un drawer sopra il contenuto, con backdrop e chiusura da Esc.
 * Espone collapse(), che risolve quando la chiusura animata è terminata.
 */
export function initSidebarDrawer({ app, sidebar, menuBtn, sidebarClose, backdrop }) {
  const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const isMobile = () => mobileQuery.matches;
  const isCollapsed = () => app.classList.contains('sidebar-collapsed');
  const isDrawerOpen = () => sidebar.classList.contains('open');

  function syncMenuButton() {
    const visible = isMobile() ? isDrawerOpen() : !isCollapsed();
    menuBtn.setAttribute('aria-expanded', String(visible));
    const label = visible ? 'Nascondi la barra laterale' : 'Mostra la barra laterale';
    menuBtn.setAttribute('aria-label', label);
    menuBtn.title = label;
  }

  // ---------- Mobile: drawer ----------
  function setDrawer(open, { restoreFocus = true } = {}) {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('show', open);
    document.body.classList.toggle('no-scroll', open);
    syncMenuButton();

    if (open) sidebarClose.focus();
    else if (restoreFocus && isMobile()) menuBtn.focus();
  }

  // ---------- Desktop: colonna richiudibile ----------
  function setCollapsed(collapsed, { focus = true } = {}) {
    app.classList.toggle('sidebar-collapsed', collapsed);
    syncMenuButton();

    if (!focus) return;
    if (collapsed) menuBtn.focus();
    else sidebarClose.focus();
  }

  menuBtn.addEventListener('click', () => {
    if (isMobile()) setDrawer(true);
    else setCollapsed(!isCollapsed());
  });

  sidebarClose.addEventListener('click', () => {
    if (isMobile()) setDrawer(false);
    else setCollapsed(true);
  });

  backdrop.addEventListener('click', () => setDrawer(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isDrawerOpen()) setDrawer(false);
  });

  // Cambiando fascia: il drawer si azzera e il menu riflette lo stato corretto
  mobileQuery.addEventListener('change', () => {
    setDrawer(false, { restoreFocus: false });
  });

  syncMenuButton();

  return {
    isCollapsed,

    // Chiude la sidebar (solo desktop) e risolve a fine animazione
    collapse() {
      if (isMobile() || isCollapsed()) return Promise.resolve();

      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          app.removeEventListener('transitionend', onEnd);
          clearTimeout(timer);
          resolve();
        };
        const onEnd = (e) => {
          if (e.target === app && e.propertyName === 'grid-template-columns') finish();
        };

        app.addEventListener('transitionend', onEnd);
        const timer = setTimeout(finish, COLLAPSE_FALLBACK_MS);

        setCollapsed(true, { focus: false });
        if (reducedMotion.matches) finish();
      });
    },
  };
}
