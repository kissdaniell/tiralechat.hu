import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
const ROOT = 'C:/Users/Kiss Dániel/Desktop/danielkiss.hu/!!!tiradevelope/public';
const inv = JSON.parse(readFileSync('inventory.json', 'utf8')).filter((o) => /^img\/tervezes\/[^/]+\.png$/.test(o.f));
const jobs = [];
for (const o of inv) { const base = o.f.replace(/\.png$/, '.webp'); jobs.push({ src: '/' + o.f, out: base, width: o.w }, { src: '/' + o.f, out: base.replace(/^img\//, 'img/r/640/'), width: 640 }); }
const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); p(m.result); } });
const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
await send('Page.navigate', { url: 'http://localhost:5173/img/arrow.webp' }); await new Promise((r) => setTimeout(r, 800));
for (const job of jobs) {
  const r = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async (job) => {
    const img = new Image(); img.src = job.src; await img.decode();
    const k = job.width / img.naturalWidth; const c = document.createElement('canvas'); c.width = job.width; c.height = Math.round(img.naturalHeight * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.86));
    return await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(blob); });
  })(${JSON.stringify(job)})` });
  const file = join(ROOT, job.out); mkdirSync(join(file, '..'), { recursive: true });
  const buf = Buffer.from(r.result.value, 'base64'); writeFileSync(file, buf);
  console.log(job.out, Math.round(buf.length / 1024) + 'KB');
}
ws.close();
