import { gsap } from 'gsap';

// Small time-based helpers for the page's restless bits (not the scroll
// scene): a repeating random rhythm, a tremble, and a watcher that keeps an
// endless motion running only while its element can be seen.

// Calls `run(done)` again and again, waiting a random `pause` (seconds)
// before each round; `run` calls `done` when its round is over and returns
// something with kill() (or nothing). Returns a function that stops it.
export function every(pause, run) {
  let wait;
  let round;
  const next = () => {
    wait = gsap.delayedCall(gsap.utils.random(...pause), () => {
      round = run(next);
    });
  };
  next();
  return () => {
    wait.kill();
    round?.kill?.();
  };
}

// Runs `start()` — which starts an endless motion and returns the function
// that stops it — only while `el` can actually be seen, and stops it
// otherwise, so nothing animates (and nothing is repainted) out of sight.
// "Seen" = inside the frame (an IntersectionObserver: the scroll scene moves
// things out with transforms, which it follows), not hidden (the scene also
// hides things in place with visibility, which no observer reports — one
// shared slow check covers that), and the tab itself showing. Returns a
// function that ends the watching (and the motion).
const watched = new Set();
let watching;

export function whileShown(el, start) {
  let stop = null;
  let inFrame = false;
  const check = () => {
    const shown = inFrame && !document.hidden && getComputedStyle(el).visibility !== 'hidden';
    if (shown && !stop) stop = start();
    else if (!shown && stop) {
      stop();
      stop = null;
    }
  };
  const observer = new IntersectionObserver(([entry]) => {
    inFrame = entry.isIntersecting;
    check();
  });
  observer.observe(el);
  watched.add(check);
  watching ??= setInterval(() => watched.forEach((c) => c()), WATCH_EVERY);

  return () => {
    observer.disconnect();
    watched.delete(check);
    if (!watched.size) {
      clearInterval(watching);
      watching = undefined;
    }
    stop?.();
    stop = null;
  };
}

// How often the hidden-in-place check runs, ms.
const WATCH_EVERY = 400;

// Shakes an element by up to `px` pixels and `deg` degrees around where it
// rests, like the arrow under "Ő itt Tira.", until the returned function is
// called; then it settles back.
// Where each element rests, read the first time it trembles (a later read
// could catch it mid-shake).
const resting = new WeakMap();

export function tremble(el, { px = 2, deg = 3 } = {}) {
  if (!resting.has(el)) resting.set(el, gsap.getProperty(el, 'rotation'));
  const rest = resting.get(el);
  const shake = gsap.to(el, {
    x: () => gsap.utils.random(-px, px),
    y: () => gsap.utils.random(-px, px),
    rotation: () => rest + gsap.utils.random(-deg, deg),
    duration: 0.09,
    ease: 'sine.inOut',
    repeat: -1,
    repeatRefresh: true,
    // Takes over from a settling (or another) shake on the same element.
    overwrite: 'auto',
  });
  return () => {
    shake.kill();
    gsap.to(el, { x: 0, y: 0, rotation: rest, duration: 0.15, ease: 'power1.out', overwrite: true });
  };
}
