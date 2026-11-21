// Mappa nome lingua -> codice ISO usato per <html lang>.

export const LANG_CODES = {
  english: 'en', french: 'fr', spanish: 'es', german: 'de', portuguese: 'pt', italian: 'it',
  dutch: 'nl', russian: 'ru', polish: 'pl', turkish: 'tr', swedish: 'sv', danish: 'da',
  norwegian: 'no', finnish: 'fi', greek: 'el', czech: 'cs', romanian: 'ro', hungarian: 'hu',
  ukrainian: 'uk', arabic: 'ar', hebrew: 'he', hindi: 'hi', japanese: 'ja', korean: 'ko',
  chinese: 'zh', 'simplified chinese': 'zh-Hans', 'traditional chinese': 'zh-Hant',
  thai: 'th', vietnamese: 'vi', indonesian: 'id', malay: 'ms', catalan: 'ca',
};

// Nome lingua -> codice; se l'utente scrive già un codice lo usa; ultimo fallback = prefisso URL.
export function resolveLangCode(targetLang, normalizedPrefix) {
  const key = (targetLang || '').trim().toLowerCase();
  if (LANG_CODES[key]) return LANG_CODES[key];
  if (/^[a-z]{2,3}(-[a-z0-9]{2,8})?$/i.test(key)) return key;
  return normalizedPrefix.replace(/\//g, '') || 'en';
}
