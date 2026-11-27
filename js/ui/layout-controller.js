// Riassetto della schermata dopo il caricamento di un progetto:
//   1) la sidebar si chiude
//   2) riquadri di caricamento e avvio si spostano in colonna a sinistra (quadrati)
//   3) l'anteprima entra da destra
// Sotto i 860px di larghezza utile resta tutto in colonna.

const ENTER_SIDE_BY_SIDE_PX = 860;
const KEEP_SIDE_BY_SIDE_PX = 840; // isteresi: evita che il layout "sfarfalli" al limite

export function createLayoutController({ workScroll, workLayout, dropzone, controlCard, previewCard }, { drawer }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let inProject = false; // il riassetto è stato applicato
  let entering = false; // la sequenza è in corso

  function wantsSideBySide() {
    const width = workScroll.clientWidth;
    const limit = workLayout.classList.contains('side-by-side') ? KEEP_SIDE_BY_SIDE_PX : ENTER_SIDE_BY_SIDE_PX;
    return width >= limit;
  }

  function applyLayout() {
    workLayout.classList.toggle('side-by-side', inProject && wantsSideBySide());
  }

  // Se l'area di lavoro cambia larghezza (finestra, sidebar riaperta) il layout si adegua
  new ResizeObserver(() => {
    if (inProject) applyLayout();
  }).observe(workScroll);

  // I nomi di transizione valgono solo durante l'animazione: un view-transition-name permanente
  // creerebbe un containing block che romperebbe gli elementi position: fixed (anteprima a schermo intero).
  async function morph(update, { includePreview }) {
    if (!document.startViewTransition || reducedMotion.matches) {
      update();
      return;
    }

    const named = [[dropzone, 'st-drop'], [controlCard, 'st-control']];
    if (includePreview) named.push([previewCard, 'st-preview']);
    named.forEach(([el, name]) => el.style.setProperty('view-transition-name', name));

    try {
      const transition = document.startViewTransition(update);
      await transition.finished;
    } catch {
      // Transizione interrotta: lo stato finale è comunque applicato
    } finally {
      [dropzone, controlCard, previewCard].forEach((el) => el.style.removeProperty('view-transition-name'));
    }
  }

  return {
    /**
     * @param {() => void} reveal  mostra riepilogo e anteprima (chiamata nel momento del riassetto)
     */
    async enterProjectMode(reveal) {
      if (inProject || entering) {
        reveal();
        return;
      }
      entering = true;

      await drawer.collapse();

      const sideBySide = (() => {
        workLayout.classList.add('side-by-side');
        const ok = wantsSideBySide();
        workLayout.classList.remove('side-by-side');
        return ok;
      })();

      await morph(
        () => {
          workScroll.scrollTop = 0;
          inProject = true;
          workLayout.classList.add('layout-project');
          reveal();
          applyLayout();
        },
        { includePreview: sideBySide }
      );
      entering = false;
    },
  };
}
