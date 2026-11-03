import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Both folder layers share one 1536x888 canvas: the front cover's top edge
// (the "mouth" things drop through) is 23% down it, and the cover spans
// 3.1%–97.1% of its width.
export const FOLDER_MOUTH = 0.23;
const FOLDER_COVER = [0.031, 0.971];
// Docked at the bottom, the mouth sits this share of the frame height above
// the bottom edge; turned onto the right edge, the same distance in from it.
export const MOUTH_INSET = 0.25;
// Portrait view (src/style.css, below 0.85:1): the folder never turns onto
// an edge — it stays docked at the bottom, its mouth this share of its own
// height above the bottom edge: higher while the hero sinks into it, lower
// while the streams come up out of it (more of the pictures shows), lowest
// for the designs and the back.
export const SINK_REACH = 0.5;
export const STREAM_REACH = 0.22;
export const LOWERED_REACH = 0.1;

// Whether the portrait view is on (read when the scene is built; the scene
// is rebuilt when the window's shape changes, src/stage.js).
export const portrait = () => matchMedia('(max-aspect-ratio: 85/100)').matches;

// Timeline beats, in seconds of the stage timeline (src/stage.js turns them
// into scroll distance). data-exit="fade" captions go first, then
// data-exit="sink" elements drop into the folder one data-exit-step at a time.
const CAPTIONS_AT = 0.25;
const SINK_START = 0.9;
const SINK_STEP_GAP = 0.3;
const PORTRAIT_STEP_GAP = 0.18;
const SINK_STAGGER = 0.08;
const SINK_DURATION = 1.3;
const SINK_SCALE = 0.8;
const SINK_TILT = [7, -6, 5, -8, 6, -5, 4];
const TITLE_AT = 1.2;
const TITLE_DURATION = 2.2;
// Gap between the header and "Munkáim" once it has arrived, in em.
const TITLE_GAP = 0.2;
const TURN_DURATION = 1.4;
const PORTRAIT_SETTLE = 0.8;

// Sinking path: x and y both run off one shared progress (power1.inOut)
// mapped onto a quarter ellipse — x = sin, y = 1 − cos — so an element sets
// off sideways and curves down into the folder in one continuous arc.
const along = gsap.parseEase('power1.inOut');
const ARC_X = (t) => Math.sin((along(t) * Math.PI) / 2);
const ARC_Y = (t) => 1 - Math.cos((along(t) * Math.PI) / 2);

// The hero's act on the stage: the folder rises, the captions fade, the
// images sink into the folder, the title turns into "Munkáim", and the
// folder swings onto the right edge. Returns when the folder starts turning
// and when it has settled there.
export function heroChapter(tl, stage) {
  const hero = stage.querySelector('.hero');
  const folder = gsap.utils.toArray('.folder', stage);

  tl.to(folder, { y: () => dockedY(stage, SINK_REACH), duration: 1, ease: 'power2.out' }, 0);

  tl.to(
    gsap.utils.toArray('[data-exit="fade"]', hero),
    { autoAlpha: 0, scale: 0.85, duration: 0.6, stagger: 0.08, ease: 'power1.in' },
    CAPTIONS_AT,
  );

  const sinkEnd = sinkIntoFolder(tl, hero, stage);
  morphTitle(tl, hero);

  const turning = sinkEnd + 0.1;
  // In portrait the folder stays at the bottom, only sinking a little lower
  // for the stream.
  if (portrait()) {
    tl.to(folder, { y: () => edgeSpot(stage).y, duration: PORTRAIT_SETTLE, ease: 'power2.inOut' }, turning);
    return { turning, settled: turning + PORTRAIT_SETTLE };
  }
  turnFolder(tl, stage, folder, turning);
  return { turning, settled: turning + TURN_DURATION };
}

// ---------- Folder ----------

// The folder's CSS box (both layers share it), in stage coordinates.
export function folderBox(stage) {
  const el = stage.querySelector('.folder');
  return {
    w: stage.offsetWidth,
    h: stage.offsetHeight,
    left: el.offsetLeft,
    top: el.offsetTop,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

// Lift the parked folder until its mouth is MOUTH_INSET above the bottom edge
// (in portrait: `reach` of its own height).
function dockedY(stage, reach) {
  const f = folderBox(stage);
  return mouthY(stage, reach) - (f.top + FOLDER_MOUTH * f.height);
}

// The height of the docked folder's mouth, in stage coordinates (portrait:
// `reach` of its height above the bottom edge — the streams' by default).
export function mouthY(stage, reach = STREAM_REACH) {
  const f = folderBox(stage);
  if (!portrait()) return f.h * (1 - MOUTH_INSET);
  return f.h - reach * f.height;
}

// Portrait: where the folder goes for the designs and the back (x/y from
// its CSS box) — down, its mouth just above the bottom edge.
export function loweredSpot(stage) {
  return { x: 0, y: dockedY(stage, LOWERED_REACH) };
}

// The folder's turn when it waits beside the streams: on the right edge
// (-90°), or none in portrait (docked at the bottom).
export const edgeTurn = () => (portrait() ? 0 : -90);

// Swing the folder round the bottom-right corner onto the right edge:
// rotated -90° its mouth faces left, placed MOUTH_INSET in from the edge.
// x leads (ease-out) and y follows (ease-in), so the centre travels right
// along the bottom first and then up the side.
function turnFolder(tl, stage, folder, at) {
  const centre = () => edgeSpot(stage);

  tl.to(folder, { x: () => centre().x, duration: TURN_DURATION, ease: 'power2.out' }, at)
    .to(folder, { y: () => centre().y, duration: TURN_DURATION, ease: 'power2.in' }, at)
    .to(folder, { rotation: -90, duration: TURN_DURATION, ease: 'power1.inOut' }, at);
}

// Compact view: on windows taller than 4:3 the picture rows sit lower than
// the middle (src/style.css, 0.35 × --tall); the folder beside them (and the
// hand that takes it) follows.
export function streamDrop(stage) {
  if (!matchMedia('(max-aspect-ratio: 155/100) and (min-aspect-ratio: 85/100)').matches) return 0;
  return 0.35 * Math.max(0, stage.offsetHeight - 0.75 * stage.offsetWidth);
}

// Where the folder's centre goes (as x/y from its CSS box) to stand on the
// right edge, turned -90° (later acts bring it back here too). In portrait:
// docked at the bottom.
export function edgeSpot(stage) {
  if (portrait()) return { x: 0, y: dockedY(stage, STREAM_REACH) };
  const f = folderBox(stage);
  const x = f.w - MOUTH_INSET * f.h + (0.5 - FOLDER_MOUTH) * f.height;
  return { x: x - (f.left + f.width / 2), y: f.h / 2 + streamDrop(stage) - (f.top + f.height / 2) };
}

// ---------- Sinking into the folder ----------

function sinkIntoFolder(tl, hero, stage) {
  const steps = new Map();
  // (data-exit-portrait="stay": not in portrait — the corner picto stays.)
  const stays = (el) => portrait() && el.dataset.exitPortrait === 'stay';
  gsap.utils.toArray('[data-exit="sink"]', hero).filter((el) => !stays(el)).forEach((el) => {
    const step = Number(el.dataset.exitStep) || 1;
    steps.set(step, [...(steps.get(step) ?? []), el]);
  });

  // Each element arcs into the folder (ARC_X / ARC_Y). Leading sideways also
  // keeps stickers that reach below the mouth at rest from sliding straight
  // down past the cover's edges in plain sight. Both tweens share one
  // measurement per refresh; either may ask first (GSAP initialises them in
  // reverse when rendering backwards).
  let n = 0;
  let end = 0;
  // In portrait some of them aren't shown: the steps close up (no beats
  // with nothing going), and follow each other faster.
  const order = [...steps.keys()].sort((a, b) => a - b);
  const shown = order.filter((step) => steps.get(step).some((el) => el.offsetWidth));
  const beat = (step) => (portrait() ? Math.max(0, shown.indexOf(step)) * PORTRAIT_STEP_GAP : (step - 1) * SINK_STEP_GAP);

  order
    .forEach((step) => {
      steps.get(step).forEach((el, i) => {
        const at = SINK_START + beat(step) + i * SINK_STAGGER;
        const tilt = SINK_TILT[n++ % SINK_TILT.length];

        tl.to(el, { x: () => sinkTarget(el, stage).x, duration: SINK_DURATION, ease: ARC_X }, at)
          .to(el, { y: () => sinkTarget(el, stage).y, duration: SINK_DURATION, ease: ARC_Y }, at)
          .to(
            el,
            {
              // Relative, so a mirrored element (the note) stays mirrored.
              scaleX: `*=${SINK_SCALE}`,
              scaleY: `*=${SINK_SCALE}`,
              rotation: `+=${tilt}`,
              duration: SINK_DURATION,
              ease: 'power1.inOut',
            },
            at,
          )
          // Once fully below the frame it's hidden, so nothing still moving
          // inside it (Kriszti's poses) can peek back in at the bottom.
          .set(el, { autoAlpha: 0 }, at + SINK_DURATION);
        end = Math.max(end, at + SINK_DURATION);
      });
    });

  return end;
}

// Measurements are cached per element until the next ScrollTrigger refresh
// (resize etc.), which reverts the scene first — so the element is measured
// at rest, and x and y always agree.
let measureRound = 0;
const measured = new WeakMap();
ScrollTrigger.addEventListener('refreshInit', () => measureRound++);

function sinkTarget(el, stage) {
  const hit = measured.get(el);
  if (hit && hit.round === measureRound) return hit;
  const target = { round: measureRound, ...measureSink(el, stage) };
  measured.set(el, target);
  return target;
}

// Where an element has to go to vanish into the docked folder: over the
// front cover horizontally, and all the way below the frame, so nothing is
// left behind when the folder moves on.
function measureSink(el, stage) {
  const f = folderBox(stage);
  const box = restBox(el, stage);

  // Its box once scaled around its own transform origin.
  const [ox, oy] = getComputedStyle(el).transformOrigin.split(' ').map(parseFloat);
  const width = box.width * SINK_SCALE;
  const left = box.left + (ox / el.offsetWidth) * box.width * (1 - SINK_SCALE);
  const top = box.top + (oy / el.offsetHeight) * box.height * (1 - SINK_SCALE);

  const minLeft = f.left + (FOLDER_COVER[0] + 0.02) * f.width;
  const maxLeft = f.left + (FOLDER_COVER[1] - 0.02) * f.width - width;
  const toLeft = maxLeft < minLeft ? (minLeft + maxLeft) / 2 : gsap.utils.clamp(minLeft, maxLeft, left);

  return { x: toLeft - left, y: f.h * 1.08 - top };
}

// The element's box in stage coordinates, minus the intro's glide offset in
// case the intro is still running.
function restBox(el, stage) {
  const b = el.getBoundingClientRect();
  const s = stage.getBoundingClientRect();
  const dx = (gsap.getProperty(el, 'xPercent') / 100) * el.offsetWidth;
  const dy = (gsap.getProperty(el, 'yPercent') / 100) * el.offsetHeight;
  return { left: b.left - s.left - dx, top: b.top - s.top - dy, width: b.width, height: b.height };
}

// ---------- "Ne csak viseld." -> "Munkáim" ----------

// The title slides to the header's left edge, a little below the logo,
// while its two lines dissolve, letter by letter, into the "Munkáim" laid
// between them.
function morphTitle(tl, hero) {
  const lead = hero.querySelector('.title-lead');
  const next = lead.querySelector('.title-next');
  // (aria: none — SplitText would label the plain span, which ARIA forbids;
  // the letters read as the text they are.)
  const letters = (els) => els.flatMap((el) => SplitText.create(el, { type: 'chars', tag: 'span', aria: 'none' }).chars);
  const out = letters(gsap.utils.toArray('.line:not(.title-next) .ink', lead));
  const into = letters([next.querySelector('.ink')]);
  gsap.set(next, { opacity: 1 });

  tl.to(
    lead,
    {
      x: () => titleSpot(next).x,
      y: () => titleSpot(next).y,
      duration: TITLE_DURATION,
      ease: 'power2.inOut',
    },
    TITLE_AT,
  )
    .fromTo(
      out,
      { opacity: 1, yPercent: 0, filter: 'blur(0em)' },
      {
        opacity: 0,
        yPercent: -25,
        filter: 'blur(0.08em)',
        duration: 0.7,
        ease: 'power1.in',
        stagger: waveByX(out, 0.5),
        immediateRender: false,
      },
      TITLE_AT + 0.3,
    )
    .fromTo(
      into,
      { opacity: 0, yPercent: 25, filter: 'blur(0.08em)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0em)', duration: 0.7, ease: 'power1.out', stagger: waveByX(into, 0.4) },
      TITLE_AT + 0.75,
    )
    .addLabel('t-munkaim', TITLE_AT + 0.75)
    // "15+ év gyakorlás. / Erre futotta." settles in under it as it arrives.
    .fromTo(
      lead.querySelector('.title-sub'),
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' },
      TITLE_AT + TITLE_DURATION - 0.5,
    );
}

// The title block's x/y that puts `line` (one of the lines laid on the
// same spot inside .title-lead) at the header's left padding, TITLE_GAP
// below the header. Worked out from the layout, not from where things are on
// screen, so any act can send the title back to this spot whatever it is
// doing at the time. The line is slanted by its own CSS rotation (round its
// left middle), so its box on screen is the rotated one.
export function titleSpot(line) {
  const stage = line.closest('.stage');
  const header = document.querySelector('.site-header');
  const home = offsetIn(line, stage);
  const w = line.offsetWidth;
  const h = line.offsetHeight;
  const m = new DOMMatrix(getComputedStyle(line).transform);
  const turn = Math.atan2(m.b, m.a);
  const corners = [[0, -h / 2], [w, -h / 2], [0, h / 2], [w, h / 2]].map(([x, y]) => [
    x * Math.cos(turn) - y * Math.sin(turn),
    x * Math.sin(turn) + y * Math.cos(turn),
  ]);
  const left = home.x + Math.min(...corners.map((c) => c[0]));
  const top = home.y + h / 2 + Math.min(...corners.map((c) => c[1]));
  // The gap can be set per view (--title-gap on the header, in em).
  const em = parseFloat(getComputedStyle(header).getPropertyValue('--title-gap')) || TITLE_GAP;
  const gap = em * parseFloat(getComputedStyle(line).fontSize);
  return {
    x: parseFloat(getComputedStyle(header).paddingLeft) - left,
    y: header.getBoundingClientRect().bottom + gap - top,
  };
}

// An element's layout position inside `root`, ignoring transforms.
export function offsetIn(el, root) {
  let x = 0;
  let y = 0;
  for (let n = el; n && n !== root; n = n.offsetParent) {
    x += n.offsetLeft;
    y += n.offsetTop;
  }
  return { x, y };
}

// Letter delays by horizontal position, so the slanted lines dissolve as one
// left-to-right wave (array order would run line by line).
export function waveByX(chars, spread) {
  const xs = chars.map((c) => {
    const b = c.getBoundingClientRect();
    return b.left + b.width / 2;
  });
  const min = Math.min(...xs);
  const range = Math.max(...xs) - min || 1;
  return (i) => ((xs[i] - min) / range) * spread;
}
