import { gsap } from 'gsap';
import { pauseScroll } from './smooth-scroll.js';
import { every } from './jitter.js';
import { sourcesOf, whenArrived } from './late-images.js';
import { t } from './i18n.js';

// A click on a work, a design or a painting opens the lightbox: the picture
// big in the middle over a dark veil, arrows at the two edges to page through
// its group (← / → keys and a sideways swipe too), a counter, and the torn
// corner with the ✕ to close (Esc and a click on the veil close as well).
// Scrolling stops while it's open. Three groups:
//   works      the fifteen polaroids
//   paintings  every drawing, then every painting
//   designs    the nine designs — each one played as a little story: the
//              bare skin, the design laid on it, then the finished tattoo
//              fading in over both (a tap on it plays it again).

const GROUPS = [
  { name: 'works', selector: '.work', fill: { width: 0.82, height: 0.78 } },
  { name: 'designs', selector: '.design', fill: { width: 1, height: 1 } },
  { name: 'paintings', selector: '.painting', fill: { width: 1, height: 1 } },
];
// The picture itself (not the transparent canvas round a polaroid) fills
// this share of the screen at the most.
const FIT = 0.9;
const SWIPE = 45; // px of sideways travel that counts as a swipe
// File pixels per CSS pixel a picture needs here at the most: on a phone's
// 3× screen more is hardly seen, and the next file up is often several times
// the size (a painting's original is megabytes).
const DENSITY = 1.5;
const density = () => Math.min(devicePixelRatio, DENSITY);

// ===== The designs' stories — EDIT HERE =====
// Per design (tervezes-N): `bare` and `done` are two photos of the same body
// in the same frame (/img/tervezes/<name>.webp); `at` is where the design
// lies on it — its middle (x, y) and its height as shares of the photo, and
// its turn in degrees.
const STORIES = {
  1: { bare: 'kivitel-1', done: 'kivitel-2', at: { x: 0.47, y: 0.6, height: 0.7, turn: 0 } },
  2: { bare: 'lab', done: 'tervezes-2-kesz', at: { x: 0.5, y: 0.43, height: 0.2, turn: 0 } },
  3: { bare: 'kar', done: 'tervezes-3-kesz', at: { x: 0.38 , y: 0.5, height: 0.2, turn: 0 } },
  4: { bare: 'kivitel-1', done: 'tervezes-4-kesz', at: { x: 0.52, y: 0.62, height: 0.7, turn: 0 } },
  5: { bare: 'kar', done: 'tervezes-5-kesz', at: { x: 0.37, y: 0.49, height: 0.42, turn: 8 } },
  6: { bare: 'hat', done: 'tervezes-6-kesz', at: { x: 0.48, y: 0.64, height: 0.55, turn: 0 } },
  7: { bare: 'lab', done: 'tervezes-7-kesz', at: { x: 0.46, y: 0.45, height: 0.22, turn: 0 } },
  8: { bare: 'lab', done: 'tervezes-8-kesz', at: { x: 0.52, y: 0.48, height: 0.2, turn: 0 } },
  9: { bare: 'hat', done: 'tervezes-9-kesz', at: { x: 0.52, y: 0.64, height: 0.6, turn: 0 } },
};
// The story's beats, in seconds: the skin alone, the design coming on, the
// two together, the finished tattoo fading in.
const SKIN = 0.4;
const DESIGN_IN = 0.4;
const TOGETHER = 0.4;
const DONE_IN = 1.1;
// …while the two under it fade away, at the end of that.
const UNDER_OUT = 0.5;
// A story whose pictures haven't all arrived after this long shows a spinner.
const SPINNER_AFTER = 1;

const photo = (name) => ({ src: `/img/tervezes/${name}.webp`, srcset: `/img/r/640/tervezes/${name}.webp 640w, /img/r/800/tervezes/${name}.webp 800w, /img/tervezes/${name}.webp 1086w` });

// The file for a card's picture shown `width` CSS px wide: the smallest of
// the ones the page has for it — the card's own candidates (its srcset),
// then the full one — that has pixels enough for the screen.
function bigEnough(item, width) {
  const candidates = (sourcesOf(item.img).srcset ?? '').split(',').map((entry) => entry.trim().split(' '));
  return candidates.find(([, w]) => parseInt(w) >= width * density())?.[0] ?? item.full;
}

export function setupLightbox() {
  const ui = build();
  let open = null; // { items, index, group }
  let story = null;
  let wobble = null;

  // ---- What the groups hold, in the order of the page.
  const itemsOf = (group) =>
    gsap.utils.toArray(group.selector).map((card) => {
      const img = card.querySelector('img');
      const n = Number(card.className.match(/design--(\d+)/)?.[1]);
      return { img, full: img.dataset.full || img.currentSrc || img.src, alt: img.alt, story: STORIES[n] };
    });

  // ---- One page.
  const slide = (item, group) => {
    const box = document.createElement('div');
    box.className = 'lb-slide';
    if (item.story) {
      // Sized by the photo; the design is laid on it by the story's `at`.
      box.classList.add('lb-slide--story');
      const bare = picture(photo(item.story.bare), '');
      const design = new Image();
      const done = picture(photo(item.story.done), item.alt);
      bare.className = 'lb-bare';
      design.className = 'lb-design';
      done.className = 'lb-done';
      const { x, y, height, turn } = item.story.at;
      Object.assign(design.style, { left: `${x * 100}%`, top: `${y * 100}%`, height: `${height * 100}%` });
      // Centred on that point and turned by GSAP (it would drop a CSS
      // translate / rotate when it first animates the picture).
      gsap.set(design, { xPercent: -50, yPercent: -50, rotation: turn });
      // A size at once (the photos are about 3:4), the exact one when the
      // photo has loaded. (Not decode(): where that fails, the box would be
      // left without a size — an empty lightbox.)
      fit(box, bare, group.fill, 4 / 3);
      // The design, in a file for the size it lies on the photo at.
      const shape = item.img.getAttribute('width') / item.img.getAttribute('height') || 1;
      Object.assign(design, { decoding: 'async', alt: '', draggable: false, src: bigEnough(item, parseFloat(box.style.height) * height * shape) });
      box.append(bare, design, done);
      whenLoaded(bare, () => fit(box, bare, group.fill));
    } else {
      // The small picture the page already has shows at once; the full one
      // fades in over it when it has loaded.
      const small = picture({ src: item.img.currentSrc || item.img.src }, '');
      fit(box, item.img, group.fill);
      const full = picture({ src: bigEnough(item, parseFloat(box.style.width)) }, item.alt);
      full.style.opacity = 0;
      box.append(small, full);
      whenLoaded(full, () => {
        fit(box, full, group.fill);
        gsap.to(full, { opacity: 1, duration: 0.3 });
      });
    }
    return box;
  };

  // The story starts once its three pictures are there (the timeline waits
  // paused at its first frame until then).
  const play = (box) => {
    story?.kill();
    const design = box.querySelector('.lb-design');
    if (!design) return;
    const done = box.querySelector('.lb-done');
    const bare = box.querySelector('.lb-bare');
    const doneAt = SKIN + DESIGN_IN + TOGETHER;
    const mine = (story = gsap
      .timeline({ paused: true })
      .set(done, { opacity: 0 })
      .set(bare, { opacity: 1 })
      .fromTo(design, { opacity: 0, scale: 1.25 }, { opacity: 1, scale: 1, duration: DESIGN_IN, ease: 'power2.out' }, SKIN)
      .to(done, { opacity: 1, duration: DONE_IN, ease: 'power1.inOut' }, doneAt)
      // …and the skin and the design under it go, in the second half of
      // that (the photos' outlines differ a little: left there, they showed
      // round the finished one).
      .to([bare, design], { opacity: 0, duration: UNDER_OUT, ease: 'power1.in' }, doneAt + DONE_IN - UNDER_OUT));
    const pictures = [...box.querySelectorAll('img')];
    let waiting = pictures.length;
    // Still waiting after SPINNER_AFTER seconds: a spinner says so.
    box.querySelector('.lb-spinner')?.remove();
    const slow = gsap.delayedCall(SPINNER_AFTER, () => {
      if (!waiting || !box.isConnected) return;
      const spinner = document.createElement('i');
      spinner.className = 'lb-spinner';
      box.append(spinner);
    });
    pictures.forEach((img) =>
      whenLoaded(img, () => {
        if (--waiting) return;
        slow.kill();
        box.querySelector('.lb-spinner')?.remove();
        if (story === mine) mine.play();
      }),
    );
  };

  // ---- Paging.
  const show = (index, dir = 0) => {
    const { items, group } = open;
    open.index = (index + items.length) % items.length;
    const item = items[open.index];
    const next = slide(item, group);
    const old = ui.stage.querySelector('.lb-slide');
    ui.stage.append(next);
    ui.count.textContent = `${open.index + 1} / ${items.length}`;
    if (old) gsap.to(old, { xPercent: -dir * 12, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: () => old.remove() });
    gsap.fromTo(
      next,
      dir ? { xPercent: dir * 12, opacity: 0 } : { scale: 0.92, opacity: 0 },
      { xPercent: 0, scale: 1, opacity: 1, duration: 0.45, delay: old ? 0.15 : 0, ease: 'power3.out' },
    );
    play(next);
    // The neighbours load meanwhile.
    [-1, 1].forEach((d) => {
      const near = items[(open.index + d + items.length) % items.length];
      // (In the file its own slide will take.)
      if (near.story) picture(photo(near.story.done), '');
      else new Image().src = bigEnough(near, fitted(near.img, group.fill).width);
    });
  };
  const step = (dir) => open && show(open.index + dir, dir);

  // ---- Open / close.
  const pause = pauseScroll;
  const openAt = (group, card) => {
    const items = itemsOf(group);
    open = { items, group, index: 0 };
    ui.root.hidden = false;
    ui.root.dataset.group = group.name;
    pause(true);
    gsap.fromTo(ui.root, { opacity: 0 }, { opacity: 1, duration: 0.3 });
    show(gsap.utils.toArray(group.selector).indexOf(card));
    const x = ui.close.querySelector('img');
    wobble = every([2.5, 4.5], (done) =>
      gsap
        .timeline({ onComplete: done })
        .to(x, { rotation: -14, duration: 0.12 })
        .to(x, { rotation: 10, duration: 0.14 })
        .to(x, { rotation: 0, duration: 0.2 }),
    );
    ui.close.focus({ preventScroll: true });
  };
  const close = () => {
    if (!open) return;
    open = null;
    story?.kill();
    wobble?.();
    pause(false);
    gsap.to(ui.root, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        ui.root.hidden = true;
        ui.stage.replaceChildren();
      },
    });
  };

  document.addEventListener('click', (event) => {
    if (open) return;
    const group = GROUPS.find((g) => event.target.closest(g.selector));
    if (group) openAt(group, event.target.closest(group.selector));
  });
  ui.prev.addEventListener('click', () => step(-1));
  ui.next.addEventListener('click', () => step(1));
  ui.close.addEventListener('click', close);
  // A click on the veil closes; one on a design's story plays it again.
  ui.root.addEventListener('click', (event) => {
    if (event.target.closest('button')) return;
    const box = event.target.closest('.lb-slide--story');
    if (box) play(box);
    else if (!event.target.closest('.lb-slide')) close();
  });
  addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') close();
    else if (event.key === 'ArrowLeft') step(-1);
    else if (event.key === 'ArrowRight') step(1);
  });

  // A sideways swipe pages.
  let from = null;
  ui.root.addEventListener('touchstart', (e) => (from = e.touches.length === 1 ? e.touches[0] : null), { passive: true });
  ui.root.addEventListener(
    'touchend',
    (e) => {
      if (!from) return;
      const to = e.changedTouches[0];
      const dx = to.clientX - from.clientX;
      if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(to.clientY - from.clientY) * 1.5) step(dx < 0 ? 1 : -1);
      from = null;
    },
    { passive: true },
  );
  addEventListener('resize', () => open && show(open.index));

  // Its own two pictures (the corner and the ✕) are lazy, so they don't load
  // with the first screen; main.js asks for them after it, so that the first
  // opening already has them. Returns a promise that settles when they have
  // arrived.
  const preload = () => {
    ui.pictures.forEach((img) => (img.loading = 'eager'));
    return Promise.all(ui.pictures.map(whenArrived));
  };
  return { preload };
}

function picture({ src, srcset }, alt) {
  const img = new Image();
  img.decoding = 'async';
  img.alt = alt;
  if (srcset) {
    img.srcset = srcset;
    // (Said smaller on sharp screens, so the browser picks by DENSITY.)
    img.sizes = `${Math.round((Math.min(innerWidth, innerHeight * 0.75) * density()) / devicePixelRatio)}px`;
  }
  img.src = src;
  img.draggable = false;
  return img;
}

function whenLoaded(img, run) {
  if (img.complete && img.naturalWidth) run();
  else img.addEventListener('load', run, { once: true });
}

// Sizes the slide to its picture's shape, as big as the screen allows.
function fit(box, img, fill, guess) {
  const { width, height } = fitted(img, fill, guess);
  box.style.height = `${height}px`;
  box.style.width = `${width}px`;
}

// The size a picture of this one's shape gets. (While it hasn't loaded, its
// shape is the one its width and height attributes tell — the page's own
// pictures have them — or else `guess`: height / width.)
function fitted(img, fill, guess = 1.5) {
  const aspect = img.naturalWidth ? img.naturalHeight / img.naturalWidth : img.getAttribute('height') / img.getAttribute('width') || guess;
  const height = Math.min((innerHeight * FIT) / fill.height, ((innerWidth * FIT) / fill.width) * aspect);
  return { height, width: height / aspect };
}

function build() {
  const root = document.createElement('div');
  root.className = 'lightbox';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', t('Képnézegető'));
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  root.innerHTML = `
    <div class="lb-stage"></div>
    <button class="lb-nav lb-nav--prev" type="button" aria-label="${t('Előző')}">${arrow}</button>
    <button class="lb-nav lb-nav--next" type="button" aria-label="${t('Következő')}">${arrow}</button>
    <p class="lb-count" aria-live="polite"></p>
    <div class="lb-corner">
      <img class="lb-corner-bg" src="/img/mobilemenu/sm/mmbg-corner.webp" alt="" width="640" height="630" loading="lazy" srcset="/img/r/400/mobilemenu/sm/mmbg-corner.webp 400w, /img/r/480/mobilemenu/sm/mmbg-corner.webp 480w, /img/mobilemenu/sm/mmbg-corner.webp 640w" sizes="max(110px, min(22vw, 26.4vh))" />
      <button class="lb-close" type="button" aria-label="${t('Bezárás')}"><img src="/img/mobilemenu/sm/close-icon.webp" alt="" width="360" height="328" loading="lazy" srcset="/img/r/120/mobilemenu/sm/close-icon.webp 120w, /img/r/160/mobilemenu/sm/close-icon.webp 160w, /img/r/240/mobilemenu/sm/close-icon.webp 240w, /img/mobilemenu/sm/close-icon.webp 360w" sizes="max(40px, min(8vw, 9.5vh))" /></button>
    </div>`;
  document.body.append(root);
  const q = (s) => root.querySelector(s);
  return { root, stage: q('.lb-stage'), prev: q('.lb-nav--prev'), next: q('.lb-nav--next'), count: q('.lb-count'), close: q('.lb-close'), pictures: [...root.querySelectorAll('img')] };
}
