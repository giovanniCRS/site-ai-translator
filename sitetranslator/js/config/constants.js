// Costanti del motore di traduzione e della UI.

export const MAX_CHARS_PER_HTML_BATCH = 1200;
export const MAX_CHARS_PER_CODE_CHUNK = 1400;
export const DELAY_BETWEEN_CALLS_MS = 2500;
export const MAX_RETRIES = 5;

export const TRANSLATABLE_EXTS = new Set(['.html', '.htm', '.js', '.php']);
export const SKIP_HTML_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'SVG']);
export const TRANSLATABLE_ATTRS = ['alt', 'title', 'placeholder', 'aria-label'];
export const META_SELECTORS = [
  'meta[name="description"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:image:alt"]',
  'meta[name="og:title"]',
  'meta[name="og:description"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'meta[name="twitter:image:alt"]',
].join(', ');

export const IGNORED_DIRS = ['node_modules', '.git', '__MACOSX'];

export const GROQ_API_BASE = 'https://api.groq.com/openai/v1';
export const MIN_API_KEY_LENGTH = 15;

export const STORAGE_KEYS = {
  apiKey: 'st_groq_key',
  model: 'st_groq_model',
  theme: 'st_theme',
};

// Sotto questa larghezza la sidebar diventa un drawer (deve coincidere con css/responsive.css)
export const MOBILE_BREAKPOINT_PX = 900;

export const DEFAULT_SAVED_MODEL = 'llama-3.3-70b-versatile';
export const REQUEST_FALLBACK_MODEL = 'openai/gpt-oss-20b';
export const CUSTOM_MODEL_VALUE = '__custom__';

// Modelli di fallback (prima che venga caricata la lista live da Groq)
export const FALLBACK_MODELS = [
  { id: 'llama-3.3-70b-versatile' },
  { id: 'llama-3.1-8b-instant' },
  { id: 'qwen/qwen3.8-27b' },
];
