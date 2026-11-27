// Memoria condivisa dell'anteprima: localStorage, sessionStorage e cookie dei siti mostrati.
//
// Le pagine girano in un iframe in sandbox con origine opaca, dove il browser non permette né
// localStorage né cookie (lanciano un errore). Qui li sostituiamo con una copia in memoria che
// vive nella finestra principale: così "Accetta i cookie" o "Ho 18 anni" restano validi
// passando da Originale a Tradotto (e viceversa) e tra una pagina e l'altra.
// Dura finché non si carica un altro progetto o si preme "Azzera dati del sito".

import { PREVIEW_MESSAGE_SOURCE } from './preview-bridge.js';

const emptyData = () => ({ local: {}, session: {}, cookies: {} });
const isRecord = (v) => v && typeof v === 'object' && !Array.isArray(v);

export function createPreviewStorage() {
  let data = emptyData();

  return {
    // Copia dei dati da incorporare nella pagina che sta per essere mostrata
    snapshot: () => JSON.parse(JSON.stringify(data)),

    reset() {
      data = emptyData();
    },

    isEmpty() {
      return Object.values(data).every((bucket) => Object.keys(bucket).length === 0);
    },

    // Applica una scrittura arrivata dallo shim (messaggio postMessage)
    apply(msg) {
      if (!isRecord(msg)) return;
      const bucket = data[msg.kind];
      if (!bucket) return;

      const key = typeof msg.key === 'string' ? msg.key : null;
      if (msg.op === 'set' && key !== null) bucket[key] = String(msg.value);
      else if (msg.op === 'remove' && key !== null) delete bucket[key];
      else if (msg.op === 'clear') data[msg.kind] = {};
    },
  };
}

// Serializza un valore per inserirlo in uno <script> senza poter chiudere il tag.
const toScriptLiteral = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

/**
 * Script da inserire in cima a <head>, prima di qualsiasi script del sito.
 * @param {{ local: object, session: object, cookies: object }} snapshot
 */
export function buildStorageShim(snapshot) {
  return `(function () {
  var data = ${toScriptLiteral(snapshot)};
  var has = Object.prototype.hasOwnProperty;

  function post(msg) {
    msg.source = '${PREVIEW_MESSAGE_SOURCE}';
    msg.type = 'storage';
    try { parent.postMessage(msg, '*'); } catch (e) {}
  }

  function makeStorage(kind) {
    var store = data[kind];
    var api = {
      getItem: function (k) { k = String(k); return has.call(store, k) ? store[k] : null; },
      setItem: function (k, v) { k = String(k); v = String(v); store[k] = v; post({ op: 'set', kind: kind, key: k, value: v }); },
      removeItem: function (k) { k = String(k); delete store[k]; post({ op: 'remove', kind: kind, key: k }); },
      clear: function () { for (var k in store) delete store[k]; post({ op: 'clear', kind: kind }); },
      key: function (i) { var keys = Object.keys(store); return i >= 0 && i < keys.length ? keys[i] : null; }
    };
    return new Proxy(api, {
      get: function (t, p) {
        if (p === 'length') return Object.keys(store).length;
        if (typeof p === 'string' && has.call(t, p)) return t[p];
        if (typeof p === 'string' && has.call(store, p)) return store[p];
        return undefined;
      },
      set: function (t, p, v) { if (typeof p === 'string') t.setItem(p, v); return true; },
      deleteProperty: function (t, p) { if (typeof p === 'string') t.removeItem(p); return true; },
      has: function (t, p) { return has.call(t, p) || has.call(store, p); },
      ownKeys: function () { return Object.keys(store); },
      getOwnPropertyDescriptor: function (t, p) {
        return has.call(store, p) ? { value: store[p], writable: true, enumerable: true, configurable: true } : undefined;
      }
    });
  }

  function define(target, name, getter) {
    try { Object.defineProperty(target, name, { configurable: true, get: getter }); } catch (e) {}
  }

  var local = makeStorage('local');
  var session = makeStorage('session');
  define(window, 'localStorage', function () { return local; });
  define(window, 'sessionStorage', function () { return session; });

  // document.cookie: legge e scrive "nome=valore"; expires/max-age nel passato cancellano il cookie
  var cookies = data.cookies;
  try {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get: function () {
        return Object.keys(cookies).map(function (k) { return k + '=' + cookies[k]; }).join('; ');
      },
      set: function (str) {
        var parts = String(str).split(';');
        var pair = parts.shift();
        var eq = pair.indexOf('=');
        if (eq < 0) return;
        var name = pair.slice(0, eq).trim();
        var value = pair.slice(eq + 1).trim();
        if (!name) return;

        var expired = false;
        parts.forEach(function (attr) {
          var i = attr.indexOf('=');
          var key = (i < 0 ? attr : attr.slice(0, i)).trim().toLowerCase();
          var val = i < 0 ? '' : attr.slice(i + 1).trim();
          if (key === 'max-age' && Number(val) <= 0) expired = true;
          if (key === 'expires') {
            var t = Date.parse(val);
            if (!isNaN(t) && t <= Date.now()) expired = true;
          }
        });

        if (expired) { delete cookies[name]; post({ op: 'remove', kind: 'cookies', key: name }); }
        else { cookies[name] = value; post({ op: 'set', kind: 'cookies', key: name, value: value }); }
      }
    });
  } catch (e) {}
})();`;
}
