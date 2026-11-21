import { DEFAULT_SAVED_MODEL, STORAGE_KEYS } from '../config/constants.js';

// Wrapper sicuro su localStorage (può lanciare eccezioni in navigazione privata o con storage bloccato).
function read(key, fallback = '') {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage non disponibile: la sessione continua senza persistenza */
  }
}

export const storage = {
  getApiKey: () => read(STORAGE_KEYS.apiKey),
  setApiKey: (value) => write(STORAGE_KEYS.apiKey, value),
  getModel: () => read(STORAGE_KEYS.model) || DEFAULT_SAVED_MODEL,
  setModel: (value) => write(STORAGE_KEYS.model, value),
  getRawModel: () => read(STORAGE_KEYS.model, null),
  getTheme: () => read(STORAGE_KEYS.theme, null),
  setTheme: (value) => write(STORAGE_KEYS.theme, value),
};
