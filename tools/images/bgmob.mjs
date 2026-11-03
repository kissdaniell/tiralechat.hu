import { writeFileSync, mkdirSync } from 'node:fs';
const ROOT = 'C:/Users/Kiss Dániel/Desktop/danielkiss.hu/!!!tiradevelope/public/';
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); p(m.result); } });
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Page.navigate', { url: 'http://localhost:5173/img/arrow.webp' }); await new Promise((r) => setTimeout(r, 800));
for (const w of [960, 1280]) {
  const r = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async (w) => { const img = new Image(); img.src = '/img/main-bg-mob.webp'; await img.decode(); const c = document.createElement('canvas'); c.width = w; c.height = Math.round(img.naturalHeight * w / img.naturalWidth); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height); const b = await new Promise((r) => c.toBlob(r, 'image/webp', 0.8)); return await new Promise((r) => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]); f.readAsDataURL(b); }); })(${w})` });
  mkdirSync(ROOT + `img/r/${w}`, { recursive: true });
  const buf = Buffer.from(r.result.value, 'base64'); writeFileSync(ROOT + `img/r/${w}/main-bg-mob.webp`, buf);
  console.log(w, Math.round(buf.length / 1024) + 'KB');
}
ws.close();
