import { gsap } from 'gsap';
import { every } from './jitter.js';
import { stickOn } from './hero-life.js';
import { arrived } from './late-images.js';
import { MOTION } from './motion.js';

// Some news photos change now and then: every CHANGE_EVERY seconds one of
// them — taking turns — gets its next picture stuck on top, the way
// Kriszti's poses land in the hero, while the one under it fades away. The
// pictures are the imgs in the photo's face (index.html), round and round.
// Only while the news are on screen.

const CHANGE_EVERY = 2.5;

export function setupNewsLife() {
  const faces = gsap.utils
    .toArray('.news-face')
    .filter((face) => face.querySelectorAll('img').length > 1)
    .map((face) => ({ face, pictures: gsap.utils.toArray('img', face), shown: 0, z: 1, n: 0 }));
  if (!faces.length) return;

  gsap.matchMedia().add(MOTION, () => {
    let turn = 0;
    const stop = every([CHANGE_EVERY, CHANGE_EVERY], (done) => {
      const photo = faces[turn++ % faces.length];
      const tl = gsap.timeline({ onComplete: done });
      if (getComputedStyle(photo.face.closest('.news-item')).visibility === 'hidden') return tl;

      const behind = photo.pictures[photo.shown];
      const upcoming = (photo.shown + 1) % photo.pictures.length;
      const next = photo.pictures[upcoming];
      // Not before its picture has arrived (src/late-images.js): stuck on
      // empty, it would cover the photo with nothing.
      if (!arrived(next)) return tl;
      photo.shown = upcoming;
      tl.set(next, { zIndex: ++photo.z }, 0);
      stickOn(tl, next, photo.n++, 0, { behind });
      return tl;
    });

    return () => {
      stop();
      faces.forEach((photo) => {
        photo.shown = 0;
        gsap.set(photo.pictures, { clearProps: 'transform,opacity,visibility,zIndex' });
      });
    };
  });
}
