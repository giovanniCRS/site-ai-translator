import { MOBILE_BREAKPOINT_PX } from '../config/constants.js';

// Su schermi stretti la sidebar è un drawer: si apre dal menu, si chiude con backdrop, Esc o chiusura esplicita.
export function initSidebarDrawer({ sidebar, menuBtn, sidebarClose, backdrop }) {
  const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);

  function setOpen(open, { restoreFocus = true } = {}) {
    sidebar.classList.toggle('open', open);
    backdrop.classList.toggle('show', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('no-scroll', open);

    if (open) sidebarClose.focus();
    else if (restoreFocus && mobileQuery.matches) menuBtn.focus();
  }

  menuBtn.addEventListener('click', () => setOpen(true));
  sidebarClose.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('open')) setOpen(false);
  });

  // Tornando a desktop il drawer si azzera
  mobileQuery.addEventListener('change', (e) => {
    if (!e.matches) setOpen(false, { restoreFocus: false });
  });
}
