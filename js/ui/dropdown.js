// Dropdown custom (pattern ARIA "listbox"): trigger + lista di opzioni con pallino colorato.
// Tastiera: frecce, Home/End, Invio/Spazio, Esc, Tab, ricerca per iniziale.
// La lista usa position: fixed, quindi non viene tagliata dagli overflow del dialog.

const MAX_LIST_HEIGHT = 288;
const EDGE_GAP = 6;
const VIEWPORT_PAD = 12;

/**
 * @param {object} p
 * @param {HTMLButtonElement} p.trigger
 * @param {HTMLElement} [p.triggerDot]   opzionale: pallino del trigger
 * @param {HTMLElement} p.triggerText
 * @param {HTMLUListElement} p.list
 * @param {(value: string) => void} p.onChange   chiamato solo per scelte dell'utente
 * @param {string} [p.placeholder]   testo del trigger quando non c'è selezione
 *
 * Opzione: { value, label, tier?: 'green'|'orange'|'red', dot?: false, tag?: string, custom?: boolean }
 */
export function createDropdown({ trigger, triggerDot, triggerText, list, onChange, placeholder = 'Seleziona' }) {
  let options = [];
  let value = null;
  let activeIndex = -1;
  let escapedAt = 0;

  const isOpen = () => !list.hidden;

  // ---------- Rendering ----------
  function buildOption(opt, index) {
    const li = document.createElement('li');
    li.id = `${list.id}-opt-${index}`;
    li.className = opt.custom ? 'dropdown-option is-custom' : 'dropdown-option';
    li.dataset.index = String(index);
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(opt.value === value));

    const name = document.createElement('span');
    name.className = 'opt-name';
    name.textContent = opt.label;

    if (opt.dot !== false) {
      const dot = document.createElement('span');
      dot.className = `tier-dot ${opt.tier || 'none'}`;
      li.append(dot);
    }
    li.append(name);

    if (opt.tag) {
      const tag = document.createElement('span');
      tag.className = 'opt-tag';
      tag.textContent = opt.tag;
      li.append(tag);
    }

    const check = document.createElement('span');
    check.className = 'opt-check';
    check.setAttribute('aria-hidden', 'true');
    check.textContent = '✓';
    li.append(check);

    return li;
  }

  function updateTrigger() {
    const selected = options.find((o) => o.value === value);
    triggerText.textContent = selected ? selected.label : placeholder;
    if (triggerDot) triggerDot.className = `tier-dot ${selected?.tier || 'none'}`;
  }

  function render() {
    list.replaceChildren(...options.map(buildOption));
    updateTrigger();
  }

  function setActive(index, { scroll = true } = {}) {
    activeIndex = index;
    [...list.children].forEach((li, i) => li.classList.toggle('active', i === index));
    const li = list.children[index];
    if (!li) return;
    list.setAttribute('aria-activedescendant', li.id);
    if (scroll) li.scrollIntoView({ block: 'nearest' });
  }

  // ---------- Posizionamento ----------
  function position() {
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - EDGE_GAP - VIEWPORT_PAD;
    const spaceAbove = rect.top - EDGE_GAP - VIEWPORT_PAD;

    list.style.maxHeight = '';
    const natural = Math.min(list.scrollHeight + 2, MAX_LIST_HEIGHT);
    const openUp = spaceBelow < natural && spaceAbove > spaceBelow;

    list.style.left = `${rect.left}px`;
    list.style.width = `${rect.width}px`;

    if (openUp) {
      list.style.top = 'auto';
      list.style.bottom = `${window.innerHeight - rect.top + EDGE_GAP}px`;
      list.style.maxHeight = `${Math.min(MAX_LIST_HEIGHT, spaceAbove)}px`;
    } else {
      list.style.bottom = 'auto';
      list.style.top = `${rect.bottom + EDGE_GAP}px`;
      list.style.maxHeight = `${Math.min(MAX_LIST_HEIGHT, spaceBelow)}px`;
    }
    list.dataset.placement = openUp ? 'top' : 'bottom';
  }

  // ---------- Apertura / chiusura ----------
  const onOutsidePointer = (e) => {
    if (!list.contains(e.target) && !trigger.contains(e.target)) close();
  };
  const onScrollOrResize = (e) => {
    if (e.target && e.target !== window && e.target !== document && list.contains(e.target)) return;
    close();
  };

  function open() {
    if (isOpen() || options.length === 0) return;
    list.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    position();
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    list.focus({ preventScroll: true });

    document.addEventListener('pointerdown', onOutsidePointer, true);
    document.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
  }

  function close({ focusTrigger = false } = {}) {
    if (!isOpen()) return;
    list.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');

    document.removeEventListener('pointerdown', onOutsidePointer, true);
    document.removeEventListener('scroll', onScrollOrResize, true);
    window.removeEventListener('resize', onScrollOrResize);

    if (focusTrigger) trigger.focus();
  }

  function choose(index) {
    const opt = options[index];
    if (!opt) return;
    value = opt.value;
    render();
    close({ focusTrigger: true });
    onChange(value);
  }

  // ---------- Eventi ----------
  trigger.addEventListener('click', () => (isOpen() ? close() : open()));

  trigger.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      open();
    }
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('.dropdown-option');
    if (li) choose(Number(li.dataset.index));
  });

  list.addEventListener('pointermove', (e) => {
    const li = e.target.closest('.dropdown-option');
    if (!li) return;
    const index = Number(li.dataset.index);
    if (index !== activeIndex) setActive(index, { scroll: false });
  });

  list.addEventListener('keydown', (e) => {
    const last = options.length - 1;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, last));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0) choose(activeIndex);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        escapedAt = performance.now();
        close({ focusTrigger: true });
        break;
      case 'Tab':
        close();
        break;
      default:
        // Ricerca per iniziale: salta alla prossima opzione che inizia con il carattere digitato
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const ch = e.key.toLowerCase();
          const ordered = [...options.keys()];
          const rotated = [...ordered.slice(activeIndex + 1), ...ordered.slice(0, activeIndex + 1)];
          const hit = rotated.find((i) => options[i].label.toLowerCase().startsWith(ch));
          if (hit !== undefined) setActive(hit);
        }
    }
  });

  // ---------- API pubblica ----------
  return {
    setOptions(newOptions, selectedValue) {
      options = newOptions;
      value = selectedValue;
      close();
      render();
    },
    getValue: () => value,
    isOpen,
    // Esc che chiude il dropdown non deve chiudere anche il <dialog> che lo contiene
    blocksDialogCancel: () => isOpen() || performance.now() - escapedAt < 100,
  };
}
