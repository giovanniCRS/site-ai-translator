const CHIP_LABELS = [
  ['html', 'HTML'],
  ['js', 'JS'],
  ['php', 'PHP'],
  ['assets', 'asset'],
];

// Trasforma la dropzone in una card riepilogo compatta dopo il caricamento.
export function createProjectSummary({ dropzone, projectSummary, projectName, projectChips }) {
  function buildChip(count, label) {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const strong = document.createElement('strong');
    strong.textContent = String(count);
    chip.append(strong, ` ${label}`);
    return chip;
  }

  return {
    show(name, summary) {
      projectName.textContent = name;
      projectChips.replaceChildren(
        ...CHIP_LABELS.filter(([key]) => summary[key] > 0).map(([key, label]) => buildChip(summary[key], label))
      );
      projectSummary.hidden = false;
      dropzone.classList.add('has-project');
    },
  };
}
