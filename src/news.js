import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { FOLDER_MOUTH, MOUTH_INSET, edgeSpot, folderBox, mouthY, offsetIn, portrait, streamDrop, waveByX } from './hero-scroll.js';

// The news act ("Mi újság"), keyed off the paintings' beats (all on scroll):
// once the pins' note is back in the folder, a hand comes in from the right,
// grabs the folder and pulls it off the right edge, and Kriszti steps in
// there; the pictos swap again; as the last pictures leave, "Firkáim" goes
// to the middle of the frame left of her and turns into "Mi újság"; then the
// four news pop up around it.

const HAND_IN = 1;
const PULL = 1.2;
const PORTRAIT_IN = 1.2;
const PICTO_DURATION = 1.1;
const TITLE_DURATION = 2.2;

// Where the title's middle lands: x as a share of the room left of Kriszti
// (from the frame's left edge to hers), y as a share of the frame's height.
// Set in the stylesheet (--title-x / --title-y on .news), per view.
const titleAt = (news) => {
  const cs = getComputedStyle(news);
  return { x: parseFloat(cs.getPropertyValue('--title-x')) || 0.56, y: parseFloat(cs.getPropertyValue('--title-y')) || 0.7 };
};

// The hand's fingertips (on its left) reach this far over the folder's
// mouth (share of the frame width) before it pulls.
const GRIP = 0.012;
const REACH = 0.357;
// Portrait: the hand (turned, fingers up) comes up from the bottom until its
// fingers reach over the folder's mouth by this share of the turned hand's
// height.
const PORTRAIT_GRIP = 0.3;

const NEWS_DURATION = 0.9;
const NEWS_STAGGER = 0.25;

export function newsChapter(tl, stage, paintings) {
  const news = stage.querySelector('.news');
  const folder = gsap.utils.toArray('.folder', stage);
  const hand = stage.querySelector('.folder-hand');

  const handAt = paintings.noteBack;
  const pullAt = handAt + HAND_IN;
  if (portrait()) pullDown(tl, stage, hand, folder, handAt, pullAt);
  else {
    // The hand comes in from the right until its fingertips are on the mouth…
    // (Its fingers reach REACH of its own width over the mouth.)
    const mouth = () => stage.offsetWidth - MOUTH_INSET * stage.offsetHeight - REACH * hand.offsetWidth;
    const grab = () => mouth() + GRIP * stage.offsetWidth - hand.offsetLeft;
    // (Its turn is set here, not in the stylesheet: GSAP bakes a CSS rotate
    // into the element's transform, which then outlives a switch of view.)
    tl.fromTo(hand, { x: 0, y: () => streamDrop(stage), rotation: 0 }, { x: grab, duration: HAND_IN, ease: 'power3.out' }, handAt);

    // …and pulls the folder off to the right, until the part of it sticking
    // out left of the mouth (the back and its papers) is gone too.
    const pull = () => stage.offsetWidth - mouth() + FOLDER_MOUTH * folderBox(stage).height + 0.05 * stage.offsetWidth;
    tl.to(hand, { x: () => grab() + pull(), duration: PULL, ease: 'power2.in' }, pullAt).to(
      folder,
      { x: () => edgeSpot(stage).x + pull(), duration: PULL, ease: 'power2.in' },
      pullAt,
    );
  }

  // Kriszti steps in on the right edge.
  const kriszti = news.querySelector('.news-portrait');
  const portraitAt = pullAt + PULL;
  tl.set(kriszti, { autoAlpha: 1 }, portraitAt).fromTo(
    kriszti,
    { x: () => stage.offsetWidth - kriszti.offsetLeft },
    { x: 0, duration: PORTRAIT_IN, ease: 'power3.out', immediateRender: false },
    portraitAt,
  );

  // The pictos swap: the crown goes up, the heart left; the smiley drops in,
  // the bandaid slides in from the left.
  const crown = stage.querySelector('.paintings-picto--crown');
  const heart = stage.querySelector('.paintings-picto--heart');
  const smiley = news.querySelector('.news-picto--smiley');
  const bandaid = news.querySelector('.news-picto--bandaid');
  const off = {
    up: (el) => ({ y: () => -(el.offsetTop + el.offsetHeight * 1.2) }),
    left: (el) => ({ x: () => -(el.offsetLeft + el.offsetWidth * 1.2) }),
  };
  tl.to(crown, { ...off.up(crown), duration: PICTO_DURATION, ease: 'power3.in' }, handAt)
    .to(heart, { ...off.left(heart), duration: PICTO_DURATION, ease: 'power3.in' }, handAt + 0.1)
    .fromTo(smiley, off.up(smiley), { y: 0, duration: PICTO_DURATION, ease: 'power3.out' }, handAt + 0.6)
    .fromTo(bandaid, off.left(bandaid), { x: 0, duration: PICTO_DURATION, ease: 'power3.out' }, handAt + 0.8);

  const titleAt = paintings.almostGone;
  retitle(tl, stage, titleAt);

  // The news pop up around the title once it has arrived and Kriszti is in.
  const newsAt = Math.max(titleAt + TITLE_DURATION - 0.3, portraitAt + PORTRAIT_IN * 0.6);
  const items = gsap.utils.toArray('.news-item', news);
  items.forEach((item, i) => {
    const at = newsAt + i * NEWS_STAGGER;
    tl.set(item, { autoAlpha: 1 }, at).fromTo(
      item,
      { opacity: 0, scale: 0.4 },
      { opacity: 1, scale: 1, duration: NEWS_DURATION, ease: 'back.out(1.6)', immediateRender: false },
      at,
    );
  });

  const end = newsAt + (items.length - 1) * NEWS_STAGGER + NEWS_DURATION;
  tl.addLabel('miujsag', end);
  return end;
}

// Portrait: the folder is docked at the bottom, so the hand (turned 90°,
// fingers up) comes up from below, grabs its front cover and
// pulls it down out of the frame, papers and all.
function pullDown(tl, stage, hand, folder, handAt, pullAt) {
  // The turned hand's top (its fingertips), from its layout box.
  const tips = () => hand.offsetTop + hand.offsetHeight / 2 - hand.offsetWidth / 2;
  const grab = () => mouthY(stage) - PORTRAIT_GRIP * hand.offsetWidth - tips();
  const pull = () =>
    stage.offsetHeight - mouthY(stage) + FOLDER_MOUTH * folderBox(stage).height + 0.05 * stage.offsetHeight;
  tl.fromTo(hand, { x: 0, y: 0, rotation: 90 }, { y: grab, duration: HAND_IN, ease: 'power3.out' }, handAt)
    .to(hand, { y: () => grab() + pull(), duration: PULL, ease: 'power2.in' }, pullAt)
    .to(folder, { y: () => edgeSpot(stage).y + pull(), duration: PULL, ease: 'power2.in' }, pullAt);
}

// "Firkáim / Festek, rajzolok…" moves to the middle of the frame left of
// Kriszti and dissolves into "Mi újság / Kattints a részletekért".
function retitle(tl, stage, at) {
  const lead = stage.querySelector('.title-lead');
  const lines = lead.querySelectorAll('.title-next');
  const subs = lead.querySelectorAll('.title-sub');
  const [doodles, newsTitle] = [lines[3], lines[4]];
  const [doodlesSub, newsSub] = [subs[2], subs[3]];
  const out = [...doodles.querySelector('.ink').children];
  const into = SplitText.create(newsTitle.querySelector('.ink'), { type: 'chars', tag: 'span' }).chars;
  gsap.set(newsTitle, { opacity: 1 });

  // The block's x/y that puts the middle of the "Mi újság" line at TITLE_AT.
  // The line is slanted by its own CSS rotation round its left middle.
  const spot = () => {
    const home = offsetIn(newsTitle, stage);
    const w = newsTitle.offsetWidth;
    const m = new DOMMatrix(getComputedStyle(newsTitle).transform);
    const turn = Math.atan2(m.b, m.a);
    const mx = home.x + (w / 2) * Math.cos(turn);
    const my = home.y + newsTitle.offsetHeight / 2 + (w / 2) * Math.sin(turn);
    // In portrait Kriszti is at the bottom: the room is the whole width.
    const room = portrait() ? stage.offsetWidth : stage.querySelector('.news-portrait').offsetLeft;
    const at = titleAt(stage.querySelector('.news'));
    return { x: at.x * room - mx, y: at.y * stage.offsetHeight - my };
  };

  tl.to(lead, { x: () => spot().x, y: () => spot().y, duration: TITLE_DURATION, ease: 'power2.inOut' }, at)
    .addLabel('t-miujsag', at + 0.75)
    .fromTo(
      out,
      { opacity: 1, yPercent: 0, filter: 'blur(0em)' },
      { opacity: 0, yPercent: -25, filter: 'blur(0.08em)', duration: 0.7, ease: 'power1.in', stagger: waveByX(out, 0.5), immediateRender: false },
      at + 0.3,
    )
    .to(doodlesSub, { autoAlpha: 0, y: -10, duration: 0.5, ease: 'power1.in' }, at + 0.3)
    .fromTo(
      into,
      { opacity: 0, yPercent: 25, filter: 'blur(0.08em)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0em)', duration: 0.7, ease: 'power1.out', stagger: waveByX(into, 0.4) },
      at + 0.75,
    )
    .fromTo(newsSub, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' }, at + TITLE_DURATION - 0.5);
}
