import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

import { every, tremble, whileShown } from './jitter.js';
import { arrived } from './late-images.js';

gsap.registerPlugin(DrawSVGPlugin);

// What keeps moving on the hero once the intro is over (started by
// src/hero-intro.js), plus the stick-on motion Kriszti's poses share with
// the intro.

// How a pose is stuck onto the stack (the n-th one takes the n-th tilt and
// nudge, round and round).
const POSE_TILT = [-7, 6, -9, 5, -6, 10];
const POSE_NUDGE = [-3, 4, -2, 3, -4, 2];

// Kriszti's stack keeps cycling: every POSE_PAUSE seconds the POSE_BATCH
// poses at the bottom of the pile are stuck on top, POSE_GAP apart, like the
// intro's. Only the top pose is ever on show: as a new one lands, the one it
// covers fades out over POSE_FADE seconds.
const POSE_PAUSE = [3, 4];
const POSE_BATCH = 3;
const POSE_GAP = 0.5;
const POSE_FADE = 0.35;

// Now and then one of the five tattoo stickers does its hover turn by
// itself: a random one (never the same twice running), every 4–5 s from
// one turn to the next, held for NUDGE_HOLD seconds.
const NUDGE_PAUSE = [3.2, 4.2];
const NUDGE_HOLD = 0.2;

// The arrow under "Ő itt Tira.": a constant slight tremble (in the arrow
// image's own pixels and degrees), and every REDRAW_PAUSE seconds it is
// wiped away and drawn on again.
const TREMBLE = 36;
const TREMBLE_TURN = 3;
const REDRAW_PAUSE = [4, 6];

// A few seconds after the intro the mole's speech bubble pops out of its
// mouth ("Görgess lefelé!…"): from its tail, springy.
const BUBBLE_AT = 2.5;

// Starts all of it; returns a function that stops it and tidies up.
export function bringHeroToLife() {
  const stops = [
    loopPoses(document.querySelector('.portrait-stack')),
    nudgeStickers(gsap.utils.toArray('.decor-tattoo')),
    whileShown(document.querySelector('.tag-arrow'), () => liveArrow(document.querySelector('.tag-arrow svg'))),
    popBubble(document.querySelector('.mole-bubble')),
  ];
  return () => stops.forEach((stop) => stop());
}

// Grows from the tail's tip (its transform-origin), with a little turn and
// an overshoot, the words a beat behind; then the words keep trembling (the
// bubble itself stays still).
function popBubble(bubble) {
  const words = bubble.querySelector('.mole-bubble-text');
  let still;
  const tl = gsap
    .timeline({ delay: BUBBLE_AT })
    .set(bubble, { autoAlpha: 1 })
    .fromTo(bubble, { scale: 0.1, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.55)' })
    .fromTo(words, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' }, 0.25)
    .call(() => {
      still = whileShown(bubble, () => tremble(words, { px: 1.5, deg: 1.5 }));
    });
  return () => {
    tl.kill();
    still?.();
    gsap.set([bubble, words], { clearProps: 'all' });
  };
}

// A pose appears lifted off the wall (bigger, tilted, slightly offset) and
// accelerates into place. The last of a run gets a bigger lift. As it lands,
// the pose it covers (`behind`) fades away.
export function stickOn(tl, pose, n, at, { last = false, behind } = {}) {
  tl.to(pose, { autoAlpha: 1, duration: 0.06 }, at).fromTo(
    pose,
    {
      scale: last ? 1.3 : 1.2,
      rotation: POSE_TILT[n % POSE_TILT.length],
      xPercent: POSE_NUDGE[n % POSE_NUDGE.length],
      yPercent: -6,
    },
    { scale: 1, rotation: 0, xPercent: 0, yPercent: 0, duration: 0.28, ease: 'power4.in', immediateRender: false },
    at,
  );
  if (behind) tl.to(behind, { autoAlpha: 0, duration: POSE_FADE, ease: 'power1.out' }, at + 0.22);
}

// The stack's order is tracked bottom to top, so each batch takes the poses
// that have waited longest. z-index keeps the latest on top without touching
// the DOM. Skipped while the stack is hidden (sunk into the folder by the
// scroll scene), so nothing moves where no one can see it.
//
// Only poses whose picture has arrived take a turn (the contact's load in
// their turn, the hero's own may be late on a slow line: src/late-images.js)
// — one stuck on without its picture would cover her with nothing.
export function loopPoses(stack) {
  const order = gsap.utils.toArray('img', stack);
  // The one on show: the last one stuck on (the ones it covered were faded
  // out as it landed), or the top one if none has been yet.
  let shown = order.findLast((pose) => pose.style.visibility !== 'hidden') ?? order[order.length - 1];
  let z = 0;
  let n = 0;

  // The pose that has waited longest, of those that can be stuck on now.
  const next = () => {
    for (let tries = order.length; tries--; ) {
      const pose = order.shift();
      order.push(pose);
      if (pose !== shown && arrived(pose)) return pose;
    }
    return null;
  };

  const stop = every(POSE_PAUSE, (done) => {
    const batch = gsap.timeline({ onComplete: done });
    if (getComputedStyle(stack).visibility === 'hidden') return batch;
    for (let i = 0; i < POSE_BATCH; i++) {
      const pose = next();
      if (!pose) break;
      const last = i === POSE_BATCH - 1;
      const at = i * POSE_GAP + (last ? 0.15 : 0);
      batch.set(pose, { zIndex: ++z }, at);
      stickOn(batch, pose, n++, at, { last, behind: shown });
      shown = pose;
    }
    return batch;
  });

  return () => {
    stop();
    gsap.set(order, { clearProps: 'transform,opacity,visibility,zIndex' });
  };
}

// Uses the same stylesheet state as the hover (.is-nudged), so it is the
// very same turn.
function nudgeStickers(stickers) {
  let previous;
  const stop = every(NUDGE_PAUSE, (done) => {
    // Only ones on screen (the hero's sink into the folder; the contact
    // act brings its own).
    const pool = stickers.filter((s) => s !== previous && getComputedStyle(s).visibility !== 'hidden');
    if (!pool.length) return gsap.delayedCall(0, done);
    const sticker = gsap.utils.random(pool);
    previous = sticker;
    sticker.classList.add('is-nudged');
    return gsap.delayedCall(NUDGE_HOLD, () => {
      sticker.classList.remove('is-nudged');
      done();
    });
  });

  return () => {
    stop();
    stickers.forEach((s) => s.classList.remove('is-nudged'));
  };
}

function liveArrow(svg) {
  const body = svg.querySelector('.arrow-body');
  const [shaft, head] = svg.querySelectorAll('.arrow-stroke');
  const splash = svg.querySelector('.arrow-splash');

  const shake = gsap.to(body, {
    x: `random(${-TREMBLE}, ${TREMBLE})`,
    y: `random(${-TREMBLE}, ${TREMBLE})`,
    rotation: `random(${-TREMBLE_TURN}, ${TREMBLE_TURN})`,
    svgOrigin: '738 532',
    duration: 0.09,
    ease: 'sine.inOut',
    repeat: -1,
    repeatRefresh: true,
  });

  // The mask shows the whole arrow through `splash` between redraws. A
  // redraw hides it and wipes both strokes away tail-first, then draws the
  // shaft and the head, and brings the splatter back.
  const stop = every(REDRAW_PAUSE, (done) =>
    gsap
      .timeline({ onComplete: done })
      .to(splash, { opacity: 0, duration: 0.2 })
      .fromTo([shaft, head], { drawSVG: '0% 100%' }, { drawSVG: '100% 100%', duration: 0.25, ease: 'power1.in' }, 0)
      .fromTo(shaft, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.5, ease: 'power1.inOut', immediateRender: false }, '+=0.2')
      .fromTo(head, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.35, ease: 'power1.inOut', immediateRender: false })
      .to(splash, { opacity: 1, duration: 0.3 }),
  );

  return () => {
    shake.kill();
    stop();
    gsap.set([body, shaft, head, splash], { clearProps: 'all' });
  };
}
