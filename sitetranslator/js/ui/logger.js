// Logger che scrive nel terminale della UI. Il core dipende solo dall'interfaccia
// { info, dim, warn, error, success, node }, non dal DOM.

export function createLogger({ terminalBody, errBadge }) {
  let errorCount = 0;

  function write(level, message) {
    const line = document.createElement('div');
    line.className = `log-line log-${level}`;

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = new Date().toLocaleTimeString('it-IT');

    line.append(time, document.createTextNode(message));
    terminalBody.appendChild(line);
    terminalBody.scrollTop = terminalBody.scrollHeight;

    if (level === 'error') {
      errorCount++;
      errBadge.textContent = `${errorCount} ${errorCount === 1 ? 'errore' : 'errori'}`;
      errBadge.style.display = 'inline-block';
    }
  }

  function clear() {
    terminalBody.innerHTML = '';
    errorCount = 0;
    errBadge.style.display = 'none';
  }

  return {
    info: (msg) => write('info', msg),
    dim: (msg) => write('dim', msg),
    warn: (msg) => write('warn', msg),
    error: (msg) => write('error', msg),
    success: (msg) => write('success', msg),
    node: (msg) => write('node', msg),
    clear,
  };
}
