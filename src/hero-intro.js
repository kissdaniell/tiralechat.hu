import { gsap } from 'gsap';
import { pauseScroll, scrollPosition } from './smooth-scroll.js';
import { bringHeroToLife, stickOn } from './hero-life.js';
import { portrait } from './hero-scroll.js';
import { drawSlogan } from './preloader.js';
import { arrived, loadLatecomers } from './late-images.js';
import { MOTION, NO_MOTION } from './motion.js';

// The hero builds itself up out of the preloader (index.html .preloader):
// while the tattoo machine writes "Varrjuk fel!" under the big logo
// (src/preloader.js), the five tattoo stickers glide in from their edges as
// soon as each has loaded. Once the slogan is drawn and the page has loaded,
// the logo flies up into the header and the slogan to its place in the
// headline, the header slides down from the top, and everything else in the
// hero glides in from its edge; then Kriszti's poses are stuck on one by one.

// Elements marked data-enter="<edge>" glide in from that edge; in the
// finale their data-enter-step sets the order (ENTER_STEP_GAP apart,
// elements of one step slightly staggered).
const ENTER_DURATION = 1.1;
const ENTER_STAGGER = 0.1;
const ENTER_STEP_GAP = 0.1;
const ENTER_DIRECTION = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] };

// The stickers that come in during the writing, at least this far apart.
const STICKER_GAP = 0.35;

// The finale: the logo's and the slogan's flights, the header, the rest.
const FLIGHT = 1;
const HEADER_AT = 0.45;
const REST_AT = 0.3;
const MACHINE_OUT = 0.7;

// Portraits 2–7 are stuck onto portrait 1 one after another, once she's in;
// each stays in view on its own for a moment before the next one arrives.
const POSE_START = 1.4;
const POSE_GAP = 0.7;
// How long one pose takes to land and the one under it to fade (stickOn).
const STICK_TIME = 0.6;

// Portrait view (phones): the same build-up with less going on at once, so
// it doesn't stutter. The headline (its worn-paint filter is costly to move)
// and the small notes and pictos fade in where they stand instead of
// gliding; the scroll scene is built — a heavy moment of script — only once
// the glides are over, and her poses start after that.
const FADE_IN = 0.5;
const PORTRAIT_BUILD_AT = 1.1;
const PORTRAIT_POSE_START = 1.9;

// Returns a promise that settles once the hero stands (the scroll scene is
// built only then: building it measures and sets the hero's elements).
export function playHeroIntro() {
  const root = document.documentElement;
  const mm = gsap.matchMedia();
  let built;
  const standing = new Promise((resolve) => (built = resolve));

  mm.add(NO_MOTION, () => {
    root.classList.remove('intro-pending', 'preloading');
    loadLatecomers();
    built();
  });

  mm.add(MOTION, () => {
    const preloader = document.querySelector('.preloader');
    pauseScroll(true);

    const { writing, arrived: firstScreenThere, done } = drawSlogan(preloader);
    const entered = new Set();
    writing.then(() => stickersIn(entered));
    // Her other poses (and the corner's other pictos) start loading the
    // moment the first screen is there, so that most often they have arrived
    // by the time their turn comes.
    firstScreenThere.then(loadLatecomers);

    let stopLife;
    done.then(() => {
      const tl = finale(preloader, entered);
      const ready = portrait() ? PORTRAIT_BUILD_AT : FLIGHT;
      tl.call(() => pauseScroll(false), [], ready)
        .call(built, [], ready + 0.1)
        .call(() => {
          root.classList.remove('preloading');
          stopLife = bringHeroToLife();
        });
    });
    return () => stopLife?.();
  });
  return standing;
}

// ---------- During the writing ----------

// Each tattoo sticker glides in from its edge as soon as its picture has
// loaded, one after another. (Only the ones this view shows: the picture of
// one it leaves out is lazy and never comes.)
function stickersIn(entered) {
  let next = gsap.ticker.time;
  const stickers = gsap.utils.toArray('.hero .decor-tattoo[data-enter]').filter((sticker) => sticker.offsetWidth);
  stickers.forEach((sticker) => {
    const img = sticker.querySelector('img');
    const ready = img.complete ? Promise.resolve() : img.decode().catch(() => {});
    ready.then(() => {
      if (entered.has(sticker) || !sticker.offsetWidth) return;
      entered.add(sticker);
      const at = Math.max(gsap.ticker.time, next);
      next = at + STICKER_GAP;
      glide(sticker, sticker.dataset.enter, at - gsap.ticker.time);
    });
  });
}

// ---------- The finale ----------

function finale(preloader, entered) {
  const root = document.documentElement;
  const tl = gsap.timeline();
  const header = document.querySelector('.site-header');
  const logo = header.querySelector('.logo');
  // (the hero's own: the preloader's copy has the same classes)
  const accent = document.querySelector('.hero .hero-title .accent');
  const plLogo = preloader.querySelector('.pl-logo');
  const plSlogan = preloader.querySelector('.pl-slogan');
  const plLine = plSlogan.querySelector('.line');

  // The logo and the slogan fly onto their places; the real ones take over
  // as they land.
  gsap.set([logo, accent], { autoAlpha: 0 });
  fly(tl, plLogo, plLogo, logo.querySelector('img'), 0);
  fly(tl, plSlogan, plLine, accent, 0.08);
  tl.set([logo, accent], { autoAlpha: 1 }, FLIGHT + 0.08).set([plLogo, plSlogan], { autoAlpha: 0 }, FLIGHT + 0.08);

  // The machine is done: down and away.
  tl.to(
    preloader.querySelector('.pl-machine'),
    { x: '+=' + innerWidth * 0.6, y: '+=' + innerHeight * 0.5, rotation: '+=30', duration: MACHINE_OUT, ease: 'power2.in' },
    0,
  );

  // The header slides down from the top.
  const bar = [...header.children].filter((el) => el !== logo && getComputedStyle(el).display !== 'none');
  tl.fromTo(
    bar,
    { yPercent: -160, autoAlpha: 1 },
    { yPercent: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, onComplete: handBackToStylesheet },
    HEADER_AT,
  );

  // The rest of the hero from its edges: the headline from the left, Kriszti
  // from the bottom, then the notes and pictos in their data-enter order,
  // and any sticker that hasn't come in yet.
  const hero = document.querySelector('.hero');
  const parts = [
    [hero.querySelector('.title-lead'), 'left'],
    [hero.querySelector('.hero-subtitle'), 'left'],
    [hero.querySelector('.hero-tape'), 'bottom'],
    [hero.querySelector('.portrait-stack'), 'bottom'],
  ];
  const rest = gsap.utils
    .toArray('[data-enter]', hero)
    .filter((el) => !entered.has(el))
    .sort((a, b) => (Number(a.dataset.enterStep) || 1) - (Number(b.dataset.enterStep) || 1));
  const light = portrait();
  const fades = (el) => light && !el.matches('.decor-tattoo, .portrait-stack');
  const enter = (el, edge, at) => (fades(el) ? fadeIn(el, at, tl) : glide(el, edge, at, tl));
  parts.forEach(([el, edge], i) => el && enter(el, edge, REST_AT + i * ENTER_STAGGER));
  rest.forEach((el, i) => enter(el, el.dataset.enter, REST_AT + 0.3 + i * ENTER_STEP_GAP));

  const [first, ...poses] = gsap.utils.toArray('.portrait-stack img');
  stickPoses(tl, first, poses, light ? PORTRAIT_POSE_START : POSE_START);

  // Every element now holds its starting state inline, so the stylesheet
  // rule that hid them can let go.
  root.classList.remove('intro-pending');
  return tl;
}

// Flies `el` so that `from` (inside it, or itself) lands on `to`: the
// centres meet and the size matches (the slogan and the accent line are
// turned alike, so their boxes scale into each other).
function fly(tl, el, from, to, at) {
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const box = el.getBoundingClientRect();
  const cx = a.left + a.width / 2;
  const cy = a.top + a.height / 2;
  gsap.set(el, { transformOrigin: `${cx - box.left}px ${cy - box.top}px` });
  tl.to(
    el,
    {
      x: b.left + b.width / 2 - cx,
      y: b.top + b.height / 2 - cy,
      scale: b.width / a.width,
      duration: FLIGHT,
      ease: 'power3.inOut',
    },
    at,
  );
}

// ---------- Gliding in ----------

// Slides an element in from beyond an edge to its place, on `tl` at `at` or
// on its own after `at` seconds. Animates GSAP's xPercent/yPercent: the
// first time GSAP touches an element it folds its CSS rotate/transform into
// one transform, with the percent translate outermost, so the glide stays in
// screen space whatever the element's rotation. The scroll scene
// (hero-scroll.js) moves the same elements with x/y — separate components,
// so the two add up instead of fighting if someone scrolls early.
function glide(el, edge, at, tl) {
  if (!el.offsetWidth) return;
  const [dx, dy] = ENTER_DIRECTION[edge];
  const b = el.getBoundingClientRect();
  const travel = 40 + (dx < 0 ? b.right : dx > 0 ? innerWidth - b.left : dy < 0 ? b.bottom : innerHeight - b.top);
  const from = {
    xPercent: (dx * travel * 100) / el.offsetWidth,
    yPercent: (dy * travel * 100) / el.offsetHeight,
    autoAlpha: 1,
  };
  const to = { xPercent: 0, yPercent: 0, duration: ENTER_DURATION, ease: 'power3.out', onComplete: handBackToStylesheet };
  if (tl) tl.fromTo(el, from, to, at);
  else gsap.fromTo(el, from, { ...to, delay: at });
}

// Portrait: shows an element where it stands.
function fadeIn(el, at, tl) {
  if (!el.offsetWidth) return;
  tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE_IN, ease: 'power1.out' }, at);
}

// Drop the inline transform GSAP leaves behind so the stylesheet (incl.
// `rotate:`) is in charge again — unless the scroll scene is already moving
// these elements, whose transform that would wipe.
function handBackToStylesheet() {
  if (scrollPosition() === 0) gsap.set(this.targets(), { clearProps: 'transform' });
}

// Each pose is stuck on (see stickOn in hero-life.js); only the arriving pose
// moves, the stack below stays still. The last pose gets a beat of
// anticipation and a bigger lift.
//
// The hero doesn't wait for these pictures, only for the first pose (they
// start loading when the first screen has arrived: src/late-images.js), so
// on a slow line one may still be on its way when its turn comes — and a
// pose without its picture would cover her with nothing. So each is stuck on
// at its moment only if it is there; the ones that miss their turn are
// brought in by the pose loop afterwards (hero-life.js).
function stickPoses(tl, first, poses, start) {
  gsap.set(poses, { autoAlpha: 0 });

  let shown = first;
  let at = start;
  poses.forEach((pose, i) => {
    const last = i === poses.length - 1;
    at = start + i * POSE_GAP + (last ? 0.15 : 0);
    tl.call(
      () => {
        if (!arrived(pose)) return;
        stickOn(gsap.timeline(), pose, i, 0, { last, behind: shown });
        shown = pose;
      },
      [],
      at,
    );
  });
  // (The timeline lasts until the last one is down.)
  tl.to({}, { duration: STICK_TIME }, at);

  // Drop the leftover transforms once all of them are down; the covered poses
  // stay faded out, only the top one shows.
  tl.set(poses, { clearProps: 'transform' });
}
