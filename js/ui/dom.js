// Riferimenti centralizzati agli elementi del DOM (gli script sono moduli: il DOM è già pronto).

const byId = (id) => document.getElementById(id);

export const els = {
  // Layout
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
  statusChip: byId('statusChip'),
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

  // Progresso
  mainBar: byId('mainBar'),
  mainLabel: byId('mainLabel'),
  mainPercent: byId('mainPercent'),
  subBar: byId('subBar'),
  subLabel: byId('subLabel'),
  subPercent: byId('subPercent'),
};
