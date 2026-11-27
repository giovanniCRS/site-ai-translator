const pad = (n) => String(n).padStart(2, '0');

// 75 s -> "01:15"; 3725 s -> "1:02:05"
export function formatClock(ms) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// 72 s -> "1 min 12 s"; 45 s -> "45 s"
export function formatDuration(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} h ${m} min ${s} s`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

/**
 * Cronometro: mostra il tempo trascorso mentre gira e il tempo totale alla fine.
 * Il tempo è calcolato dall'orologio (non contando i tick), quindi resta corretto anche con la scheda in background.
 */
export function createTimer({ valueEl, labelEl }) {
  const row = valueEl.closest('.timer-row');
  let startedAt = 0;
  let accumulated = 0; // ms già trascorsi prima dell'ultima pausa
  let intervalId = null;

  const elapsed = () => accumulated + (intervalId ? performance.now() - startedAt : 0);

  const render = (ms) => { valueEl.textContent = formatClock(ms); };

  function setState(state, label) {
    labelEl.textContent = label;
    row?.classList.toggle('running', state === 'running');
    row?.classList.toggle('done', state === 'done');
    row?.classList.toggle('paused', state === 'paused');
  }

  function halt() {
    const total = elapsed();
    clearInterval(intervalId);
    intervalId = null;
    accumulated = total;
    return total;
  }

  const tick = () => {
    startedAt = performance.now();
    intervalId = setInterval(() => render(elapsed()), 250);
  };

  return {
    start() {
      halt();
      accumulated = 0;
      render(0);
      setState('running', 'Tempo trascorso');
      tick();
    },

    // In pausa il tempo non scorre
    pause() {
      if (!intervalId) return;
      render(halt());
      setState('paused', 'In pausa');
    },

    resume() {
      if (intervalId) return;
      setState('running', 'Tempo trascorso');
      tick();
    },

    // Ferma il conteggio e mostra il totale; restituisce la durata in ms
    stop(label = 'Tempo totale') {
      const elapsed = halt();
      render(elapsed);
      setState('done', label);
      return elapsed;
    },

    reset() {
      halt();
      accumulated = 0;
      render(0);
      setState('idle', 'Tempo trascorso');
    },
  };
}
