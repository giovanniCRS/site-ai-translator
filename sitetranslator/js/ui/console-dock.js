const MIN_HEIGHT = 80;
const MAX_HEIGHT = 320;

// Terminale inferiore: richiudibile, ridimensionabile e con pulsante "Pulisci".
export function initConsoleDock({ consoleDrawer, toggleConsoleBtn, clearTermBtn, resizer }, logger) {
  toggleConsoleBtn.addEventListener('click', () => {
    const collapsed = consoleDrawer.classList.toggle('collapsed');
    toggleConsoleBtn.textContent = collapsed ? 'Espandi' : 'Riduci';
  });

  clearTermBtn.addEventListener('click', () => logger.clear());

  let isResizing = false;
  let startY = 0;
  let startH = 0;

  resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startH = consoleDrawer.getBoundingClientRect().height;
    consoleDrawer.classList.remove('collapsed');
    toggleConsoleBtn.textContent = 'Riduci';
    document.body.style.cursor = 'ns-resize';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newHeight = startH + (startY - e.clientY);
    if (newHeight >= MIN_HEIGHT && newHeight <= MAX_HEIGHT) {
      consoleDrawer.style.height = `${newHeight}px`;
    }
  });

  window.addEventListener('mouseup', () => {
    isResizing = false;
    document.body.style.cursor = '';
  });
}
