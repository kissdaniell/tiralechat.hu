// The pictures that aren't needed for the first screen load after it, in the
// order the page shows them — not all at once with it. That is what lets the
// page be scrolled as soon as the hero stands, whatever is still on its way.
//
// The later acts' pictures are lazy in the markup, and while the hero builds
// itself up their acts aren't laid out at all (html.scene-waiting,
// src/style.css), so nothing of them is fetched then. To build the scroll
// scene the acts have to be laid out, though, and from then on every one of
// their pictures is "in view" (the whole stage is one screen) — which to a
// browser means: fetch them all, now. So first each picture's source is put
// aside and a blank of the same shape stands in for it (holdLateImages); the
// scene is built on those — a picture's shape is all the layout needs — and
// then the real ones are given back act by act (loadLateImages): an act's
// start downloading when the one before has arrived, or at once when the
// reader gets there first (nearAct).
//
// The first screen has latecomers of its own, treated the same way: her
// other poses and the corner's other pictos only take their turn once the
// hero stands, so they come when the rest of it has arrived (loadLatecomers).

// One entry per act after the hero, in order: where its pictures are.
const ACTS = ['.works', '.designs', '.paintings', '.news, .folder-hand', '.contact'];
// The first screen's latecomers (not laid out during the intro either:
// src/style.css). The poses are wanted as soon as she stands, laid out or not.
const POSES = '.portrait-stack img + img';
const PICTOS = '.decor-smiley img + img';
// The longest one step may hold the line (ms) before the next starts as well.
const MAX_TURN = 8000;

const held = new Map(); // picture → its real { src, srcset }, until that has loaded
let acts = []; // per act: its pictures
const asked = []; // per act: the promise of its pictures, once asked for

const blank = (w, h) => `data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='${w}'%20height='${h}'/%3E`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const all = (where) => [...document.querySelectorAll(where)].flatMap((el) => (el.matches('img') ? [el] : [...el.querySelectorAll('img')]));
const laidOut = (img) => img.getClientRects().length > 0;

// Has this picture's own image arrived (not its blank, and not still on its
// way)? For the things that take turns: a pose stuck on before its picture
// is there would cover the one on show with nothing.
export const arrived = (img) => !held.has(img) && img.complete && img.naturalWidth > 0;

// Settles when the picture has loaded or failed (at once, if it has).
export const whenArrived = (img) =>
  new Promise((resolve) => {
    if (img.complete) return resolve();
    img.addEventListener('load', resolve, { once: true });
    img.addEventListener('error', resolve, { once: true });
  });

// A picture's real sources, whether it is being held or not.
export const sourcesOf = (img) => held.get(img) ?? { src: img.getAttribute('src'), srcset: img.getAttribute('srcset') };

// At once, before anything of theirs is laid out. (A picture without its
// width and height in the markup is left alone: its blank couldn't keep its
// shape.)
export function holdLateImages() {
  acts = ACTS.map(all);
  for (const img of [...all(POSES), ...all(PICTOS), ...acts.flat()]) {
    const [w, h] = [img.getAttribute('width'), img.getAttribute('height')];
    if (!w || !h || img.complete) continue;
    held.set(img, { src: img.getAttribute('src'), srcset: img.getAttribute('srcset') });
    // (It stays lazy: made eager here, the browser would start on the
    // picture it had put off — the real one — before taking up the blank.
    // Until the blank is in, the width and height attributes give the shape.)
    img.removeAttribute('srcset');
    img.src = blank(w, h);
  }
}

// Gives pictures their sources back. Returns a promise that settles when the
// ones asked for now have arrived (or failed). They load at once, wherever
// the scene has parked them; one the current view doesn't lay out at all
// (the stylesheet leaves it out) stays lazy instead, and loads if it ever
// shows — unless `whatever` it is wanted now.
function giveBack(pictures, whatever = false) {
  return Promise.all(
    pictures.map((img) => {
      const real = held.get(img);
      if (!real || real.asked) return null;
      real.asked = true;
      // (Not whenArrived: until the new source is taken up the picture still
      // counts as complete — with its blank. And a blank's own late load
      // isn't the real one's.)
      const there = new Promise((resolve) => {
        const settle = () => {
          if (img.currentSrc.startsWith('data:')) return;
          img.removeEventListener('load', settle);
          img.removeEventListener('error', settle);
          held.delete(img);
          resolve();
        };
        img.addEventListener('load', settle);
        img.addEventListener('error', settle);
      });
      const now = whatever || laidOut(img);
      if (real.srcset) img.srcset = real.srcset;
      img.src = real.src;
      // (Eager only once the browser has taken up the new source — it does
      // that in a microtask, queued before this one: made eager first, it
      // would go and fetch the blank it had put off.)
      if (now) queueMicrotask(() => (img.loading = 'eager'));
      return now ? there : null;
    }),
  );
}

const ask = (i) => (acts[i] ? (asked[i] ??= giveBack(acts[i])) : Promise.resolve());

// When the first screen has arrived (src/hero-intro.js): its latecomers.
export function loadLatecomers() {
  giveBack(all(POSES), true);
  giveBack(all(PICTOS));
}

// Once the scene is built: first what the first screen itself is still
// waiting for (her other poses), then `before` (functions returning a
// promise: the mobile menu's pictures, the lightbox's), then the acts in
// order. Where the reader asked for less data only the first; the rest comes
// as they scroll.
export async function loadLateImages(before = []) {
  const firstScreen = all('.site-header, .hero').filter((img) => laidOut(img) && !img.complete);
  const frugal = navigator.connection?.saveData || /2g/.test(navigator.connection?.effectiveType ?? '');
  const steps = [() => Promise.all(firstScreen.map(whenArrived)), ...(frugal ? [] : [...before, ...acts.map((_, i) => () => ask(i))])];
  for (const step of steps) await Promise.race([step(), sleep(MAX_TURN)]);
}

// The reader has got to act `i` (0: the hero): its pictures and the next
// act's are asked for now, wherever the queue stands.
export function nearAct(i) {
  ask(i - 1);
  ask(i);
}
