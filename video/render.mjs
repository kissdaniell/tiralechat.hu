// node render.mjs [--sheet] — renders reel.html to out/tiralechat-reel-4x5.mp4.
//
// Serves the page itself (the site's public/ and node_modules/, and this
// folder), opens it in a headless Chrome, and has the page draw each
// drawing of the stop motion (reel.frame(k)); every drawing is a screenshot,
// piped into ffmpeg (the ffmpeg-static package of this folder), held for
// two frames of a 24 fps H.264 video. --sheet also writes out/sheet.png, a
// contact sheet of every sixth drawing.
// Chrome: the usual install places, or the CHROME environment variable.
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';

const HERE = dirname(fileURLToPath(import.meta.url));
const SITE = join(HERE, '..');
const OUT = join(HERE, 'out');
const NAME = 'tiralechat-reel-4x5';
const [WIDTH, HEIGHT] = [1080, 1350];
const SHEET = process.argv.includes('--sheet');

// ---- The page and everything it loads.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = createServer((req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '');
  const file = /^(video|node_modules)[\\/]/.test(path) ? join(SITE, path) : join(SITE, 'public', path);
  if (!file.startsWith(SITE) || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;

// ---- A headless Chrome, talked to over the DevTools protocol.
const CHROMES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
].filter(Boolean);
const chromePath = CHROMES.find((p) => existsSync(p));
if (!chromePath) throw new Error('Chrome not found: set the CHROME environment variable to its path.');
const profile = mkdtempSync(join(tmpdir(), 'reel-chrome-'));
const chrome = spawn(chromePath, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const port = await new Promise((resolve, reject) => {
  let text = '';
  chrome.stderr.on('data', (d) => {
    text += d;
    const m = text.match(/DevTools listening on ws:\/\/[^:]+:(\d+)\//);
    if (m) resolve(m[1]);
  });
  chrome.on('exit', () => reject(new Error('Chrome quit: ' + text)));
});
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => ws.addEventListener('open', resolve, { once: true }));
let seq = 0;
const pending = new Map();
const problems = [];
ws.addEventListener('message', (event) => {
  const m = JSON.parse(event.data);
  if (m.method === 'Runtime.exceptionThrown') problems.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) problems.push(`${m.params.response.status} ${m.params.response.url}`);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

await send('Runtime.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false });
await send('Page.enable');
await send('Page.navigate', { url: `${base}/video/reel.html?render` });
for (let tries = 0; !(await evaluate('!!window.reel?.ready').catch(() => false)); tries++) {
  if (tries > 100) throw new Error('The page did not load.');
  await new Promise((r) => setTimeout(r, 100));
}
await evaluate('window.reel.ready');
const drawings = await evaluate('window.reel.drawings');
const fps = await evaluate('window.reel.fps');

// ---- Drawing by drawing into ffmpeg: each one held for 24 / fps frames.
mkdirSync(OUT, { recursive: true });
const file = join(OUT, `${NAME}.mp4`);
const encoder = spawn(
  ffmpeg,
  ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-', '-r', '24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-movflags', '+faststart', file],
  { stdio: ['pipe', 'inherit', 'inherit'] },
);
const encoded = new Promise((resolve, reject) => encoder.on('exit', (code) => (code ? reject(new Error(`ffmpeg exited with ${code}`)) : resolve())));
const sheet = [];
const started = Date.now();
for (let k = 0; k < drawings; k++) {
  await evaluate(`(window.reel.frame(${k}), new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))`);
  const png = Buffer.from((await send('Page.captureScreenshot', { format: 'png' })).data, 'base64');
  if (!encoder.stdin.write(png)) await new Promise((r) => encoder.stdin.once('drain', r));
  if (SHEET && k % 6 === 0) sheet.push(png);
  if (k % 24 === 0) process.stdout.write(`\r${k + 1}/${drawings} drawings`);
}
encoder.stdin.end();
await encoded;
console.log(`\r${drawings} drawings (${(drawings / fps).toFixed(1)} s) in ${((Date.now() - started) / 1000).toFixed(0)} s → ${file}`);

if (SHEET) {
  const dir = join(OUT, 'sheet');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  sheet.forEach((png, i) => writeFileSync(join(dir, `${String(i).padStart(3, '0')}.png`), png));
  const cols = 6;
  await new Promise((resolve, reject) =>
    spawn(ffmpeg, ['-y', '-loglevel', 'error', '-i', join(dir, '%03d.png'), '-vf', `scale=270:-1,tile=${cols}x${Math.ceil(sheet.length / cols)}:padding=6:color=0x222222`, '-frames:v', '1', join(OUT, 'sheet.png')], { stdio: 'inherit' }).on('exit', (code) =>
      code ? reject(new Error('sheet failed')) : resolve(),
    ),
  );
  rmSync(dir, { recursive: true, force: true });
  console.log(`contact sheet (every 6th drawing = every ${(6 / fps).toFixed(2)} s) → ${join(OUT, 'sheet.png')}`);
}
if (problems.length) console.warn('page problems:', problems);

await send('Browser.close').catch(() => {});
ws.close();
server.close();
setTimeout(() => rmSync(profile, { recursive: true, force: true }), 500);
