// Pannello "Configurazione": preset lingua, lingua personalizzata, prefisso URL, opzione ZIP.

export function initLanguagePanel({ langPreset, customLangWrap, targetLang, langPrefix, wrapInPrefix }) {
  langPreset.addEventListener('change', () => {
    if (langPreset.value === 'custom') {
      customLangWrap.style.display = 'flex';
      targetLang.focus();
    } else {
      customLangWrap.style.display = 'none';
      const [lang, prefix] = langPreset.value.split('|');
      targetLang.value = lang;
      langPrefix.value = prefix;
    }
  });

  return {
    getConfig: () => ({
      targetLang: targetLang.value.trim() || 'English',
      langPrefix: langPrefix.value.trim() || '/en/',
      wrapInPrefix: wrapInPrefix.checked,
    }),
  };
}
