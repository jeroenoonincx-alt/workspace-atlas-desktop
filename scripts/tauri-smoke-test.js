const http = require('http');

const PORT = 9222;
const delay = ms => new Promise(r => setTimeout(r, ms));

function getJson(path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port: PORT, path, timeout: 1500 }, res => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function waitForTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const targets = await getJson('/json');
      const page = targets.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch (_) {}
    await delay(500);
  }
  throw new Error('Geen WebView2 DevTools-target gevonden.');
}

async function main() {
  const target = await waitForTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('WebSocket timeout')), 8000);
    ws.addEventListener('open', () => { clearTimeout(timer); resolve(); }, { once: true });
    ws.addEventListener('error', e => { clearTimeout(timer); reject(e.error || new Error('WebSocket error')); }, { once: true });
  });

  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', ev => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
      setTimeout(() => {
        if (pending.has(msgId)) {
          pending.delete(msgId);
          reject(new Error(`DevTools timeout: ${method}`));
        }
      }, 8000);
    });
  }

  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error('JavaScript-fout: ' + JSON.stringify(result.exceptionDetails));
    return result.result?.value;
  }

  await send('Runtime.enable');
  await delay(1200);

  const state = await evaluate(`(() => {
    const modal = document.getElementById('modal') || document.getElementById('modal-back');
    const navCount = document.querySelectorAll('.navbtn').length || document.querySelectorAll('#nav button').length;
    return {
      ready: document.readyState,
      title: document.title,
      time: document.getElementById('time')?.textContent || '',
      date: document.getElementById('date')?.textContent || '',
      context: document.getElementById('context-space')?.textContent || document.getElementById('ctx')?.textContent || '',
      navCount,
      apps: document.getElementById('apps')?.children.length || 0,
      modalHidden: modal ? modal.hidden : null,
      bodyText: document.body?.innerText?.slice(0, 300) || ''
    };
  })()`);

  console.log('TAURI_SMOKE_STATE=' + JSON.stringify(state));

  const failures = [];
  if (state.ready !== 'complete') failures.push('document niet complete');
  if (!/^\d{2}:\d{2}$/.test(state.time)) failures.push(`klok ongeldig: ${state.time}`);
  if (!state.date || /laden/i.test(state.date)) failures.push(`datum ongeldig: ${state.date}`);
  if (state.navCount < 5) failures.push(`navigatie ontbreekt: ${state.navCount}`);
  if (state.apps < 1) failures.push(`tegels ontbreken: ${state.apps}`);
  if (state.modalHidden !== true) failures.push(`modal staat open: ${state.modalHidden}`);

  const navWorked = await evaluate(`(() => {
    const old = document.getElementById('view-tasks');
    const modern = document.querySelector('.view[data-view="tasks"]');
    const btn = document.querySelector('.navbtn[data-view="tasks"]') || document.querySelector('#nav [data-v="tasks"]');
    if (!btn) return false;
    btn.click();
    return old ? old.hidden === false : modern ? modern.hidden === false : false;
  })()`);
  if (!navWorked) failures.push('Taken-navigatie werkt niet');

  const modalWorked = await evaluate(`(() => {
    const btn = document.getElementById('add-app') || document.getElementById('addTile');
    const modal = document.getElementById('modal') || document.getElementById('modal-back');
    if (!btn || !modal) return false;
    btn.click();
    const fields = document.querySelectorAll('#modal-fields input,#modal-fields textarea,#fields input,#fields textarea').length;
    return modal.hidden === false && fields >= 2;
  })()`);
  if (!modalWorked) failures.push('Tegelvenster werkt niet');

  ws.close();
  if (failures.length) throw new Error('Tauri rooktest mislukt: ' + failures.join('; '));
  console.log('TAURI_SMOKE_OK');
}

main().catch(err => {
  console.error(err && err.stack || err);
  process.exit(1);
});
