import { gsap } from 'gsap';
import { every, tremble } from './jitter.js';
import { MOTION } from './motion.js';

// The menu never quite sits still: every few seconds one item trembles for
// a moment, and now and then one gets its pink underline or a black arrow
// pointing at it for a while. On hover an item trembles and its underline
// draws on (the underline itself is CSS). Only the label moves; the link's
// box stays put under the pointer.

const TREMBLE_PAUSE = [3, 4];
const TREMBLE_FOR = 0.6;
const MARK_PAUSE = [4, 7];
const MARK_FOR = 1.8;

export function setupNavLife() {
  const items = gsap.utils.toArray('.nav-item');
  if (!items.length) return;
  const size = (item) => parseFloat(getComputedStyle(item).fontSize);
  // One shake per item at a time, whoever started it.
  const shaking = new Map();
  const shake = (item) => {
    shaking.get(item)?.();
    shaking.set(item, tremble(item, { px: size(item) * 0.12, deg: 3 }));
  };
  const settle = (item) => {
    shaking.get(item)?.();
    shaking.delete(item);
  };

  // Items under the pointer (or focused): they shake until left.
  const held = new Set();
  items.forEach((item) => {
    const link = item.parentElement;
    const start = () => {
      if (held.has(item)) return;
      held.add(item);
      shake(item);
    };
    const stop = () => {
      held.delete(item);
      settle(item);
    };
    link.addEventListener('pointerenter', start);
    link.addEventListener('pointerleave', stop);
    link.addEventListener('focus', start);
    link.addEventListener('blur', stop);
  });

  const mm = gsap.matchMedia();
  mm.add(MOTION, () => {
    const idle = () => items.filter((item) => !held.has(item));
    const pick = () => gsap.utils.random(idle().length ? idle() : items);

    const stopTrembles = every(TREMBLE_PAUSE, (done) => {
      const item = pick();
      if (held.has(item)) return gsap.delayedCall(0, done);
      shake(item);
      return gsap.delayedCall(TREMBLE_FOR, () => {
        if (!held.has(item)) settle(item);
        done();
      });
    });

    const stopMarks = every(MARK_PAUSE, (done) => {
      const item = pick();
      const mark = Math.random() < 0.5 ? 'is-underlined' : 'is-pointed';
      item.classList.add(mark);
      return gsap.delayedCall(MARK_FOR, () => {
        item.classList.remove(mark);
        done();
      });
    });

    return () => {
      stopTrembles();
      stopMarks();
      items.forEach((item) => item.classList.remove('is-underlined', 'is-pointed'));
    };
  });
}
