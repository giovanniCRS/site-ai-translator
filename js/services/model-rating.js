// Sistema a semaforo: valuta l'idoneità di un modello Groq per tradurre siti web.

const rating = (tier, score, dot, title, desc) => ({ tier, score, dot, title, desc });

// Regole in ordine di priorità: la prima che combacia vince.
const RULES = [
  // ROSSO: sconsigliati
  {
    match: (id) => id.includes('allam'),
    result: rating('red', 1, '🔴', 'Sconsigliato per siti web', 'Pensato per arabo/inglese: bassa resa su italiano e codice HTML/JS.'),
  },
  {
    match: (id) => id.includes('vision') || id.includes('llava') || id.includes('compound'),
    result: rating('red', 1, '🔴', 'Non adatto a questo task', 'Progettato per altri compiti (visione o agenti), non per traduzione codice.'),
  },
  // VERDE: ottimi per traduzione web app
  {
    match: (id) => id.includes('gpt-oss-20b'),
    result: rating('green', 100, '🟢', 'Consigliato · Veloce e stabile', 'Ottimo su HTML/JS/PHP e con limiti gratuiti più generosi.'),
  },
  {
    match: (id) => id.includes('gpt-oss-120b'),
    result: rating('green', 95, '🟢', 'Ottima qualità di traduzione', 'Molto fedele su testi curati e codice complesso.'),
  },
  {
    match: (id) => id.includes('llama-3.3-70b') || id.includes('llama-4'),
    result: rating('green', 98, '🟢', 'Consigliato · Alta precisione', 'Eccellente su lingue europee, rispetta bene i tag XML e la sintassi.'),
  },
  {
    match: (id) => id.includes('llama-3.1-8b-instant'),
    result: rating('green', 90, '🟢', 'Ottimo per siti grandi', 'Molto rapido e meno soggetto a blocchi 429 sul piano gratuito.'),
  },
  {
    match: (id) => id.includes('mixtral') || id.includes('gemma2-9b') || id.includes('deepseek'),
    result: rating('green', 85, '🟢', 'Buono per traduzioni web', 'Affidabile nella gestione di testi e attributi HTML.'),
  },
  // ARANCIO: buoni ma con limiti
  {
    match: (id) => id.includes('qwen'),
    result: rating('orange', 60, '🟠', 'Buona qualità · Rate limit stretti', 'Traduce bene, ma sul piano gratuito va spesso in pausa 429.'),
  },
];

// Default arancio per modelli nuovi non ancora classificati
const DEFAULT_RATING = rating(
  'orange', 50, '🟠',
  'Modello generico da testare',
  'Compatibile con la chat, ma la resa su HTML/JS dipende dal modello.'
);

export function evaluateModelForWeb(id) {
  const low = (id || '').toLowerCase();
  return RULES.find((rule) => rule.match(low))?.result ?? DEFAULT_RATING;
}

// Esclude modelli audio / TTS / guard.
export function isChatModel(id) {
  const low = id.toLowerCase();
  const excluded = ['whisper', 'tts', 'guard', 'playai', 'distil-whisper', 'orpheus'];
  return !excluded.some((k) => low.includes(k));
}

// Ordina dal migliore (verde) al peggiore (rosso).
export function rankModels(ids) {
  return [...new Set(ids)]
    .map((id) => ({ id, eval: evaluateModelForWeb(id) }))
    .sort((a, b) => b.eval.score - a.eval.score || a.id.localeCompare(b.id));
}
