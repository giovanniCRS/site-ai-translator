// Riferimenti centralizzati agli elementi del DOM (gli script sono moduli: il DOM è già pronto).

const byId = (id) => document.getElementById(id);

export const els = {
  // Layout
  app: byId('app'),
  workScroll: byId('workScroll'),
  workLayout: byId('workLayout'),
  controlCard: byId('controlCard'),
  sidebar: byId('sidebar'),
  sidebarClose: byId('sidebarClose'),
  backdrop: byId('backdrop'),
  menuBtn: byId('menuBtn'),
  themeBtn: byId('themeBtn'),

  // Dropzone e riepilogo progetto
  dropzone: byId('dropzone'),
  folderInput: byId('folderInput'),
  zipInput: byId('zipInput'),
  pickFolderBtn: byId('pickFolderBtn'),
  pickZipBtn: byId('pickZipBtn'),
  projectSummary: byId('projectSummary'),
  projectName: byId('projectName'),
  projectChips: byId('projectChips'),

  // Anteprima
  previewCard: byId('previewCard'),
  previewTabOriginal: byId('previewTabOriginal'),
  previewTabTranslated: byId('previewTabTranslated'),
  previewPageTrigger: byId('previewPageTrigger'),
  previewPageText: byId('previewPageText'),
  previewPageList: byId('previewPageList'),
  previewExpandBtn: byId('previewExpandBtn'),
  previewResetBtn: byId('previewResetBtn'),
  previewStage: byId('previewStage'),
  previewScaler: byId('previewScaler'),
  previewViewport: byId('previewViewport'),
  previewFrame: byId('previewFrame'),
  previewStatus: byId('previewStatus'),
  deviceButtons: [...document.querySelectorAll('[data-device]')],

  // Azioni
  startBtn: byId('startBtn'),
  downloadBtn: byId('downloadBtn'),

  // Terminale
  consoleDrawer: byId('consoleDrawer'),
  terminalBody: byId('terminalBody'),
  clearTermBtn: byId('clearTermBtn'),
  toggleConsoleBtn: byId('toggleConsoleBtn'),
  resizer: byId('resizer'),
  errBadge: byId('errBadge'),

  // Lingua
  langPreset: byId('langPreset'),
  customLangWrap: byId('customLangWrap'),
  targetLang: byId('targetLang'),
  langPrefix: byId('langPrefix'),
  wrapInPrefix: byId('wrapInPrefix'),

  // Impostazioni (dialog)
  settingsDialog: byId('settingsDialog'),
  toggleAdvBtn: byId('toggleAdvBtn'),
  engineHint: byId('engineHint'),
  modelChipName: byId('modelChipName'),
  modelChipDot: byId('modelChipDot'),
  apiKey: byId('apiKey'),
  modelTrigger: byId('modelTrigger'),
  modelTriggerDot: byId('modelTriggerDot'),
  modelTriggerText: byId('modelTriggerText'),
  modelList: byId('modelList'),
  customModelWrap: byId('customModelWrap'),
  customModelInput: byId('customModelInput'),
  refreshModelsBtn: byId('refreshModelsBtn'),
  modelHint: byId('modelHint'),
  modelRating: byId('modelRating'),
  modelRatingTitle: byId('modelRatingTitle'),
  modelRatingDesc: byId('modelRatingDesc'),
  envDot: byId('envDot'),
  envText: byId('envText'),

  // Controlli di esecuzione
  runControls: byId('runControls'),
  pauseBtn: byId('pauseBtn'),
  pauseLabel: byId('pauseLabel'),
  stopBtn: byId('stopBtn'),

  // Timer
  timerLabel: byId('timerLabel'),
  timerValue: byId('timerValue'),

  // Progresso
  mainBar: byId('mainBar'),
  mainLabel: byId('mainLabel'),
  mainPercent: byId('mainPercent'),
  subBar: byId('subBar'),
  subLabel: byId('subLabel'),
  subPercent: byId('subPercent'),
};
