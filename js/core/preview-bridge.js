// Script iniettato nelle pagine dell'anteprima (iframe in sandbox, origine opaca).
// Intercetta i click sui link interni e li comunica alla finestra principale con postMessage,
// e blocca l'invio dei form (l'anteprima è statica).

export const PREVIEW_MESSAGE_SOURCE = 'st-preview';

export const BRIDGE_SCRIPT = `(function () {
  var selector = 'a[data-st-path],a[data-st-miss],a[data-st-skip]';
  document.addEventListener('click', function (e) {
    var el = e.target;
    var a = el && el.closest ? el.closest(selector) : null;
    if (!a) return;
    e.preventDefault();
    var msg = { source: '${PREVIEW_MESSAGE_SOURCE}' };
    if (a.hasAttribute('data-st-path')) {
      msg.type = 'navigate';
      msg.path = a.getAttribute('data-st-path');
      msg.hash = a.getAttribute('data-st-hash') || '';
    } else if (a.hasAttribute('data-st-miss')) {
      msg.type = 'missing';
      msg.ref = a.getAttribute('data-st-miss');
    } else {
      return;
    }
    parent.postMessage(msg, '*');
  }, true);
  document.addEventListener('submit', function (e) { e.preventDefault(); }, true);
})();`;

// Serializza un valore per inserirlo in uno <script> senza poter chiudere il tag.
const toScriptLiteral = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

// Dopo il caricamento porta in vista l'ancora (#sezione) di un link ad un'altra pagina.
export function buildScrollToHashScript(hash) {
  if (!hash || hash.length < 2) return null;

  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    /* lascia l'ancora com'è */
  }

  return `window.addEventListener('load', function () {
  var h = ${toScriptLiteral(id)};
  var el = document.getElementById(h) || document.getElementsByName(h)[0];
  if (el) el.scrollIntoView();
});`;
}
