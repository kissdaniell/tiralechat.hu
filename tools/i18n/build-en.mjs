// Makes the English version of the page: en/index.html from index.html, and
// src/i18n-en.js (the texts that live in the scripts), using the translations
// in tools/i18n/en.json (made from the translators' workbook — see README).
// Runs before every `npm run dev` / `npm run build`; never edit en/index.html
// by hand.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const rows = JSON.parse(readFileSync(join(ROOT, 'tools/i18n/en.json'), 'utf8'));
let html = readFileSync(join(ROOT, 'index.html'), 'utf8');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/\n/g, ' ');
const text = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br />');
const put = (open, en) => (open.endsWith('"') ? attr(en) : text(en));
// The Hungarian text as it may stand in the markup: any white space, and a
// line break written as <br>.
const loose = (hu) => hu.split('\n').map((line) => line.trim().split(/\s+/).map(esc).join('\\s+')).join('\\s*<br\\s*/?>\\s*');

const page = rows.filter((r) => !/\.js\b/.test(r.source) && r.en);
const missing = [];
const byHu = new Map();
for (const r of page) byHu.set(r.hu, [...(byHu.get(r.hu) ?? []), r]);

// A text translated differently in different places: those places first,
// each inside its own element (the workbook's "source": tag.class…), then
// whatever is left takes the translation of the row without a class.
const general = [];
for (const [hu, group] of byHu) {
  if (group.every((r) => r.en === group[0].en)) {
    general.push(group[0]);
    continue;
  }
  for (const r of group.filter((x) => x.source.includes('.'))) {
    const [tag, ...classes] = r.source.split('.');
    const el = '<' + tag + '\\b[^>]*\\b' + esc(classes[classes.length - 1]) + '\\b[^>]*';
    // …as the element's text (behind any tags it opens with), or as one of its attributes.
    const re = new RegExp('(' + el + '>(?:\\s*<[^>]+>)*\\s*|' + el + '?")' + loose(hu) + '(?=\\s*<|")', 'g');
    let hit = false;
    html = html.replace(re, (m, open) => ((hit = true), open + put(open, r.en)));
    if (!hit) missing.push(r);
  }
  const rest = group.find((x) => !x.source.includes('.'));
  if (rest) general.push(rest);
}

// Longest first, so a short text never bites into a longer one.
for (const r of general.filter((x) => x.en !== x.hu).sort((x, y) => y.hu.length - x.hu.length)) {
  const re = new RegExp('(>|")(\\s*)' + loose(r.hu) + '(\\s*)(?=<|")', 'g');
  let hit = false;
  html = html.replace(re, (m, open, before, after) => ((hit = true), open + before + put(open, r.en) + after));
  if (!hit) missing.push(r);
}

// Texts whose lines are split between elements: translated line by line.
const lines = (hu) => rows.find((r) => r.hu === hu)?.en.split('\n');
const swap = (from, to) => {
  if (!html.includes(from)) return false;
  html = html.split(from).join(to);
  return true;
};
const done = new Set();
const special = (hu, pairs) => {
  const en = lines(hu);
  if (!en) return;
  if (pairs(en).every(([from, to]) => swap(from, to))) done.add(hu);
};
special('Ő itt\nTira.', (en) => [['>Ő itt<br />', `>${text(en[0])}<br />`], ['<span class="tag-caps">Tira.</span>', `<span class="tag-caps">${text(en[1] ?? '')}</span>`]]);
special('Ez már\nnem jön le.', (en) => [['Ez már<br />', `${text(en[0])}<br />`], ['<span class="works-note-line">nem jön le.', `<span class="works-note-line">${text(en[1] ?? '')}`]]);
{
  const row = rows.find((r) => /copyright/.test(r.source));
  if (row) {
    const hu = row.hu.split('\n'), en = row.en.split('\n');
    if (hu.slice(1).every((line, i) => swap(line, text(en[i + 1] ?? line)))) done.add(row.hu);
  }
}
const unmatched = missing.filter((r) => !done.has(r.hu));

// ---- The document itself.
const must = (from, to) => { if (!swap(from, to)) throw new Error('build-en: not found in index.html: ' + from); };
must('<html lang="hu">', '<html lang="en">');
must('<link rel="canonical" href="https://tiralechat.hu/" />', '<link rel="canonical" href="https://tiralechat.hu/en/" />');
must('<meta property="og:url" content="https://tiralechat.hu/" />', '<meta property="og:url" content="https://tiralechat.hu/en/" />');
must('<meta property="og:locale" content="hu_HU" />', '<meta property="og:locale" content="en_US" />');
must('"url": "https://tiralechat.hu/",', '"url": "https://tiralechat.hu/en/",');
// The language switches point back.
html = html.replace(/<a href="\/en\/" class="nav-lang" hreflang="en" lang="en">(\s*<span class="nav-item">)EN/, '<a href="/" class="nav-lang" hreflang="hu" lang="hu">$1HU');
html = html.replace('<a class="mm-lang" href="/en/" hreflang="en" lang="en">English Version</a>', '<a class="mm-lang" href="/" hreflang="hu" lang="hu">Hungarian Version</a>');
if (!html.includes('class="nav-lang" hreflang="hu"') || !html.includes('class="mm-lang" href="/"')) throw new Error('build-en: language switch not found');
html = html.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- GENERATED from /index.html by tools/i18n/build-en.mjs — do not edit. -->');

mkdirSync(join(ROOT, 'en'), { recursive: true });
writeFileSync(join(ROOT, 'en/index.html'), html);

// ---- The scripts' texts: short ones by their Hungarian text, the news
// galleries by their place.
const dict = {};
const galleries = {};
for (const r of rows.filter((x) => /\.js\b/.test(x.source))) {
  const g = r.source.match(/GALLERIES\[(\d+)\]\.(title|texts|text)(?:\.(\w+))?/);
  if (!g) dict[r.hu] = r.en;
  else if (g[2] === 'texts') ((galleries[g[1]] ??= {}).texts ??= {})[g[3]] = r.en;
  else (galleries[g[1]] ??= {})[g[2]] = r.en;
}
writeFileSync(
  join(ROOT, 'src/i18n-en.js'),
  `// GENERATED by tools/i18n/build-en.mjs from tools/i18n/en.json — do not edit.\nexport const DICT = ${JSON.stringify(dict, null, 2)};\n\nexport const GALLERIES_EN = ${JSON.stringify(galleries, null, 2)};\n`,
);

console.log(`build-en: en/index.html written (${byHu.size - unmatched.length}/${byHu.size} different texts placed), ${Object.keys(dict).length} script texts, ${Object.keys(galleries).length} galleries`);
for (const r of unmatched) console.warn('  not found in index.html (text changed since the workbook?):', JSON.stringify(r.hu.slice(0, 70)), '—', r.source);
