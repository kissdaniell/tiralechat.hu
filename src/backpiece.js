import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { portrait, waveByX } from './hero-scroll.js';
import { stickOn } from './hero-life.js';

// The back-piece act, after the designs have landed (everything on scroll):
// the designs float down out of the frame except the first one, while a
// bare back rises in the middle; that design flies onto the back, the title
// turns up the left edge as "Ne parázz!", and the tattoo machine comes over
// and scribbles on it; the machine goes back to its corner and the tattooed
// back is stuck over the bare one and the design, like Kriszti's poses.

// A little scroll with nothing happening once the designs are all out.
const PAUSE = 0.8;

const LEAVE_DURATION = 1.2;
const LEAVE_STAGGER = 0.06;
const RISE_DURATION = 1.4;

// The design on the back: centre and height as shares of the back's box,
// matching where the tattoo sits on the finished back (kivitel-2).
const ON_BACK = { x: 0.47, y: 0.6, height: 0.7 };
const APPLY_AT = 1.1; // after the designs start leaving
const APPLY_DURATION = 1.6;

// The title's new place: up the left edge, its middle at TITLE_Y (share of
// the frame height). The block turns -85°, which with the line's own -5°
// slant stands "Ne parázz!" exactly upright.
const TITLE_Y = 0.6;
const TITLE_TURN = -85;
const TITLE_DURATION = 1.8;
// The smiley goes along and stops beside the text, near its lower end:
// SMILEY_GAP (share of the frame height) right of it, its middle at
// SMILEY_Y, turned to SMILEY_TURN.
const SMILEY_GAP = 0.02;
const SMILEY_Y = 0.8;
const SMILEY_TURN = 14;

// The machine's needle tip, as a share of its image; the scribble strokes
// around the middle of the design, in shares of the back's width, with a
// little tilt on each stroke.
const MACHINE_TIP = { x: 0.04, y: 0.987 };
const SCRIBBLE_AT = { x: 0.47, y: 0.55 };
const SCRIBBLE = [
  [-0.1, -0.06, -4],
  [0.08, 0.02, 3],
  [-0.05, 0.09, -2],
  [0.09, -0.04, 4],
  [-0.03, 0.05, -3],
  [0.06, 0.11, 2],
  [0, 0, 0],
];
const MACHINE_TRAVEL = 1.3;
// Portrait: the machine is small there, so it grows this much while it works
// on the back.
const MACHINE_GROW = 1.8;
const STROKE = 0.25;

// The ink the needle leaves, in the ink layer's own units (the back's box is
// 750 × 1000 of them): INK_DOTS dots per stroke, each INK_R across, some
// running down (INK_DRIP), some flicked off to the side (INK_FLICK).
const INK_DOTS = 7;
const INK_R = [8, 13];
const INK_DRIP = [14, 34];
const INK_FLICK = [16, 30];

export function backpieceChapter(tl, stage, at) {
  const designs = stage.querySelector('.designs');
  const backpiece = designs.querySelector('.backpiece');
  const bare = backpiece.querySelector('.backpiece-bare');
  const done = backpiece.querySelector('.backpiece-done');
  const onBack = designs.querySelector('.design--1');
  const leaving = gsap.utils.toArray('.design', designs).filter((el) => el !== onBack);
  const machine = designs.querySelector('.designs-machine');

  const start = at + PAUSE;

  // Down and out, each with a little turn of its own.
  leaving.forEach((el, i) => {
    tl.to(
      el,
      {
        // Past the bottom edge with anything it carries above itself too
        // (tervezes-5's note).
        y: () => el.offsetParent.offsetHeight - el.offsetTop + el.offsetHeight * 0.2 + reachAbove(el),
        rotation: `+=${(i % 2 ? 1 : -1) * (6 + (i % 3) * 4)}`,
        duration: LEAVE_DURATION,
        ease: 'power2.in',
      },
      start + i * LEAVE_STAGGER,
    );
  });

  // The bare back rises from below the frame.
  tl.set(bare, { autoAlpha: 1 }, start).fromTo(
    bare,
    { y: () => stage.offsetHeight - box(backpiece).top },
    { y: 0, duration: RISE_DURATION, ease: 'power3.out', immediateRender: false },
    start,
  );

  // The first design flies onto the back.
  const applyAt = start + APPLY_AT;
  const landing = () => {
    const b = box(backpiece);
    const c = centre(onBack);
    return {
      x: b.left + ON_BACK.x * b.width - c.x,
      y: b.top + ON_BACK.y * b.height - c.y,
      scale: (ON_BACK.height * b.height) / onBack.offsetHeight,
    };
  };
  tl.to(
    onBack,
    {
      x: () => landing().x,
      y: () => landing().y,
      scale: () => landing().scale,
      rotation: 0,
      duration: APPLY_DURATION,
      ease: 'power2.inOut',
    },
    applyAt,
  );

  turnTitle(tl, stage, applyAt);

  // "Nem olyan vészes…" settles in beside it as the title arrives.
  tl.fromTo(
    designs.querySelector('.designs-caption'),
    { autoAlpha: 0, y: 12 },
    { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' },
    applyAt + TITLE_DURATION - 0.5,
  );

  // The machine comes over, scribbles, and goes back to its corner.
  const grow = portrait() ? MACHINE_GROW : 1;
  let rest;
  const restTilt = () => (rest ??= gsap.getProperty(machine, 'rotation'));
  const toTip = (dx, dy) => {
    const b = box(backpiece);
    const c = centre(machine);
    const r = (restTilt() * Math.PI) / 180;
    // (scaled round its centre, so the tip moves out with the scale)
    const lx = (MACHINE_TIP.x - 0.5) * machine.offsetWidth * grow;
    const ly = (MACHINE_TIP.y - 0.5) * machine.offsetHeight * grow;
    const tip = { x: c.x + lx * Math.cos(r) - ly * Math.sin(r), y: c.y + lx * Math.sin(r) + ly * Math.cos(r) };
    return {
      x: b.left + (SCRIBBLE_AT.x + dx) * b.width - tip.x,
      y: b.top + SCRIBBLE_AT.y * b.height + dy * b.width - tip.y,
    };
  };

  const machineAt = applyAt + 0.3;
  const [first, ...strokes] = SCRIBBLE;
  tl.to(
    machine,
    { x: () => toTip(first[0], first[1]).x, y: () => toTip(first[0], first[1]).y, scale: grow, duration: MACHINE_TRAVEL, ease: 'power2.inOut' },
    machineAt,
  );
  const landed = machineAt + MACHINE_TRAVEL;
  let t = landed;
  strokes.forEach(([dx, dy, tilt]) => {
    tl.to(
      machine,
      { x: () => toTip(dx, dy).x, y: () => toTip(dx, dy).y, rotation: () => restTilt() + tilt, duration: STROKE, ease: 'sine.inOut' },
      t,
    );
    t += STROKE;
  });
  tl.to(machine, { x: 0, y: 0, scale: 1, rotation: () => restTilt(), duration: MACHINE_TRAVEL, ease: 'power2.inOut' }, t);

  const ink = backpiece.querySelector('.backpiece-ink');
  inkScribble(tl, ink, SCRIBBLE, landed);

  // While the machine is away working, the cat has something to say.
  const catBubble = designs.querySelector('.cat-bubble');
  tl.set(catBubble, { autoAlpha: 1 }, machineAt)
    .fromTo(
      catBubble,
      { scale: 0.1, rotation: 18 },
      { scale: 1, rotation: 0, duration: 0.5, ease: 'back.out(1.7)', immediateRender: false },
      machineAt,
    )
    .to(catBubble, { scale: 0.1, rotation: 18, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, t);

  // As the machine leaves, the finished back is stuck on top (over the ink).
  const swapAt = t + 0.3;
  stickOn(tl, done, 0, swapAt, { last: true, behind: [bare, onBack, ink] });

  tl.addLabel('neparazz', swapAt + 0.7);
  return swapAt + 0.7;
}

// Ink dots along the needle's path, each growing in as the tip passes it
// (the path follows the machine's strokes, same ease), melted together by
// the layer's goo filter into one wet line. Everything on the timeline, so it
// runs backwards with the scroll too.
function inkScribble(tl, svg, path, landed) {
  const group = svg.querySelector('.backpiece-ink-drops');
  // A rebuilt scene (after a resize) starts from a clean back.
  group.replaceChildren();
  const along = gsap.parseEase('sine.inOut');
  const spot = ([dx, dy]) => ({ x: (SCRIBBLE_AT.x + dx) * 750, y: SCRIBBLE_AT.y * 1000 + dy * 750 });
  const range = ([min, max], i, salt) => min + (max - min) * hash(i, salt);
  let n = 0;

  const dot = (x, y, r, at) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', x.toFixed(1));
    c.setAttribute('cy', y.toFixed(1));
    c.setAttribute('r', 0);
    group.append(c);
    tl.fromTo(c, { attr: { r: 0 } }, { attr: { r }, duration: 0.12, ease: 'back.out(2)' }, at);
    return c;
  };

  // A splat where the needle first touches down.
  const start = spot(path[0]);
  dot(start.x, start.y, INK_R[1] * 1.4, landed);

  path.slice(1).forEach((to, s) => {
    const a = spot(path[s]);
    const b = spot(to);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    for (let k = 1; k <= INK_DOTS; k++, n++) {
      const f = along(k / INK_DOTS);
      const x = a.x + (b.x - a.x) * f;
      const y = a.y + (b.y - a.y) * f;
      const at = landed + (s + k / INK_DOTS) * STROKE;
      const c = dot(x, y, range(INK_R, n, 1), at);
      if (n % 5 === 2) tl.to(c, { attr: { cy: y + range(INK_DRIP, n, 2) }, duration: 0.9, ease: 'power1.in' }, at + 0.1);
      if (n % 3 === 1) {
        const side = (hash(n, 3) < 0.5 ? -1 : 1) * range(INK_FLICK, n, 4);
        dot(x - ((b.y - a.y) / len) * side, y + ((b.x - a.x) / len) * side, range([3, 5.5], n, 5), at + 0.03);
      }
    }
  });
}

// A fixed pseudo-random number in 0…1 for i (salt picks the property).
function hash(i, salt) {
  const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

// "Tervezéseim" turns up the left edge while it dissolves into "Ne parázz!";
// its line underneath fades away like the ones before.
function turnTitle(tl, stage, at) {
  const lead = stage.querySelector('.title-lead');
  const [, designsTitle, dontPanic] = lead.querySelectorAll('.title-next');
  const [, designsSub] = lead.querySelectorAll('.title-sub');
  const out = [...designsTitle.querySelector('.ink').children];
  const into = SplitText.create(dontPanic.querySelector('.ink'), { type: 'chars', tag: 'span' }).chars;
  gsap.set(dontPanic, { opacity: 1 });

  // Turn round the middle of "Ne parázz!", and bring that middle to the left
  // edge (the header's padding plus half the line's height).
  const middle = () => ({
    x: dontPanic.offsetLeft + dontPanic.offsetWidth / 2,
    y: dontPanic.offsetTop + dontPanic.offsetHeight / 2,
  });
  const smiley = stage.querySelector('.designs-picto--smiley');
  const pad = () => parseFloat(getComputedStyle(document.querySelector('.site-header')).paddingLeft);
  const place = () => {
    const home = offsetIn(lead, stage);
    const m = middle();
    return {
      x: pad() + dontPanic.offsetHeight / 2 - (home.x + m.x),
      y: titleY() * stage.offsetHeight - (home.y + m.y),
    };
  };

  // Portrait: no turn — "Ne parázz!" forms where the title already is, and
  // the smiley stays.
  tl.addLabel('t-neparazz', at + 0.7);

  // Where its middle stands, as a share of the height (portrait: set in the
  // stylesheet, --neparazz-y, so it clears the man's shoulders).
  const titleY = () =>
    parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--neparazz-y')) || TITLE_Y;

  tl.to(
    lead,
    {
      transformOrigin: () => `${middle().x}px ${middle().y}px`,
      x: () => place().x,
      y: () => place().y,
      rotation: TITLE_TURN,
      duration: TITLE_DURATION,
      ease: 'power2.inOut',
    },
    at,
  )
    .to(designsSub, { autoAlpha: 0, y: -10, duration: 0.5, ease: 'power1.in' }, at)
    .fromTo(
      out,
      { opacity: 1, yPercent: 0, filter: 'blur(0em)' },
      { opacity: 0, yPercent: -25, filter: 'blur(0.08em)', duration: 0.7, ease: 'power1.in', stagger: waveByX(out, 0.5), immediateRender: false },
      at + 0.2,
    )
    .fromTo(
      into,
      { opacity: 0, yPercent: 25, filter: 'blur(0.08em)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0em)', duration: 0.7, ease: 'power1.out', stagger: waveByX(into, 0.4) },
      at + 0.7,
    );
  // In the wide views the smiley goes along, to beside its lower end.
  if (!portrait()) {
    tl.to(
      smiley,
      {
        x: () => pad() + dontPanic.offsetHeight + SMILEY_GAP * stage.offsetHeight + smiley.offsetWidth / 2 - centre(smiley).x,
        y: () => SMILEY_Y * stage.offsetHeight - centre(smiley).y,
        rotation: SMILEY_TURN,
        duration: TITLE_DURATION,
        ease: 'power2.inOut',
      },
      at,
    );
  }
}

// The back's box in stage coordinates (the box itself never moves).
function box(backpiece) {
  return {
    left: backpiece.offsetLeft,
    top: backpiece.offsetTop,
    width: backpiece.offsetWidth,
    height: backpiece.offsetHeight,
  };
}

// How far an element's children stick out above it.
function reachAbove(el) {
  return Math.max(0, ...[...el.children].map((c) => -c.offsetTop));
}

function centre(el) {
  return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
}

// An element's layout position inside `root`, ignoring transforms.
function offsetIn(el, root) {
  let x = 0;
  let y = 0;
  for (let n = el; n && n !== root; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}
