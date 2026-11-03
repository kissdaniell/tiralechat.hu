// Makes the smaller copies: public/img/r/<width>/… for the widths in
// rules.mjs, the half-size festmenyek/xs, and the news gallery's news/md
// (from its news/lg). Only the ones that are missing or older than their
// original (FORCE=1 makes them all again). The resizing is done by a
// headless Chrome's canvas (no image library is installed):
//   chrome --headless=new --remote-debugging-port=9333 about:blank
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ruleFor, widthsFor } from './rules.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../public');
const QUALITY = 0.8;
const GALLERY_MD = 600;
const inv = JSON.parse(readFileSync(join(HERE, 'inventory.json'), 'utf8'));

const jobs = [];
for (const o of inv) {
  const q = ruleFor(o.f)?.[3]?.q;
  for (const w of widthsFor(o.f, o.w)) jobs.push({ src: o.f, out: o.f.replace(/^img\//, `img/r/${w}/`), width: w, q });
  if (o.f.startsWith('img/festmenyek/sm/')) jobs.push({ src: o.f, out: o.f.replace('/sm/', '/xs/'), width: Math.round(o.w / 2) });
  // The news gallery's big pictures, GALLERY_MD px on their shorter side:
  // what its square box needs on a phone (src/news-gallery.js).
  if (o.f.startsWith('img/news/lg/')) jobs.push({ src: o.f, out: o.f.replace('/lg/', '/md/'), width: Math.round(o.w * Math.min(1, GALLERY_MD / Math.min(o.w, o.h))) });
}
const stale = ({ src, out }) =>
  process.env.FORCE || !existsSync(join(ROOT, out)) || statSync(join(ROOT, out)).mtimeMs < statSync(join(ROOT, src)).mtimeMs;
const todo = jobs.filter(stale);
console.log(`${todo.length} to make (of ${jobs.length})`);
if (!todo.length) process.exit(0);

const list = await (await fetch('http://127.0.0.1:9333/json/list')).json();
const ws = new WebSocket(list.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m.result);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((r) => {
    const id = ++seq;
    pending.set(id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
await send('Page.navigate', { url: 'about:blank' });
await new Promise((r) => setTimeout(r, 500));

// Runs in the page: halves the picture while it is more than twice the
// target (sharper than one big step), then draws it at the target width.
const resize = async (data, type, width, quality) => {
  const img = new Image();
  img.src = `data:${type};base64,${data}`;
  await img.decode();
  let from = img;
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  const height = Math.round((h * width) / w);
  const draw = (tw, th) => {
    const c = document.createElement('canvas');
    c.width = tw;
    c.height = th;
    const x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(from, 0, 0, tw, th);
    return c;
  };
  while (w / 2 > width) {
    w = Math.round(w / 2);
    h = Math.round(h / 2);
    from = draw(w, h);
  }
  const blob = await new Promise((r) => draw(width, height).toBlob(r, 'image/webp', quality));
  return new Promise((r) => {
    const reader = new FileReader();
    reader.onload = () => r(reader.result.split(',')[1]);
    reader.readAsDataURL(blob);
  });
};

let total = 0;
for (const job of todo) {
  const data = readFileSync(join(ROOT, job.src)).toString('base64');
  const type = job.src.endsWith('.png') ? 'image/png' : job.src.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  const r = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(${resize})(${JSON.stringify(data)}, ${JSON.stringify(type)}, ${job.width}, ${job.q ?? QUALITY})`,
  });
  if (!r?.result?.value) {
    console.warn('failed:', job.out, r?.exceptionDetails?.exception?.description ?? '');
    continue;
  }
  const buf = Buffer.from(r.result.value, 'base64');
  mkdirSync(dirname(join(ROOT, job.out)), { recursive: true });
  writeFileSync(join(ROOT, job.out), buf);
  total += buf.length;
  console.log(String(Math.round(buf.length / 1024)).padStart(5), 'KB', job.out);
}
console.log('written', Math.round(total / 1024), 'KB');
ws.close();
