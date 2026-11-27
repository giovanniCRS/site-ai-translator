// Entry point: costruisce i servizi e collega UI e pipeline.

import { createPreviewSource } from './core/preview-source.js';
import { summarizeProject } from './core/project-summary.js';
import { runTranslation } from './core/pipeline.js';
import { createGroqClient } from './services/groq-client.js';
import { initConsoleDock } from './ui/console-dock.js';
import { initDropzone } from './ui/dropzone.js';
import { els } from './ui/dom.js';
import { createDownloadButton } from './ui/download-button.js';
import { initLanguagePanel } from './ui/language-panel.js';
import { createLayoutController } from './ui/layout-controller.js';
import { createLogger } from './ui/logger.js';
import { createProgress } from './ui/progress.js';
import { createPreviewPanel } from './ui/preview-panel.js';
import { createProjectSummary } from './ui/project-summary.js';
import { initSettingsPanel } from './ui/settings-panel.js';
import { initSidebarDrawer } from './ui/sidebar-drawer.js';
import { createTimer, formatDuration } from './ui/timer.js';
import { initThemeToggle } from './ui/theme-toggle.js';
import { normalizePrefix } from './utils/url.js';

const logger = createLogger(els);
const progress = createProgress(els);
const client = createGroqClient({ logger });
const download = createDownloadButton(els.downloadBtn);
const projectSummary = createProjectSummary(els);
const preview = createPreviewPanel(els, { logger });

initThemeToggle(els.themeBtn);
const drawer = initSidebarDrawer(els);
const layout = createLayoutController(els, { drawer });
const timer = createTimer({ valueEl: els.timerValue, labelEl: els.timerLabel });
const language = initLanguagePanel(els);
const settings = initSettingsPanel(els, { client, logger });
initConsoleDock(els, logger);

let selectedFiles = [];

initDropzone(els, {
  async onSelect(files, label) {
    if (files.length === 0) return;

    try {
      const summary = await summarizeProject(files);
      selectedFiles = files;
      els.startBtn.disabled = false;
      download.hide();
      timer.reset();
      logger.info(`Caricato "${label}" (${summary.total} file: ${summary.html} HTML, ${summary.js} JS, ${summary.php} PHP, ${summary.assets} asset).`);

      // Prima si chiude la sidebar, poi riquadri e anteprima prendono il nuovo posto
      await layout.enterProjectMode(() => {
        projectSummary.show(label, summary);
        preview.setOriginal(createPreviewSource(summary.entries));
      });

      if (summary.html + summary.js + summary.php === 0) {
        logger.warn('Nessun file traducibile (HTML, JS, PHP) trovato: verrà copiato tutto senza modifiche.');
      }
    } catch (err) {
      logger.error(`Impossibile leggere "${label}": ${err.message}`);
    }
  },
});

els.startBtn.addEventListener('click', async () => {
  const apiKey = settings.getApiKey();

  if (!apiKey) {
    logger.error('Inserisci prima la tua Groq API Key nelle impostazioni (icona ingranaggio).');
    settings.openAdvanced();
    return;
  }
  if (selectedFiles.length === 0) return;

  const options = { apiKey, model: settings.getModel(), ...language.getConfig() };

  els.startBtn.disabled = true;
  download.hide();
  progress.start();
  timer.start();

  try {
    const { blob, files, stats } = await runTranslation({ selectedFiles, options, client, logger, progress });

    download.show(blob, options.targetLang);
    progress.complete(
      'Traduzione completata!',
      `${stats.translated} tradotti · ${stats.copied} copiati · ${stats.failed} errori`
    );
    const elapsed = timer.stop('Tempo totale');
    logger.success(`Archivio ZIP pronto per il download! Tempo totale: ${formatDuration(elapsed)}.`);

    preview.setTranslated(createPreviewSource(files, { prefix: normalizePrefix(options.langPrefix) }));
  } catch (err) {
    const elapsed = timer.stop('Interrotto dopo');
    logger.error(`Errore fatale dopo ${formatDuration(elapsed)}: ${err.message}`);
  } finally {
    els.startBtn.disabled = false;
  }
});
