import {
  CUSTOM_MODEL_VALUE,
  FALLBACK_MODELS,
  MIN_API_KEY_LENGTH,
  REQUEST_FALLBACK_MODEL,
} from '../config/constants.js';
import { evaluateModelForWeb, isChatModel, rankModels } from '../services/model-rating.js';
import { storage } from '../services/storage.js';
import { createDropdown } from './dropdown.js';

const FETCH_DEBOUNCE_MS = 500;

function strongEl(text) {
  const el = document.createElement('strong');
  el.textContent = text;
  return el;
}

// Etichetta breve mostrata accanto al pallino nel menu modelli
const TIER_TAGS = { green: 'Adatto', orange: 'Da valutare', red: 'Sconsigliato' };

/**
 * Pannello impostazioni: API key, selettore modelli live con semaforo, pulsante "Aggiorna".
 */
export function initSettingsPanel(els, { client, logger }) {
  const {
    settingsDialog, toggleAdvBtn, engineHint, modelChipName, modelChipDot,
    apiKey, modelTrigger, modelTriggerDot, modelTriggerText, modelList, customModelWrap, customModelInput,
    refreshModelsBtn, modelHint, modelRating, modelRatingTitle, modelRatingDesc, envDot, envText,
  } = els;

  let fetchTimer = null;

  const modelDropdown = createDropdown({
    trigger: modelTrigger,
    triggerDot: modelTriggerDot,
    triggerText: modelTriggerText,
    list: modelList,
    onChange: handleModelChange,
    placeholder: 'Seleziona un modello',
  });

  // ---------- Dialog impostazioni ----------
  function openSettings() {
    if (!settingsDialog.open) settingsDialog.showModal();
    apiKey.focus();
  }

  toggleAdvBtn.addEventListener('click', openSettings);

  // Click sullo sfondo (fuori dalla card) chiude il dialog
  settingsDialog.addEventListener('click', (e) => {
    if (e.target === settingsDialog) settingsDialog.close();
  });

  // Esc con il menu dei modelli aperto chiude solo il menu, non il dialog
  settingsDialog.addEventListener('cancel', (e) => {
    if (modelDropdown.blocksDialogCancel()) e.preventDefault();
  });

  // ---------- Modello selezionato + semaforo ----------
  function getSelectedModel() {
    const value = modelDropdown.getValue();
    if (value === CUSTOM_MODEL_VALUE) {
      return customModelInput.value.trim() || REQUEST_FALLBACK_MODEL;
    }
    return value || REQUEST_FALLBACK_MODEL;
  }

  function updateRatingUI() {
    const id = getSelectedModel();
    const info = evaluateModelForWeb(id);
    modelRating.className = `model-rating ${info.tier}`;
    modelRatingTitle.textContent = info.title;
    modelRatingDesc.textContent = info.desc;

    // Riepilogo nella sidebar
    modelChipName.textContent = id;
    modelChipDot.className = `tier-dot ${info.tier}`;
  }

  function populateModels(ids, preferredId) {
    const ranked = rankModels(ids);

    const options = ranked.map(({ id, eval: ev }) => ({
      value: id,
      label: id,
      tier: ev.tier,
      tag: TIER_TAGS[ev.tier],
    }));
    options.push({ value: CUSTOM_MODEL_VALUE, label: 'Altro modello (inserisci ID)...', custom: true });

    // Se il modello salvato è nella lista (e non è rosso) lo seleziona, altrimenti sceglie il migliore in cima
    const known = ranked.some((m) => m.id === preferredId);
    let selected = modelDropdown.getValue();

    if (preferredId && known && evaluateModelForWeb(preferredId).tier !== 'red') {
      selected = preferredId;
    } else if (ranked.length > 0) {
      selected = ranked[0].id;
      storage.setModel(selected);
    }

    modelDropdown.setOptions(options, selected);
    customModelWrap.style.display = 'none';
    updateRatingUI();
  }

  // Scelta dell'utente nel dropdown
  function handleModelChange(value) {
    if (value === CUSTOM_MODEL_VALUE) {
      customModelWrap.style.display = 'flex';
      customModelInput.focus();
    } else {
      customModelWrap.style.display = 'none';
      storage.setModel(value);
    }
    updateRatingUI();
  }

  customModelInput.addEventListener('input', () => {
    storage.setModel(customModelInput.value.trim());
    updateRatingUI();
  });

  // ---------- Sincronizzazione modelli live ----------
  async function fetchLiveModels(key, silent = false) {
    if (!key || key.length < MIN_API_KEY_LENGTH) return;
    refreshModelsBtn.classList.add('spinning');
    modelHint.textContent = 'Sincronizzazione modelli da Groq...';

    try {
      const ids = (await client.listModelIds(key)).filter(isChatModel);
      if (ids.length === 0) throw new Error('Nessun modello chat trovato');

      populateModels(ids, storage.getRawModel());
      modelHint.textContent = `${ids.length} modelli live ordinati per idoneità`;
      if (!silent) logger.info(`Sincronizzati ${ids.length} modelli attivi e ordinati per qualità di traduzione.`);
    } catch (err) {
      modelHint.textContent = 'Lista locale (verifica la API Key)';
      if (!silent) logger.warn(`Impossibile aggiornare i modelli da Groq (${err.message}).`);
    } finally {
      refreshModelsBtn.classList.remove('spinning');
    }
  }

  refreshModelsBtn.addEventListener('click', () => fetchLiveModels(apiKey.value.trim(), false));

  // ---------- API key ----------
  function updateKeyStatus(triggerFetch = false) {
    const key = apiKey.value.trim();
    storage.setApiKey(key);

    if (key.length > MIN_API_KEY_LENGTH) {
      envDot.classList.add('ok');
      envText.textContent = 'API key salvata nel browser';
      toggleAdvBtn.classList.remove('needs-attention');
      engineHint.replaceChildren('Clicca su ', strongEl('Motore AI'), ' per cambiare chiave o modello.');
      if (triggerFetch) {
        clearTimeout(fetchTimer);
        fetchTimer = setTimeout(() => fetchLiveModels(key, true), FETCH_DEBOUNCE_MS);
      }
    } else {
      envDot.classList.remove('ok');
      envText.textContent = 'API key mancante';
      toggleAdvBtn.classList.add('needs-attention');
      engineHint.replaceChildren('Clicca su ', strongEl('Motore AI'), ' per inserire la tua API key e scegliere il modello.');
    }
  }

  apiKey.addEventListener('input', () => updateKeyStatus(true));

  // ---------- Avvio ----------
  const savedKey = storage.getApiKey();
  apiKey.value = savedKey;
  populateModels(FALLBACK_MODELS.map((m) => m.id), storage.getModel());
  updateKeyStatus(false);
  if (savedKey.length > MIN_API_KEY_LENGTH) fetchLiveModels(savedKey, true);

  return {
    getApiKey: () => apiKey.value.trim(),
    getModel: getSelectedModel,
    openAdvanced: openSettings,
  };
}
