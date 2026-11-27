/**
 * Controllo di un'esecuzione: pausa, ripresa e interruzione.
 * - pause(): l'operazione in corso (una chiamata API) finisce, poi la pipeline si ferma al checkpoint successivo.
 * - cancel(): annulla subito la richiesta di rete in corso e sblocca un'eventuale pausa.
 */
export function createRunControl({ onPauseChange } = {}) {
  const abort = new AbortController();
  let paused = false;
  let waiters = [];

  const releaseWaiters = () => {
    const pending = waiters;
    waiters = [];
    pending.forEach((resolve) => resolve());
  };

  return {
    signal: abort.signal,
    get isPaused() { return paused; },
    get isCancelled() { return abort.signal.aborted; },

    pause() {
      if (paused || abort.signal.aborted) return;
      paused = true;
      onPauseChange?.(true);
    },

    resume() {
      if (!paused) return;
      paused = false;
      onPauseChange?.(false);
      releaseWaiters();
    },

    cancel() {
      if (abort.signal.aborted) return;
      abort.abort();
      if (paused) {
        paused = false;
        onPauseChange?.(false);
      }
      releaseWaiters();
    },

    // Da chiamare tra un'operazione e l'altra: attende finché è in pausa, lancia se annullata
    async checkpoint() {
      while (paused && !abort.signal.aborted) {
        await new Promise((resolve) => waiters.push(resolve));
      }
      if (abort.signal.aborted) throw new DOMException('Traduzione terminata', 'AbortError');
    },
  };
}
