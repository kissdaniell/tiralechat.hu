// Writes the generated attributes of every <img> in index.html (again, over
// the ones already there): width / height (the picture's shape, so the layout
// is final before it loads), srcset / sizes from rules.mjs, data-full for the
// lightbox, and how eagerly it loads. The preload links in the head get the
// same srcset / sizes as the picture they preload.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { paintingSizes, ruleFor, sizesFor, widthsFor } from './rules.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = process.env.HTML ?? join(HERE, '../../index.html');
const inv = Object.fromEntries(JSON.parse(readFileSync(join(HERE, 'inventory.json'), 'utf8')).map((o) => [o.f, o]));

// Pictures of the first screen that one of the views doesn't show (the
// stylesheet hides them there): lazy, so that view doesn't download them.
// By a class of the <img> or of an element around it.
const LAZY_ON_FIRST_SCREEN = ['decor-strawberry', 'hero-tape', 'socials', 'menu-toggle'];
// The first screen's stacks whose pictures take turns.
const STACKS = ['portrait-stack', 'decor-smiley'];

const VOID = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'source', 'wbr', 'area', 'base', 'col', 'embed', 'track']);
const GENERATED = /\s(srcset|sizes|width|height|fetchpriority)="[^"]*"/g;
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const classesOf = (tag) => (attr(tag, 'class') ?? '').split(/\s+/).filter(Boolean);

let html = readFileSync(FILE, 'utf8');
// The open elements above the tag being read, innermost last.
const open = [];
const firstOf = {};
let written = 0;

html = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1>|<\/?[a-zA-Z][^>]*>/g, (tag) => {
  if (tag.startsWith('<!--') || /^<(script|style)\b/i.test(tag)) return tag;
  const name = tag.match(/^<\/?([a-zA-Z][\w-]*)/)[1].toLowerCase();
  if (tag.startsWith('</')) {
    const at = open.findLastIndex((el) => el.name === name);
    if (at >= 0) open.length = at;
    return tag;
  }
  if (name !== 'img') {
    if (!VOID.has(name) && !tag.endsWith('/>')) open.push({ name, classes: classesOf(tag), id: attr(tag, 'id'), imgs: 0 });
    return tag;
  }

  const parent = open[open.length - 1];
  const nth = parent ? parent.imgs++ : 0;
  const clean = tag.replace(GENERATED, '');
  const src = attr(clean, 'src')?.replace(/^\//, '');
  const o = src && inv[src];
  if (!o) return tag;

  // The classes around it, nearest first.
  const around = [classesOf(clean), ...open.toReversed().map((el) => el.classes)];
  const classes = around.flat();
  const add = [`width="${o.w}"`, `height="${o.h}"`];

  // In a stack whose pictures take turns, the first one is on show at the
  // start. The rest only come once the hero stands: lazy, and not laid out
  // before that (src/style.css), so they don't load with the first screen —
  // src/late-images.js asks for them then.
  const stacked = parent && STACKS.some((c) => parent.classes.includes(c));
  if (!clean.includes(' loading=')) {
    const act = open.find((el) => el.name === 'section');
    const later = (act && !act.classes.includes('hero')) || classes.includes('folder-hand');
    if (later) add.push('loading="lazy"', 'decoding="async"');
    else if ((stacked && nth) || LAZY_ON_FIRST_SCREEN.some((c) => classes.includes(c))) add.push('loading="lazy"');
  }
  // (The first pose is the page's biggest picture.)
  if (stacked && nth) add.push('fetchpriority="low"');
  else if (stacked && parent.classes.includes('portrait-stack')) add.push('fetchpriority="high"');

  const painting = src.match(/^img\/festmenyek\/sm\/(.+)$/);
  if (painting) {
    add.push(`srcset="/img/festmenyek/xs/${painting[1]} ${Math.round(o.w / 2)}w, /${src} ${o.w}w"`, `sizes="${paintingSizes(o.w, o.h)}"`);
  } else {
    const widths = widthsFor(src, o.w);
    if (widths.length) {
      add.push(`srcset="${widths.map((w) => `/${src.replace(/^img\//, `img/r/${w}/`)} ${w}w`).join(', ')}, /${src} ${o.w}w"`, `sizes="${sizesFor(src, classes)}"`);
      if (ruleFor(src)[3]?.full && !clean.includes(' data-full=')) add.push(`data-full="/${src}"`);
    }
  }
  const out = clean.replace(/\s*\/?>$/, ` ${add.join(' ')} />`);
  firstOf[src] ??= out;
  written++;
  return out;
});

// The preload links: the same candidates as the first <img> of that file.
html = html.replace(/<link rel="preload" as="image"[^>]*>/g, (link) => {
  const img = firstOf[attr(link, 'href')?.replace(/^\//, '')];
  const srcset = img && attr(img, 'srcset');
  if (!srcset) return link;
  return link.replace(/\simagesrcset="[^"]*"/, '').replace(/\simagesizes="[^"]*"/, '').replace(/(\shref="[^"]*")/, `$1 imagesrcset="${srcset}" imagesizes="${attr(img, 'sizes')}"`);
});

writeFileSync(FILE, html);
console.log('img tags written:', written);
