import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { FOLDER_MOUTH, LOWERED_REACH, folderBox, loweredSpot, mouthY, portrait, waveByX } from './hero-scroll.js';

// The designs' act ("Tervezéseim"), keyed off the works' beats: while the
// last polaroids leave, the folder turns 45° more, up into the top-right
// corner, and the two pictos swap for two others; the title turns into
// "Tervezéseim" and drops to the bottom-left corner; then the tattoo machine
// and the nine designs come out of the folder's mouth to their places in the
// stylesheet (src/style.css, "Designs"). In portrait the folder doesn't turn:
// it sinks lower at the bottom and they come up out of it, and the title
// stays at the top.

// Turned to -135°, the folder's mouth faces down-left across the top-right
// corner; its midpoint sits CORNER_INSET (share of the frame height) in from
// both the top and the right edge.
const CORNER_INSET = 0.22;
const TURN_DURATION = 1.4;

const PICTO_DURATION = 1.1;

// "Munkáim" → "Tervezéseim": the letters dissolve like the first morph while
// the title drops until its line underneath is TITLE_MARGIN (share of the
// frame height) above the bottom edge.
const TITLE_DURATION = 2.2;
const TITLE_MARGIN = 0.05;

// Out of the folder: first the machine, then the designs — the ones nearest
// the folder first — DESIGN_STAGGER apart.
const MACHINE_DURATION = 1.2;
const DESIGN_DURATION = 1.3;
const DESIGN_STAGGER = 0.2;

export function designsChapter(tl, stage, works) {
  const designs = stage.querySelector('.designs');
  const folder = gsap.utils.toArray('.folder', stage);

  const turnAt = works.noteBack;
  tl.to(
    folder,
    {
      x: () => corner(stage).x,
      y: () => corner(stage).y,
      rotation: () => (portrait() ? 0 : -135),
      duration: TURN_DURATION,
      ease: 'power2.inOut',
    },
    turnAt,
  );

  // The works' pictos leave the way they came; the designs' two arrive.
  glide(tl, stage.querySelector('.works-picto--bandaid'), 'left', 'out', turnAt);
  glide(tl, stage.querySelector('.works-picto--heart'), 'bottom', 'out', turnAt + 0.1);
  glide(tl, designs.querySelector('.designs-picto--smiley'), 'top', 'in', turnAt + 0.4);
  glide(tl, designs.querySelector('.designs-picto--cat'), 'bottom', 'in', turnAt + 0.6);

  retitle(tl, stage, works.almostGone);

  const outAt = turnAt + TURN_DURATION + 0.1;
  comeOut(tl, stage, designs.querySelector('.designs-machine'), outAt, MACHINE_DURATION);

  const pieces = gsap.utils.toArray('.design', designs);
  const fromFolder = (el) => {
    const c = centre(el);
    const o = origin(stage);
    return Math.hypot(c.x - o.x, c.y - o.y);
  };
  pieces
    .sort((a, b) => fromFolder(a) - fromFolder(b))
    .forEach((el, i) => comeOut(tl, stage, el, outAt + 0.4 + i * DESIGN_STAGGER, DESIGN_DURATION));

  const end = outAt + 0.4 + (pieces.length - 1) * DESIGN_STAGGER + DESIGN_DURATION;
  tl.addLabel('foglalhato', end);
  return end;
}

// Where the folder's centre goes (as x/y from its CSS box) for the corner
// (portrait: lowered at the bottom).
function corner(stage) {
  if (portrait()) return loweredSpot(stage);
  const f = folderBox(stage);
  const d = CORNER_INSET * f.h;
  // The centre lies (0.5 - FOLDER_MOUTH) of the folder's height behind the
  // mouth, towards the corner (up-right at 45°).
  const k = (0.5 - FOLDER_MOUTH) * f.height * Math.SQRT1_2;
  return { x: f.w - d + k - (f.left + f.width / 2), y: d - k - (f.top + f.height / 2) };
}

// A point just inside the turned folder, behind its cover: where things
// come out from.
export function origin(stage) {
  if (portrait()) return { x: stage.offsetWidth / 2, y: mouthY(stage, LOWERED_REACH) + 0.08 * folderBox(stage).height };
  const h = stage.offsetHeight;
  const d = CORNER_INSET * h;
  const k = 0.1 * h * Math.SQRT1_2;
  return { x: stage.offsetWidth - d + k, y: d - k };
}

// An element's resting centre, in stage coordinates (its parent fills the stage).
function centre(el) {
  return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
}

// Flies an element out of the folder's mouth to its place, starting a
// little smaller and turned; hidden (stylesheet) until its moment.
function comeOut(tl, stage, el, at, duration) {
  // Its resting tilt (the stylesheet's `rotate`), read while it's at rest.
  let rest;
  const tilt = () => (rest ??= gsap.getProperty(el, 'rotation'));
  tl.set(el, { autoAlpha: 1 }, at).fromTo(
    el,
    {
      x: () => origin(stage).x - centre(el).x,
      y: () => origin(stage).y - centre(el).y,
      scale: 0.6,
      rotation: () => tilt() - 25,
    },
    { x: 0, y: 0, scale: 1, rotation: () => tilt(), duration, ease: 'power3.out', immediateRender: false },
    at,
  );
}

// Slides an element between its place in the stylesheet and beyond one edge
// of the frame: 'in' arrives there (out of sight until then), 'out' leaves.
function glide(tl, el, edge, way, at) {
  const off = {
    left: { x: () => -(el.offsetLeft + el.offsetWidth * 1.2) },
    top: { y: () => -(el.offsetTop + el.offsetHeight * 1.2) },
    bottom: { y: () => el.offsetParent.offsetHeight - el.offsetTop + el.offsetHeight * 0.2 },
  }[edge];
  if (way === 'in') tl.fromTo(el, off, { x: 0, y: 0, duration: PICTO_DURATION, ease: 'power3.out' }, at);
  else tl.fromTo(el, { x: 0, y: 0 }, { ...off, duration: PICTO_DURATION, ease: 'power3.in', immediateRender: false }, at);
}

// "Munkáim / 15+ év gyakorlás." dissolves into "Tervezéseim / Ez akár rád is
// kerülhet…" (laid on the same spot in index.html) while the title block
// drops to the bottom-left corner.
function retitle(tl, stage, at) {
  const lead = stage.querySelector('.title-lead');
  const [worksTitle, designsTitle] = lead.querySelectorAll('.title-next');
  const [worksSub, designsSub] = lead.querySelectorAll('.title-sub');
  const out = [...worksTitle.querySelector('.ink').children];
  const into = SplitText.create(designsTitle.querySelector('.ink'), { type: 'chars', tag: 'span' }).chars;
  gsap.set(designsTitle, { opacity: 1 });

  // The drop, from where the block rests without its own transforms.
  const drop = () => {
    const s = stage.getBoundingClientRect();
    const bottom = designsSub.getBoundingClientRect().bottom - s.top - gsap.getProperty(lead, 'y') - gsap.getProperty(designsSub, 'y');
    return stage.offsetHeight * (1 - TITLE_MARGIN) - bottom;
  };

  // (In portrait it stays at the top: the folder is at the bottom.)
  if (!portrait()) tl.to(lead, { y: drop, duration: TITLE_DURATION, ease: 'power2.inOut' }, at);
  tl.addLabel('t-foglalhato', at + 0.75)
    .fromTo(
      out,
      { opacity: 1, yPercent: 0, filter: 'blur(0em)' },
      { opacity: 0, yPercent: -25, filter: 'blur(0.08em)', duration: 0.7, ease: 'power1.in', stagger: waveByX(out, 0.5), immediateRender: false },
      at + 0.3,
    )
    .to(worksSub, { autoAlpha: 0, y: -10, duration: 0.5, ease: 'power1.in' }, at + 0.3)
    .fromTo(
      into,
      { opacity: 0, yPercent: 25, filter: 'blur(0.08em)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0em)', duration: 0.7, ease: 'power1.out', stagger: waveByX(into, 0.5) },
      at + 0.75,
    )
    .fromTo(designsSub, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, at + TITLE_DURATION - 0.5);
}
