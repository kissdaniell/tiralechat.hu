import { gsap } from 'gsap';
import { whenArrived } from './late-images.js';

// The preloader's drawing (markup: index.html .preloader). Instead of a
// counter, the tattoo machine writes "Varrjuk fel!" under the logo: the
// letters show from the left as its needle goes along them, scribbling up
// and down, then it swipes the pink underline. The writing keeps pace with
// the first screen's loading (it never gets ahead of it) but takes MIN_WRITE
// seconds at the least, so a fast load still gets the whole show.

const MIN_WRITE = 2.3;
// How far the writing may run ahead while the first screen is still loading.
const BEFORE_LOAD = 0.92;
// Up-and-down strokes of the needle across the text, and how far (share of
// the letters' height) they reach from the middle.
const STROKES = 11;
const STROKE_REACH = 0.3;
const MACHINE_IN = 0.7;
// Its turn round the needle tip while writing: the body hangs down to the
// right, under the text, clear of the logo above.
const HOLD = 75;
const UNDERLINE = 0.5;
// Longest wait for the slogan's font before writing anyway.
const FONT_WAIT = 1500;

// Starts the drawing. Returns promises: `writing` (the machine has started),
// `arrived` (the first screen's pictures are there) and `done` (the slogan
// is drawn and the first screen has loaded).
export function drawSlogan(preloader) {
  const line = preloader.querySelector('.pl-slogan .line');
  const ink = line.querySelector('.pl-ink');
  const underline = line.querySelector('.accent-underline');
  const tip = line.querySelector('.pl-tip');
  const machine = preloader.querySelector('.pl-machine');
  const { share: loaded, arrived } = firstScreen();

  // The needle's spot for a point in the line's own (unturned) layout.
  const needleAt = (x, y) => {
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
    const r = tip.getBoundingClientRect();
    return { x: r.left - machine.offsetWidth * 0.04, y: r.top - machine.offsetHeight * 0.987 };
  };
  const onText = (p) =>
    needleAt(
      ink.offsetLeft + p * ink.offsetWidth,
      ink.offsetTop + ink.offsetHeight * (0.5 + STROKE_REACH * Math.sin(p * STROKES * 2 * Math.PI)),
    );
  // The underline's stroke rises from about 80% of its height on the left
  // to 32% on the right.
  const onUnderline = (q) =>
    needleAt(underline.offsetLeft + q * underline.offsetWidth, underline.offsetTop + underline.offsetHeight * (0.8 - 0.48 * q));

  let startWriting;
  const writing = new Promise((resolve) => (startWriting = resolve));

  const done = fontReady().then(
    () =>
      new Promise((resolve) => {
        // In from the right, to the first letter.
        const start = onText(0);
        gsap.fromTo(
          machine,
          { x: innerWidth + 40, y: start.y + innerHeight * 0.15, rotation: HOLD + 30, autoAlpha: 1 },
          { x: start.x, y: start.y, rotation: HOLD, duration: MACHINE_IN, ease: 'power3.out', onComplete: write },
        );

        function write() {
          startWriting();
          let p = 0;
          const step = () => {
            const dt = gsap.ticker.deltaRatio() / 60;
            const limit = loaded() >= 1 ? 1 : BEFORE_LOAD * loaded();
            p = Math.min(limit, p + dt / MIN_WRITE, 1);
            ink.style.clipPath = `inset(-40% ${(1 - p) * 100}% -40% -10%)`;
            const at = onText(p);
            gsap.set(machine, { x: at.x, y: at.y, rotation: HOLD + 5 * Math.sin(p * STROKES * Math.PI) });
            if (p < 1) return;
            gsap.ticker.remove(step);
            swipe();
          };
          gsap.ticker.add(step);
        }

        function swipe() {
          const state = { q: 0 };
          const first = onUnderline(0);
          gsap
            .timeline({ onComplete: resolve })
            .to(machine, { x: first.x, y: first.y, rotation: HOLD - 6, duration: 0.25, ease: 'power2.inOut' })
            .to(state, {
              q: 1,
              duration: UNDERLINE,
              ease: 'power1.inOut',
              onUpdate: () => {
                underline.style.clipPath = `inset(-10% ${(1 - state.q) * 100}% -10% 0)`;
                const at = onUnderline(state.q);
                gsap.set(machine, { x: at.x, y: at.y });
              },
            });
        }
      }),
  );

  return { writing, arrived, done };
}

// What the hero waits for — the first screen, not the page: the later acts'
// pictures come afterwards (src/late-images.js) and nobody waits for them
// here. That is the pictures laid out when the page opens (the preloader's,
// the header's, the hero's, the folder's; not the menu's, the later acts',
// or the poses and pictos that only take their turn later: the stylesheet
// keeps all those out of the layout for now), the page's background, and
// the fonts in use. After MAX_WAIT seconds the hero stands with whatever has
// arrived.
//
// Returns `share()`: how much of it is there, 0…1; and `arrived`: a promise
// for the pictures.
const BACKGROUNDS = ['.backdrop', '.backdrop-wall'];
const MAX_WAIT = 12;

function firstScreen() {
  const laidOut = (el) => el.getClientRects().length > 0;
  const pictures = [...document.images].filter(laidOut);
  // A background is there when a picture of the same address is (it is the
  // same download: the browser fetches a file once per page).
  for (const el of document.querySelectorAll(BACKGROUNDS.join())) {
    const url = laidOut(el) && getComputedStyle(el).backgroundImage.match(/url\("?([^")]+)"?\)/)?.[1];
    if (!url) continue;
    const same = new Image();
    same.src = url;
    pictures.push(same);
  }
  let late = false;
  const patience = new Promise((resolve) => setTimeout(resolve, MAX_WAIT * 1000)).then(() => (late = true));
  return {
    arrived: Promise.race([Promise.all(pictures.map(whenArrived)), patience]),
    share: () => {
      if (late) return 1;
      const there = pictures.filter((img) => img.complete).length;
      if (there < pictures.length) return there / pictures.length;
      // (All of them, but a font is still on its way: just short of done.)
      return document.fonts.status === 'loading' ? 0.99 : 1;
    },
  };
}

function fontReady() {
  const font = document.fonts?.load('1em "Protest Revolution"', 'Varrjuk fel!') ?? Promise.resolve();
  return Promise.race([font.catch(() => {}), new Promise((resolve) => setTimeout(resolve, FONT_WAIT))]);
}
