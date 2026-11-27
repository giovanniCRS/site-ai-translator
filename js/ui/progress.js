const STAGES = ['scanner', 'translator', 'saver'];

export function createProgress({ mainBar, mainLabel, mainPercent, subBar, subLabel, subPercent }) {
  function setStage(stage) {
    const idx = STAGES.indexOf(stage);
    STAGES.forEach((name, i) => {
      const el = document.getElementById(`step-${name}`);
      el.classList.remove('active', 'done');
      if (stage === 'done' || i < idx) el.classList.add('done');
      else if (i === idx) el.classList.add('active');
    });
  }

  function update({ percent, stage, label, subPercent: sp, subLabel: sl }) {
    mainBar.style.width = `${percent}%`;
    mainPercent.textContent = `${percent}%`;
    mainLabel.textContent = label;
    subBar.style.width = `${sp}%`;
    subPercent.textContent = `${sp}%`;
    subLabel.textContent = sl || '';
    setStage(stage);
  }

  return {
    update,
    start: () => mainBar.classList.remove('complete', 'paused', 'stopped'),
    // Barra in pausa (striscia attenuata)
    setPaused: (on) => mainBar.classList.toggle('paused', on),
    // Esecuzione terminata dall'utente: niente verde "completato"
    halt: (label, sublabel) => {
      mainBar.classList.remove('paused');
      mainBar.classList.add('stopped');
      mainLabel.textContent = label;
      subLabel.textContent = sublabel || '';
    },
    complete: (label, sublabel) => {
      mainBar.classList.add('complete');
      update({ percent: 100, stage: 'done', label, subPercent: 100, subLabel: sublabel });
    },
  };
}
