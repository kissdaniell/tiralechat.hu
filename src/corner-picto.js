import { gsap } from 'gsap';
import { portrait } from './hero-scroll.js';
import { sourcesOf } from './late-images.js';

// Portrait view: things that belong to the act on screen rather than to a
// moment of it, and change as each act's title forms (the 't-…' labels the
// acts put on the timeline): the picto in the top-left corner and the
// subtitle in the bottom-left one.
//
// Which one shows follows the timeline's current time (read on every update
// of the scene), and the change itself is a short animation of its own —
// not scrubbed: an element shown and hidden by several scrubbed tweens can be
// left in a stale state when the scene is refreshed.

// `marks`: [label, element] pairs, in order; `first` shows before them.
// `swap(from, to)` animates a change. Returns the element for a time.
function followActs(tl, marks, first, swap) {
  // (An element of null means nothing shows from that label on.)
  const at = marks.map(([label, el]) => [tl.labels[label], el]).filter(([t, el]) => t != null && el !== undefined);
  const which = (time) => at.reduce((el, [t, next]) => (time >= t ? next : el), first);
  let shown = first;
  tl.to(
    {},
    {
      duration: tl.duration(),
      onUpdate: () => {
        const next = which(tl.time());
        if (next === shown) return;
        swap(shown, next);
        shown = next;
      },
    },
    0,
  );
}

// ---- The corner picto: the hero's smiley doesn't sink into the folder, it
// stays for the whole page and turns into another picto per act. It holds
// its pictures on top of each other (index.html).
const CORNER = [
  ['t-munkaim', 'element-4'],
  ['t-foglalhato', 'element-5'], // and through "Ne parázz!"
  ['t-firkaim', 'element-6'],
  ['t-miujsag', 'element-1'],
  ['t-kapcsolat', 'element-8'],
];

// Returns a function that puts the pictures back as they were.
export function cornerPicto(tl, stage) {
  if (!portrait()) return () => {};
  const imgs = gsap.utils.toArray('.decor-smiley img', stage);
  // (By its real source: the picture may still be waiting for its turn to
  // load, with a blank standing in — src/late-images.js.)
  const find = (name) => imgs.find((img) => sourcesOf(img).src.includes(`/${name}.`));
  gsap.set(imgs.slice(1), { autoAlpha: 0 });
  followActs(tl, CORNER.map(([label, name]) => [label, find(name)]), imgs[0], (from, to) => {
    gsap.to(from, { autoAlpha: 0, scale: 0.2, rotation: -40, duration: 0.25, ease: 'back.in(2)', overwrite: true });
    gsap.fromTo(
      to,
      { autoAlpha: 0, scale: 0.2, rotation: 40 },
      { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.45, delay: 0.18, ease: 'back.out(2.2)', overwrite: true },
    );
  });
  return () => {
    gsap.killTweensOf(imgs);
    gsap.set(imgs, { clearProps: 'opacity,visibility,transform,scale,rotate' });
  };
}

// ---- The subtitle in the bottom-left corner, on the act's menu paper
// (index.html .act-sub, one per act in order, from the hero's to the news'):
// the old one slides out to the left, the new one comes in from there. The
// contact act has none.
const SUB_LABELS = ['t-munkaim', 't-foglalhato', 't-neparazz', 't-firkaim', 't-miujsag'];
// The hero's shows a moment after the scene is built (the intro plays then).
const FIRST_AFTER = 1.2;

export function actSubs(tl, stage) {
  if (!portrait()) return () => {};
  const subs = gsap.utils.toArray('.act-sub', stage);
  if (!subs.length) return () => {};
  const out = (el) =>
    gsap.to(el, { xPercent: -120, rotation: -10, autoAlpha: 0, duration: 0.35, ease: 'power2.in', overwrite: true });
  const into = (el, delay = 0) =>
    gsap.fromTo(
      el,
      { xPercent: -120, rotation: -10, autoAlpha: 1 },
      { xPercent: 0, rotation: 0, duration: 0.6, delay, ease: 'back.out(1.4)', overwrite: true },
    );
  gsap.set(subs, { autoAlpha: 0 });
  const first = into(subs[0], FIRST_AFTER);
  const marks = [...SUB_LABELS.map((label, i) => [label, subs[i + 1]]), ['t-kapcsolat', null]];
  followActs(tl, marks, subs[0], (from, to) => {
    first.kill();
    if (from) out(from);
    if (to) into(to, from ? 0.2 : 0);
  });
  return () => {
    gsap.killTweensOf(subs);
    gsap.set(subs, { clearProps: 'all' });
  };
}
