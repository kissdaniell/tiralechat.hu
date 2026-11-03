// Writes inventory.json: every picture under public/img (the originals — not
// the generated copies) with its pixel size, read from the file's header.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../public');
// Generated folders: the width variants, the paintings' half-size copies,
// and the news gallery's smaller sizes (its news/lg are its originals).
const GENERATED = /^img\/(r|festmenyek\/xs|news\/(md|th))\//;

const files = [];
const walk = (d) => {
  for (const f of readdirSync(join(ROOT, d))) {
    const p = `${d}/${f}`;
    if (statSync(join(ROOT, p)).isDirectory()) walk(p);
    else if (/\.(webp|png|jpe?g)$/.test(f) && !GENERATED.test(p)) files.push(p);
  }
};
walk('img');
files.push('og-image.jpg');

// Width and height from the header of a WebP, PNG or JPEG file.
export function sizeOf(buf) {
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') {
    const kind = buf.toString('latin1', 12, 16);
    if (kind === 'VP8 ') return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
    if (kind === 'VP8L') {
      const bits = buf.readUInt32LE(21);
      return [(bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1];
    }
    if (kind === 'VP8X') return [buf.readUIntLE(24, 3) + 1, buf.readUIntLE(27, 3) + 1];
  }
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf.readUInt16BE(0) === 0xffd8) {
    for (let at = 2; at < buf.length; ) {
      const marker = buf.readUInt16BE(at);
      // The frame headers (SOF0…SOF15, without the tables that share the range).
      if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
        return [buf.readUInt16BE(at + 7), buf.readUInt16BE(at + 5)];
      }
      at += 2 + buf.readUInt16BE(at + 2);
    }
  }
  return [0, 0];
}

const out = files.map((f) => {
  const buf = readFileSync(join(ROOT, f));
  const [w, h] = sizeOf(buf);
  return { f, w, h, kb: Math.round(buf.length / 1024) };
});
const unread = out.filter((o) => !o.w);
if (unread.length) console.warn('size not read:', unread.map((o) => o.f).join(', '));
writeFileSync(join(HERE, 'inventory.json'), JSON.stringify(out));

const by = {};
for (const o of out) (by[o.f.split('/').slice(0, -1).join('/')] ??= []).push(o);
for (const [d, a] of Object.entries(by)) {
  const kb = a.reduce((s, o) => s + o.kb, 0);
  console.log(d.padEnd(26), String(a.length).padStart(3), 'files', String(kb).padStart(6), 'KB  w:', `${Math.min(...a.map((o) => o.w))}–${Math.max(...a.map((o) => o.w))}`);
}
