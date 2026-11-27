import { PREVIEW_MESSAGE_SOURCE } from '../core/preview-bridge.js';
import { createPreviewStorage } from '../core/preview-storage.js';
import { createDropdown } from './dropdown.js';

const DEVICE_WIDTHS = { desktop: 1280, tablet: 820, mobile: 390 };
const STAGE_PADDING = 12;
const SMALL_SCREEN_PX = 700;

/**
 * Card "Anteprima": mostra il sito originale e quello tradotto uno accanto all'altro.
 * Ogni pannello ha il proprio iframe in sandbox e la propria memoria (cookie, localStorage),
 * quindi le scelte fatte in un sito (cookie, lingua, età) non influenzano l'altro.
 * Il selettore pagina e i link interni portano entrambi i pannelli sulla stessa pagina.
 */
export function createPreviewPanel(els, { logger }) {
  const {
    previewCard, previewPanes, previewPageTrigger, previewPageText, previewPageList,
    previewExpandBtn, previewResetBtn, deviceButtons,
  } = els;

  function createPane(key) {
    const root = previewPanes.querySelector(`[data-pane="${key}"]`);
    const q = (selector) => root.querySelector(selector);
    return {
      key,
      stage: q('.preview-stage'),
      scaler: q('.preview-scaler'),
      viewport: q('.preview-viewport'),
      frame: q('.preview-frame'),
      status: q('.preview-status'),
      source: null,
      storage: createPreviewStorage(), // memoria separata per ogni sito
      token: 0,
    };
  }

  const panes = { original: createPane('original'), translated: createPane('translated') };
  const allPanes = Object.values(panes);

  const state = {
    path: null,
    device: window.innerWidth < SMALL_SCREEN_PX ? 'mobile' : 'tablet',
    expanded: false,
  };

  const pageDropdown = createDropdown({
    trigger: previewPageTrigger,
    triggerText: previewPageText,
    list: previewPageList,
    placeholder: 'Nessuna pagina',
    onChange: (path) => navigate(path),
  });

  // ---------- Stato visivo ----------
  function setStatus(pane, kind, text = '') {
    pane.status.hidden = kind === null;
    pane.status.textContent = text;
    pane.status.dataset.kind = kind || '';
  }

  function syncDevices() {
    deviceButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.device === state.device)));
    allPanes.forEach((pane) => { pane.scaler.dataset.device = state.device; });
  }

  function syncPages() {
    const pages = panes.original.source ? panes.original.source.pages : [];
    pageDropdown.setOptions(
      pages.map((p) => ({ value: p, label: `/${p}`, dot: false })),
      state.path
    );
  }

  // ---------- Scala dell'iframe: simula la larghezza dello schermo scelto ----------
  function layoutPane(pane) {
    const availW = pane.stage.clientWidth - STAGE_PADDING * 2;
    const availH = pane.stage.clientHeight - STAGE_PADDING * 2;
    if (availW <= 0 || availH <= 0) return;

    const deviceW = DEVICE_WIDTHS[state.device];
    const scale = Math.min(1, availW / deviceW);

    pane.scaler.style.width = `${Math.round(deviceW * scale)}px`;
    pane.scaler.style.height = `${availH}px`;
    pane.viewport.style.width = `${deviceW}px`;
    pane.viewport.style.height = `${availH / scale}px`;
    pane.viewport.style.transform = `scale(${scale})`;
  }

  const layout = () => allPanes.forEach(layoutPane);
  const observer = new ResizeObserver(layout);
  allPanes.forEach((pane) => observer.observe(pane.stage));

  // ---------- Rendering ----------
  async function renderPane(pane, { hash = '' } = {}) {
    const token = ++pane.token;

    if (!pane.source) {
      pane.frame.removeAttribute('srcdoc');
      setStatus(pane, 'empty', pane.key === 'translated' ? 'La versione tradotta comparirà qui al termine della traduzione.' : '');
      return;
    }

    if (!state.path) {
      pane.frame.removeAttribute('srcdoc');
      setStatus(pane, 'empty', 'Nessuna pagina HTML da mostrare in questo progetto.');
      return;
    }

    setStatus(pane, 'loading', 'Preparo l\'anteprima…');

    try {
      const { html } = await pane.source.buildPage(state.path, { hash, storage: pane.storage.snapshot() });
      if (token !== pane.token) return; // è partito un rendering più recente
      pane.frame.srcdoc = html;
      setStatus(pane, null);
    } catch (err) {
      if (token !== pane.token) return;
      logger.error(`Anteprima (${pane.key}) di ${state.path} non riuscita: ${err.message}`);
      setStatus(pane, 'error', 'Impossibile mostrare questa pagina. Dettagli nel terminale.');
    }
  }

  const renderAll = (opts) => Promise.all(allPanes.map((pane) => renderPane(pane, opts)));

  function navigate(path, hash = '') {
    state.path = path;
    syncPages();
    renderAll({ hash });
  }

  // ---------- Espansione a tutto schermo ----------
  function setExpanded(expanded) {
    state.expanded = expanded;
    previewCard.classList.toggle('expanded', expanded);
    document.body.classList.toggle('no-scroll', expanded);
    previewExpandBtn.setAttribute('aria-label', expanded ? 'Chiudi anteprima a tutto schermo' : 'Espandi anteprima');
    previewExpandBtn.title = expanded ? 'Chiudi (Esc)' : 'Espandi anteprima';
  }

  // ---------- Eventi ----------
  deviceButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.device = btn.dataset.device;
      syncDevices();
      layout();
    });
  });

  previewExpandBtn.addEventListener('click', () => setExpanded(!state.expanded));

  // Dimentica cookie e dati salvati dai due siti (per rivedere banner cookie, verifica età, ecc.)
  previewResetBtn.addEventListener('click', () => {
    allPanes.forEach((pane) => pane.storage.reset());
    logger.info('Anteprima: cookie e dati dei siti azzerati.');
    renderAll();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.expanded && !pageDropdown.isOpen()) setExpanded(false);
  });

  // Messaggi dallo script iniettato nelle pagine: scritture di memoria e click sui link interni
  window.addEventListener('message', (e) => {
    const pane = allPanes.find((p) => e.source === p.frame.contentWindow);
    if (!pane) return;
    const msg = e.data;
    if (!msg || msg.source !== PREVIEW_MESSAGE_SOURCE) return;

    if (msg.type === 'storage') {
      pane.storage.apply(msg);
    } else if (msg.type === 'navigate') {
      // Vale per entrambi i pannelli, così restano confrontabili (anche per pagine PHP o non elencate)
      state.path = msg.path;
      syncPages();
      renderAll({ hash: msg.hash });
    } else if (msg.type === 'missing') {
      logger.warn(`Anteprima: il link "${msg.ref}" non punta a nessun file del progetto.`);
    }
  });

  syncDevices();
  setStatus(panes.translated, 'empty', 'La versione tradotta comparirà qui al termine della traduzione.');

  // ---------- API pubblica ----------
  return {
    // Nuovo progetto caricato: mostra l'originale e svuota il tradotto
    setOriginal(source) {
      allPanes.forEach((pane) => pane.storage.reset());
      panes.original.source = source;
      panes.translated.source = null;
      state.path = source.defaultPage;

      previewCard.hidden = false;

      syncPages();
      layout();
      renderAll();
    },

    // Traduzione completata: il pannello di destra mostra il sito tradotto (l'originale non si ricarica)
    setTranslated(source) {
      panes.translated.source = source;
      renderPane(panes.translated);

      if (!state.expanded && !previewCard.parentElement.classList.contains('side-by-side')) {
        previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
  };
}
