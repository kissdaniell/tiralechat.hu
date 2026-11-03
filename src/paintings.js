import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { MOUTH_INSET, edgeSpot, edgeTurn, mouthY, portrait, titleSpot, waveByX } from './hero-scroll.js';
import { origin as folderCorner } from './designs.js';
import { fadeTowardsTop, fadeUnderTitle, noteOut, streamOf } from './works.js';

// The paintings' act ("Firkáim"), after the back piece (all on scroll): the
// tattooed back floats down out and the pictos swap again; "Ne parázz!" goes
// back to where "Munkáim" stood and turns into "Firkáim" with its line
// underneath; the machine goes back into the folder and the folder turns
// back onto the right edge; then the drawings (top row) and the paintings
// (bottom row) stream out of it like the works.

const PAUSE = 0.5;
const OUT_DURATION = 1.2;
const PICTO_DURATION = 1.1;
const TITLE_DURATION = 2.2;
const MACHINE_DURATION = 1;
const TURN_DURATION = 1.4;

// Each picture turned a little and nudged up or down (share of its height);
// fixed per picture, so the stream looks the same on every visit.
const TILT = 5;
const JITTER_Y = 0.04;

// Pixels the stream travels per pixel scrolled, as in the works.
const SPEED = 1;

// The pins' note comes out first and waits beside the folder's mouth (like
// the works' note); the stream starts once it is mostly out, and the note
// goes back in when the last picture is out.
const NOTE_DURATION = 1.2;
const NOTE_BACK_DURATION = 1;
const STREAM_AFTER_NOTE = 0.6;
// The stream counts as "almost gone" when its right end is this share of the
// frame width from the left edge (the next act's title starts then).
const ALMOST_GONE = 0.45;
const ALMOST_GONE_UP = 0.4;

// A painting fills its whole box (no transparent margin, unlike a polaroid).
const FULL = { x: 0, y: 0, width: 1 };

export function paintingsChapter(tl, stage, at, scrollPerSecond) {
  const paintings = stage.querySelector('.paintings');
  const strip = paintings.querySelector('.paintings-strip');
  const cards = gsap.utils.toArray('.painting', strip);
  const start = at + PAUSE;

  // The tattooed back floats down and out.
  const done = stage.querySelector('.backpiece-done');
  tl.to(
    done,
    { y: () => stage.offsetHeight - done.offsetParent.offsetTop + 20, rotation: 6, duration: OUT_DURATION, ease: 'power2.in' },
    start,
  );

  // The pictos swap: the smiley (beside "Ne parázz!") leaves left, the cat
  // drops out; the crown comes in from the top, the heart from the left.
  const smiley = stage.querySelector('.designs-picto--smiley');
  const cat = stage.querySelector('.designs-picto--cat');
  tl.to(smiley, { x: () => -(smiley.offsetLeft + smiley.offsetWidth * 1.2), duration: PICTO_DURATION, ease: 'power3.in' }, start)
    .to(cat, { y: () => stage.offsetHeight - cat.offsetTop + cat.offsetHeight * 0.2, duration: PICTO_DURATION, ease: 'power3.in' }, start + 0.1);
  const crown = paintings.querySelector('.paintings-picto--crown');
  const heart = paintings.querySelector('.paintings-picto--heart');
  tl.fromTo(crown, { y: () => -(crown.offsetTop + crown.offsetHeight * 1.2) }, { y: 0, duration: PICTO_DURATION, ease: 'power3.out' }, start + 0.6)
    .fromTo(heart, { x: () => -(heart.offsetLeft + heart.offsetWidth * 1.2) }, { x: 0, duration: PICTO_DURATION, ease: 'power3.out' }, start + 0.8);

  retitle(tl, stage, start + 0.3);
  tl.to(stage.querySelector('.designs-caption'), { autoAlpha: 0, y: -10, duration: 0.5, ease: 'power1.in' }, start + 0.3);

  // The machine flies back into the folder's mouth in the corner…
  const machine = stage.querySelector('.designs-machine');
  const home = () => ({ x: machine.offsetLeft + machine.offsetWidth / 2, y: machine.offsetTop + machine.offsetHeight / 2 });
  tl.to(
    machine,
    {
      x: () => folderCorner(stage).x - home().x,
      y: () => folderCorner(stage).y - home().y,
      scale: 0.6,
      rotation: '-=25',
      duration: MACHINE_DURATION,
      ease: 'power2.in',
    },
    start + 0.2,
  ).set(machine, { autoAlpha: 0 }, start + 0.2 + MACHINE_DURATION);

  // …and the folder turns back onto the right edge, where the works came out.
  const turnAt = start + 0.2 + MACHINE_DURATION;
  tl.to(
    gsap.utils.toArray('.folder', stage),
    { x: () => edgeSpot(stage).x, y: () => edgeSpot(stage).y, rotation: edgeTurn, duration: TURN_DURATION, ease: 'power2.inOut' },
    turnAt,
  );

  const settled = turnAt + TURN_DURATION;
  const note = paintings.querySelector('.paintings-note');
  tl.fromTo(
    note,
    { x: 0, y: 0, rotation: 6 },
    { ...noteOut(stage, note), rotation: 0, duration: NOTE_DURATION, ease: 'power3.out' },
    settled,
  );

  const streamAt = settled + NOTE_DURATION * STREAM_AFTER_NOTE;
  if (!cards.length) return { noteBack: streamAt, almostGone: streamAt, end: streamAt };

  // In portrait the two rows are two columns (src/style.css), rising.
  const up = portrait();
  cards.forEach((card, i) => {
    gsap.set(card, { rotation: TILT * scatter(i, 3), [up ? 'xPercent' : 'yPercent']: JITTER_Y * 100 * scatter(i, 2) });
  });

  const stream = streamOf(stage, strip, cards, up);
  const duration = stream.travel() / (SPEED * scrollPerSecond);
  const lead = stage.querySelector('.title-lead');
  const title = [lead.querySelectorAll('.title-next')[3].querySelector('.ink'), lead.querySelectorAll('.title-sub')[2]];

  // Shown only while it's on its way, like the works.
  tl.set(strip, { autoAlpha: 1 }, streamAt)
    .to(
      strip,
      {
        [stream.axis]: () => -stream.travel(),
        duration,
        ease: 'none',
        onUpdate: () => (up ? fadeTowardsTop(cards, title, FULL) : fadeUnderTitle(cards, title, FULL)),
      },
      streamAt,
    )
    .set(strip, { autoAlpha: 0 }, streamAt + duration);

  tl.addLabel('festmenyek', streamAt + duration * stream.centred());

  // With the last picture out of the folder, the note goes back in.
  const passes = (p) => streamAt + duration * stream.passes(p);
  const cardsOut = passes(up ? mouthY(stage) : stage.offsetWidth - MOUTH_INSET * stage.offsetHeight);
  tl.fromTo(
    note,
    { ...noteOut(stage, note), rotation: 0 },
    { x: 0, y: 0, rotation: 6, duration: NOTE_BACK_DURATION, ease: 'power2.in', immediateRender: false },
    cardsOut,
  );

  return {
    noteBack: cardsOut + NOTE_BACK_DURATION,
    almostGone: passes(up ? stage.offsetHeight * ALMOST_GONE_UP : stage.offsetWidth * ALMOST_GONE),
    end: streamAt + duration,
  };
}

// "Ne parázz!" turns back level and returns to the first title's spot while
// it dissolves into "Firkáim"; its line underneath forms after it.
function retitle(tl, stage, at) {
  const lead = stage.querySelector('.title-lead');
  const lines = lead.querySelectorAll('.title-next');
  const [, , dontPanic, doodles] = lines;
  const sub = lead.querySelectorAll('.title-sub')[2];
  const out = [...dontPanic.querySelector('.ink').children];
  const into = SplitText.create(doodles.querySelector('.ink'), { type: 'chars', tag: 'span' }).chars;
  gsap.set(doodles, { opacity: 1 });

  // The spot is the first title's ("Munkáim"), so "Firkáim" lands exactly
  // where that one stood.
  tl.to(
    lead,
    { x: () => titleSpot(lines[0]).x, y: () => titleSpot(lines[0]).y, rotation: 0, duration: TITLE_DURATION, ease: 'power2.inOut' },
    at,
  )
    .addLabel('t-firkaim', at + 0.75)
    .fromTo(
      out,
      { opacity: 1, yPercent: 0, filter: 'blur(0em)' },
      { opacity: 0, yPercent: -25, filter: 'blur(0.08em)', duration: 0.7, ease: 'power1.in', stagger: waveByX(out, 0.5), immediateRender: false },
      at + 0.3,
    )
    .fromTo(
      into,
      { opacity: 0, yPercent: 25, filter: 'blur(0.08em)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0em)', duration: 0.7, ease: 'power1.out', stagger: waveByX(into, 0.4) },
      at + 0.75,
    )
    .fromTo(sub, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, at + TITLE_DURATION - 0.5);
}

// A fixed pseudo-random number in -1…1 for picture i (salt picks the property).
function scatter(i, salt) {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
