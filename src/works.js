import { gsap } from 'gsap';
import { MOUTH_INSET, mouthY, portrait } from './hero-scroll.js';

// Layout of the stream, in units of one polaroid image (.work). The PNG
// canvas is 2:3; the card on it covers ~82% of its width and ~78% of its
// height, and is printed already turned about 6° anticlockwise.
const PITCH = 1.08; // card to card along a row, in image widths
const ROW_STEP = 0.86; // the second row below the first, in image heights
const JITTER_X = 0.08; // ± image widths
const JITTER_Y = 0.03; // ± image heights
const PRINTED_TILT = -6; // degrees, already in every image
const TILT = 8; // ± degrees of visible tilt
// Portrait: two columns rising up out of the folder instead of two rows.
const COLUMN_STEP = 1.1; // the second column right of the first, in image widths
const PITCH_Y = 0.82; // card to card up a column, in image heights

// Pixels the stream travels per pixel scrolled.
const SPEED = 1;

// Cards passing under the "Munkáim" title fade down to FADED over one card
// width of travel, starting FADE_LEAD card widths before the title's end,
// so the title stays readable. The row below it passes at full strength.
const FADED = 0.25;
const FADE_LEAD = 0.25;

// The two pictos glide in while the folder turns (seconds after it starts).
const PICTOS_AT = [0.15, 0.45];
const PICTO_DURATION = 1.1;

// The note comes out first and stops NOTE_GAP (share of the frame height)
// left of the folder's mouth; the stream starts once it is mostly out.
const NOTE_DURATION = 1.2;
// ...and goes back in once the last card has come out.
const NOTE_BACK_DURATION = 1;
// The stream counts as "almost gone" when its right end is this share of the
// frame width from the left edge (the next act's title starts then).
const ALMOST_GONE = 0.45;
// Portrait: "almost gone" when its bottom end is this share of the frame
// height from the top.
const ALMOST_GONE_UP = 0.4;
const NOTE_GAP = 0.02;
// Portrait: the note stops with this share of it still inside the folder.
const NOTE_DIP = 0.18;
const STREAM_AFTER_NOTE = 0.6;

// The works' act on the stage. While the folder turns onto the right edge
// the pictos glide in; once it has settled, the note slides out of its mouth
// and stops beside it, then the polaroids drift right to left across the
// frame in two loose rows, under the note, leaving at the left edge without
// stopping. `scrollPerSecond` is the scroll distance of one timeline second,
// which ties the stream's speed to the scroll. Adds the "munkaim" label
// (where links to #munkaim land). Once the last card is out of the folder the
// note goes back in. Returns the beats the next act keys off: `cardsOut`,
// `noteBack`, `almostGone` and `end` (the last card has left).
export function worksChapter(tl, stage, { turning, settled }, scrollPerSecond) {
  const works = stage.querySelector('.works');
  const strip = works.querySelector('.works-strip');
  const cards = gsap.utils.toArray('.work', strip);
  const note = works.querySelector('.works-note');
  const title = [stage.querySelector('.title-next .ink'), stage.querySelector('.title-sub')];

  glideIn(tl, works.querySelector('.works-picto--bandaid'), 'left', turning + PICTOS_AT[0]);
  glideIn(tl, works.querySelector('.works-picto--heart'), 'bottom', turning + PICTOS_AT[1]);

  tl.fromTo(
    note,
    { x: 0, y: 0, rotation: 6 },
    { ...noteOut(stage, note), rotation: 0, duration: NOTE_DURATION, ease: 'power3.out' },
    settled,
  );

  const at = settled + NOTE_DURATION * STREAM_AFTER_NOTE;
  if (!cards.length) return { cardsOut: at, noteBack: at, almostGone: at, end: at };

  const up = portrait();
  layOut(cards, up);
  const stream = streamOf(stage, strip, cards, up);
  const duration = stream.travel() / (SPEED * scrollPerSecond);

  // Shown only while it's on its way (hidden in the stylesheet otherwise):
  // fifteen big pictures aren't kept painted for the rest of the page.
  tl.set(strip, { autoAlpha: 1 }, at)
    .to(
      strip,
      {
        [stream.axis]: () => -stream.travel(),
        duration,
        ease: 'none',
        onUpdate: () => (up ? fadeTowardsTop(cards, title) : fadeUnderTitle(cards, title)),
      },
      at,
    )
    .set(strip, { autoAlpha: 0 }, at + duration);

  // Links land with the stream centred a little left of the middle (the
  // folder takes the right edge); in portrait, a little below the middle.
  tl.addLabel('munkaim', at + duration * stream.centred());

  // When the stream's far end passes a point on its way (px from the frame's
  // left edge, or from its top in portrait).
  const passes = (p) => at + duration * stream.passes(p);
  const cardsOut = passes(up ? mouthY(stage) : stage.offsetWidth - MOUTH_INSET * stage.offsetHeight);

  // With the last card out of the folder, the note goes back in.
  tl.fromTo(
    note,
    { ...noteOut(stage, note), rotation: 0 },
    { x: 0, y: 0, rotation: 6, duration: NOTE_BACK_DURATION, ease: 'power2.in', immediateRender: false },
    cardsOut,
  );

  return {
    cardsOut,
    noteBack: cardsOut + NOTE_BACK_DURATION,
    almostGone: passes(up ? stage.offsetHeight * ALMOST_GONE_UP : stage.offsetWidth * ALMOST_GONE),
    end: at + duration,
  };
}

// A stream of cards on a strip parked inside the folder: right to left, or
// in portrait bottom to top. `travel` is how far the strip goes until its
// last card has left the frame; `centred` / `passes(p)` are shares of that
// trip (when the stream is in the middle, when its far end passes p).
export function streamOf(stage, strip, cards, up) {
  const start = () => (up ? strip.offsetTop : strip.offsetLeft);
  // How far the cards reach from the strip's leading edge, tilt included.
  const reach = () => {
    const s = strip.getBoundingClientRect();
    return up
      ? Math.max(...cards.map((c) => c.getBoundingClientRect().bottom)) - s.top
      : Math.max(...cards.map((c) => c.getBoundingClientRect().right)) - s.left;
  };
  const travel = () => start() + reach();
  const share = (x) => gsap.utils.clamp(0, 1, x);
  return {
    axis: up ? 'y' : 'x',
    travel,
    centred: () => share((start() + reach() / 2 - (up ? stage.offsetHeight * 0.55 : stage.offsetWidth * 0.4)) / travel()),
    passes: (p) => share((start() + reach() - p) / travel()),
  };
}

// Slides an element in from beyond the left or bottom edge of the frame to
// its place in the stylesheet (and keeps it out of sight until then).
function glideIn(tl, el, edge, at) {
  const from =
    edge === 'left'
      ? { x: () => -(el.offsetLeft + el.offsetWidth * 1.2) }
      : { y: () => el.offsetParent.offsetHeight - el.offsetTop + el.offsetHeight * 0.2 };
  tl.fromTo(el, from, { x: 0, y: 0, duration: PICTO_DURATION, ease: 'power3.out' }, at);
}

// How far the parked note has to move to stop just beside the mouth: left
// of it, or in portrait up out of it (see noteOut).
export function noteStop(stage, note) {
  const h = stage.offsetHeight;
  if (portrait()) return mouthY(stage) - (1 - NOTE_DIP) * note.offsetHeight - note.offsetTop;
  const mouth = stage.offsetWidth - MOUTH_INSET * h;
  return mouth - NOTE_GAP * h - note.offsetWidth - note.offsetLeft;
}

// The note's move out of the folder, as tween vars.
export function noteOut(stage, note) {
  return { [portrait() ? 'y' : 'x']: () => noteStop(stage, note) };
}

// Two rows (in portrait two columns), taking turns, each card a little off
// the grid and turned a little. The scatter is fixed per card, so the stream
// looks the same on every visit. All in percent of the card's own size, so
// it scales with it.
function layOut(cards, up) {
  cards.forEach((card, i) => {
    const lane = i % 2;
    const along = Math.floor(i / 2) + lane / 2;
    gsap.set(card, {
      xPercent: ((up ? lane * COLUMN_STEP : along * PITCH) + JITTER_X * scatter(i, 1)) * 100,
      yPercent: ((up ? along * PITCH_Y : lane * ROW_STEP) + JITTER_Y * scatter(i, 2)) * 100,
      rotation: TILT * scatter(i, 3) - PRINTED_TILT,
    });
  });
}

// A fixed pseudo-random number in -1…1 for card i (salt picks the property).
function scatter(i, salt) {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

// Where the picture sits inside a polaroid image (its transparent margin).
const POLAROID = { x: 0.09, y: 0.1, width: 0.82 };

// Fades each card by how much of the title's height (with the line under it)
// it covers and by how far it has moved in past the title's right end.
// `inside` is where the picture sits in the card's box (shares of it).
export function fadeUnderTitle(cards, title, inside = POLAROID) {
  const rects = title.map((el) => el.getBoundingClientRect());
  const t = {
    top: Math.min(...rects.map((r) => r.top)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
    right: Math.max(...rects.map((r) => r.right)),
  };
  t.height = t.bottom - t.top;
  const boxes = cards.map((c) => c.getBoundingClientRect());

  boxes.forEach((b, i) => {
    const top = b.top + b.height * inside.y;
    const bottom = b.bottom - b.height * inside.y;
    const left = b.left + b.width * inside.x;
    const width = b.width * inside.width;

    const covers = Math.max(0, Math.min(bottom, t.bottom) - Math.max(top, t.top)) / t.height;
    const entered = (t.right - left) / width + FADE_LEAD;
    const fade = smooth(covers * 2) * smooth(entered);
    cards[i].style.setProperty('--opacity', 1 - (1 - FADED) * fade);
  });
}

// Portrait: the cards stay sharp until they near the top, and fade down to
// FADE_MIN at the top of the screen, while a point FADE_POINT down the picture
// rises that far. They start fading at the middle of the title where they
// pass under it, and only at the header's bottom where they don't (the right
// side) — in between by how much of their width is under the title. (Not the
// picture's middle: on a tall painting that is still far down while its top
// is already at the logo.)
const FADE_POINT = 0.2;
const FADE_MIN = 0.3;

export function fadeTowardsTop(cards, title, inside = POLAROID) {
  const header = document.querySelector('.site-header').getBoundingClientRect().bottom;
  const rects = title.map((el) => el.getBoundingClientRect()).filter((r) => r.width);
  const t = {
    left: Math.min(...rects.map((r) => r.left)),
    right: Math.max(...rects.map((r) => r.right)),
    middle: (Math.min(...rects.map((r) => r.top)) + Math.max(...rects.map((r) => r.bottom))) / 2,
  };
  cards.forEach((card) => {
    const b = card.getBoundingClientRect();
    const left = b.left + b.width * inside.x;
    const width = b.width * inside.width;
    const under = gsap.utils.clamp(0, 1, (Math.min(left + width, t.right) - Math.max(left, t.left)) / width);
    const from = header + (t.middle - header) * under;
    const point = b.top + b.height * (inside.y + (1 - 2 * inside.y) * FADE_POINT);
    card.style.setProperty('--opacity', FADE_MIN + (1 - FADE_MIN) * smooth(point / Math.max(1, from)));
  });
}

function smooth(x) {
  const t = gsap.utils.clamp(0, 1, x);
  return t * t * (3 - 2 * t);
}
