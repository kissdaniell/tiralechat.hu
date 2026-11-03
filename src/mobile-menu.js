import { gsap } from 'gsap';
import { pauseScroll } from './smooth-scroll.js';
import { every, tremble } from './jitter.js';
import { whenArrived } from './late-images.js';
import { NO_MOTION } from './motion.js';

// The mobile menu (portrait view only; src/style.css hides it and its button
// otherwise). The hamburger in the header opens it: the paper sheet slides
// down from the top with the logo and the socials on it, the torn corner with
// the close button comes in from the top right, the six items glide in from
// the left and right in turns, and the e-mail address (copied on click, like
// the contact's) comes up from the bottom. While it's open the page doesn't
// scroll, the arrows at "Hello" and over the address tremble and the ✕ gives
// a wobble now and then. A link closes it and the page scrolls on to its
// place (src/smooth-scroll.js routes it).

const PORTRAIT = '(max-aspect-ratio: 85/100)';
// Closing plays the opening backwards, this much faster.
const CLOSE_SPEED = 1.7;
// The ✕ wobbles every WOBBLE_EVERY seconds.
const WOBBLE_EVERY = [2.5, 4.5];

export function setupMobileMenu() {
  const menu = document.querySelector('.mobile-menu');
  const toggle = document.querySelector('.menu-toggle');
  if (!menu || !toggle) return;
  const close = menu.querySelector('.mm-close');
  const reduced = matchMedia(NO_MOTION);
  const inPortrait = matchMedia(PORTRAIT);

  let tl = null;
  let open = false;
  let life = [];

  // The pictures load quietly once the page is in portrait, so the menu's
  // first opening isn't an empty sheet: after the first screen's (main.js
  // asks for them then; lazy in the markup, so a view without the menu never
  // downloads them — and opened before that, they load as lazy ones do).
  // Returns a promise that settles when they have arrived.
  let wanted = false;
  const preload = () => {
    wanted = true;
    if (!inPortrait.matches) return Promise.resolve();
    const pictures = [...menu.querySelectorAll('img')];
    pictures.forEach((img) => (img.loading = 'eager'));
    return Promise.all(pictures.map(whenArrived));
  };
  inPortrait.addEventListener('change', () => wanted && preload());

  const build = () => {
    const items = gsap.utils.toArray('.mm-item', menu);
    const t = gsap.timeline({
      paused: true,
      defaults: { ease: 'power3.out' },
      onReverseComplete: () => {
        menu.hidden = true;
      },
    });
    t.fromTo(['.mm-sheet', '.mm-head', '.mm-place'].map((s) => menu.querySelector(s)), { y: () => -innerHeight }, { y: 0, duration: 0.6 }, 0)
      .fromTo(menu.querySelector('.mm-corner'), { xPercent: 100, yPercent: -100 }, { xPercent: 0, yPercent: 0, duration: 0.5 }, 0.25);
    items.forEach((item, i) => {
      const fromLeft = i % 2 === 0;
      t.fromTo(
        item,
        {
          x: () => (fromLeft ? -(item.offsetLeft + item.offsetWidth * 1.1) : innerWidth - item.offsetLeft + item.offsetWidth * 0.1),
          rotation: fromLeft ? -8 : 8,
        },
        { x: 0, rotation: 0, duration: 0.55 },
        0.3 + Math.floor(i / 2) * 0.08 + (i % 2) * 0.04,
      );
    });
    // The language switch (under the items) comes up from below, like the foot.
    t.fromTo(menu.querySelector('.mm-lang'), { y: () => innerHeight * 0.6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 }, 0.4);
    t.fromTo(menu.querySelector('.mm-foot'), { yPercent: 100 }, { yPercent: 0, duration: 0.7 }, 0.35)
      .fromTo(menu.querySelectorAll('.mm-arrow, .mm-picto'), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0.75);
    return t;
  };

  const startLife = () => {
    if (reduced.matches) return;
    const x = close.querySelector('img');
    life = [
      tremble(menu.querySelector('.mm-arrow'), { px: 1.5, deg: 3 }),
      tremble(menu.querySelector('.mm-hint .contact-arrow'), { px: 1.5, deg: 4 }),
      every(WOBBLE_EVERY, (done) =>
        gsap
          .timeline({ onComplete: done })
          .to(x, { rotation: -14, duration: 0.12, ease: 'sine.out' })
          .to(x, { rotation: 10, duration: 0.14, ease: 'sine.inOut' })
          .to(x, { rotation: -5, duration: 0.12, ease: 'sine.inOut' })
          .to(x, { rotation: 0, duration: 0.2, ease: 'sine.out' }),
      ),
    ];
  };
  const stopLife = () => {
    life.forEach((stop) => stop());
    life = [];
  };

  const show = () => {
    if (open) return;
    open = true;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    pauseScroll(true);
    tl ??= build();
    tl.invalidate();
    if (reduced.matches) tl.progress(1);
    else tl.timeScale(1).play();
    startLife();
    close.focus({ preventScroll: true });
  };

  const hide = ({ instant = false, refocus = true } = {}) => {
    if (!open) return;
    open = false;
    toggle.setAttribute('aria-expanded', 'false');
    pauseScroll(false);
    stopLife();
    if (instant || reduced.matches) {
      tl?.progress(0).pause();
      menu.hidden = true;
    } else tl.timeScale(CLOSE_SPEED).reverse();
    if (refocus) toggle.focus({ preventScroll: true });
  };

  toggle.addEventListener('click', show);
  close.addEventListener('click', () => hide());
  addEventListener('keydown', (e) => e.key === 'Escape' && hide());

  // A link closes the menu; the scroll is released first, so the page's own
  // link handling (a later listener) can scroll the page to its place.
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) hide({ refocus: false });
  });

  // Out of the portrait view there is no menu to show.
  inPortrait.addEventListener('change', () => !inPortrait.matches && hide({ instant: true, refocus: false }));
  addEventListener('resize', () => tl?.invalidate());

  return { preload };
}
