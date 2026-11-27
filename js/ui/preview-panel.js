import { PREVIEW_MESSAGE_SOURCE } from '../core/preview-bridge.js';
import { createPreviewStorage } from '../core/preview-storage.js';
import { createDropdown } from './dropdown.js';

const DEVICE_WIDTHS = { desktop: 1280, tablet: 820, mobile: 390 };
const STAGE_PADDING = 12;
const SMALL_SCREEN_PX = 700;

/**
 * Card "Anteprima": mostra il sito originale e, a fine traduzione, quello tradotto.
 * Le pagine sono renderizzate in un iframe in sandbox e scalate per simulare lo schermo scelto.
 */
export function createPreviewPanel(els, { logger }) {
  const {
    previewCard, previewTabOriginal, previewTabTranslated, previewPageTrigger, previewPageText, previewPageList,
    previewExpandBtn, previewResetBtn, previewStage, previewScaler, previewViewport, previewFrame, previewStatus, deviceButtons,
  } = els;

  // Cookie e localStorage condivisi tra originale e tradotto
  const siteStorage = createPreviewStorage();

  const state = {
    sources: { original: null, translated: null },
    mode: 'original',
    path: null,
    device: window.innerWidth < SMALL_SCREEN_PX ? 'mobile' : 'desktop',
    expanded: false,
    renderToken: 0,
  };

  const pageDropdown = createDropdown({
    trigger: previewPageTrigger,
    triggerText: previewPageText,
    list: previewPageList,
    placeholder: 'Nessuna pagina',
    onChange: (path) => navigate(path),
  });

  const currentSource = () => state.sources[state.mode];

  // ---------- Stato visivo ----------
  function setStatus(kind, text = '') {
    previewStatus.hidden = kind === null;
    previewStatus.textContent = text;
    previewStatus.dataset.kind = kind || '';
  }

  function syncTabs() {
    const isOriginal = state.mode === 'original';
    previewTabOriginal.setAttribute('aria-pressed', String(isOriginal));
    previewTabTranslated.setAttribute('aria-pressed', String(!isOriginal));
  }

  function syncDevices() {
    deviceButtons.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.device === state.device)));
    previewScaler.dataset.device = state.device;
  }

  function syncPages() {
    const source = currentSource();
    const pages = source ? source.pages : [];
    pageDropdown.setOptions(
      pages.map((p) => ({ value: p, label: `/${p}`, dot: false })),
      state.path
    );
  }

  // ---------- Scala dell'iframe: simula la larghezza dello schermo scelto ----------
  function layout() {
    const availW = previewStage.clientWidth - STAGE_PADDING * 2;
    const availH = previewStage.clientHeight - STAGE_PADDING * 2;
    if (availW <= 0 || availH <= 0) return;

    const deviceW = DEVICE_WIDTHS[state.device];
    const scale = Math.min(1, availW / deviceW);

    previewScaler.style.width = `${Math.round(deviceW * scale)}px`;
    previewScaler.style.height = `${availH}px`;
    previewViewport.style.width = `${deviceW}px`;
    previewViewport.style.height = `${availH / scale}px`;
    previewViewport.style.transform = `scale(${scale})`;
  }

  new ResizeObserver(layout).observe(previewStage);

  // ---------- Rendering ----------
  async function render({ hash = '' } = {}) {
    const source = currentSource();
    if (!source) return;

    if (!state.path) {
      previewFrame.removeAttribute('srcdoc');
      setStatus('empty', 'Nessuna pagina HTML da mostrare in questo progetto.');
      return;
    }

    const token = ++state.renderToken;
    setStatus('loading', 'Preparo l\'anteprima…');

    try {
      const { html } = await source.buildPage(state.path, { hash, storage: siteStorage.snapshot() });
      if (token !== state.renderToken) return; // è partito un rendering più recente
      previewFrame.srcdoc = html;
      setStatus(null);
    } catch (err) {
      if (token !== state.renderToken) return;
      logger.error(`Anteprima di ${state.path} non riuscita: ${err.message}`);
      setStatus('error', 'Impossibile mostrare questa pagina. Dettagli nel terminale.');
    }
  }

  function navigate(path, hash = '') {
    state.path = path;
    syncPages();
    render({ hash });
  }

  function setMode(mode) {
    if (!state.sources[mode] || state.mode === mode) return;
    state.mode = mode;

    const source = currentSource();
    if (!source.hasPage(state.path)) state.path = source.defaultPage;

    syncTabs();
    syncPages();
    render();
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
  previewTabOriginal.addEventListener('click', () => setMode('original'));
  previewTabTranslated.addEventListener('click', () => setMode('translated'));

  deviceButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.device = btn.dataset.device;
      syncDevices();
      layout();
    });
  });

  previewExpandBtn.addEventListener('click', () => setExpanded(!state.expanded));

  // Dimentica cookie e dati salvati dal sito (per rivedere banner cookie, verifica età, ecc.)
  previewResetBtn.addEventListener('click', () => {
    siteStorage.reset();
    logger.info('Anteprima: cookie e dati del sito azzerati.');
    render();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.expanded && !pageDropdown.isOpen()) setExpanded(false);
  });

  // Click sui link interni dentro l'anteprima (messaggi dallo script iniettato nella pagina)
  window.addEventListener('message', (e) => {
    if (e.source !== previewFrame.contentWindow) return;
    const msg = e.data;
    if (!msg || msg.source !== PREVIEW_MESSAGE_SOURCE) return;

    if (msg.type === 'storage') {
      siteStorage.apply(msg);
      return;
    }

    if (msg.type === 'navigate' && currentSource()?.hasPage(msg.path)) {
      navigate(msg.path, msg.hash);
    } else if (msg.type === 'navigate') {
      // Pagina PHP o non elencata: mostra comunque il messaggio dedicato
      state.path = msg.path;
      render({ hash: msg.hash });
    } else if (msg.type === 'missing') {
      logger.warn(`Anteprima: il link "${msg.ref}" non punta a nessun file del progetto.`);
    }
  });

  syncDevices();

  // ---------- API pubblica ----------
  return {
    // Nuovo progetto caricato: mostra l'originale e azzera il tradotto
    setOriginal(source) {
      siteStorage.reset(); // nuovo progetto: nessun dato del sito precedente
      state.sources = { original: source, translated: null };
      state.mode = 'original';
      state.path = source.defaultPage;

      previewTabTranslated.disabled = true;
      previewTabTranslated.title = 'Disponibile al termine della traduzione';
      previewCard.hidden = false;

      syncTabs();
      syncPages();
      layout();
      render();
    },

    // Traduzione completata: abilita la scheda "Tradotto" e la mostra
    setTranslated(source) {
      state.sources.translated = source;
      state.mode = 'translated';
      if (!source.hasPage(state.path)) state.path = source.defaultPage;

      previewTabTranslated.disabled = false;
      previewTabTranslated.title = '';

      syncTabs();
      syncPages();
      render();

      if (!state.expanded && !previewCard.parentElement.classList.contains('side-by-side')) previewCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
  };
}
