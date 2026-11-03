import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { offsetIn, portrait, waveByX } from './hero-scroll.js';
import { atScrollEnd } from './smooth-scroll.js';
import { t } from './i18n.js';
import { every, tremble, whileShown } from './jitter.js';
import { loopPoses, stickOn } from './hero-life.js';

// The contact act ("Mikor jössz?"), after the news (on scroll): the news
// photos fly out and the pictos swap; Kriszti steps a little to the left and
// becomes a stack of poses that keeps changing like the hero's; five tattoo
// stickers glide in around her; the title goes back to the hero's spot as
// "Mikor jössz?", with where she works, her e-mail (copied on click) and
// her socials under it. Once there, the title takes turns between its three
// texts.

const PAUSE = 0.8;
const OUT_DURATION = 1.1;
const PICTO_DURATION = 1.1;
const TITLE_DURATION = 2.2;
const MOVE_DURATION = 1.4;
const STICKER_DURATION = 1.1;
const STICKER_STAGGER = 0.2;

// The title's texts take turns every CYCLE_EVERY seconds.
const CYCLE_EVERY = 3.5;

// Returns { end, stop } — stop() ends the time-based parts (stage cleanup).
export function contactChapter(tl, stage, at) {
  const contact = stage.querySelector('.contact');
  const news = stage.querySelector('.news');
  const start = at + PAUSE;

  // The news photos fly off, each to its nearer side, turning.
  gsap.utils.toArray('.news-item', news).forEach((item, i) => {
    const left = item.offsetLeft + item.offsetWidth / 2 < stage.offsetWidth * 0.45;
    tl.to(
      item,
      {
        // Far enough that the caption beside the photo leaves too.
        x: () => (left ? -(item.offsetLeft + item.offsetWidth * 2.4) : stage.offsetWidth - item.offsetLeft + item.offsetWidth * 0.3),
        y: () => stage.offsetHeight * 0.15,
        rotation: `+=${left ? -18 : 18}`,
        duration: OUT_DURATION,
        ease: 'power2.in',
      },
      start + i * 0.08,
    );
  });

  // Pictos: the news' two leave, the contact's two arrive. Parked off the
  // frame together with whatever hangs out of them (the cat's "Na?!").
  const off = {
    up: (el) => ({ y: () => -(el.offsetTop + el.offsetHeight * 1.2 + overhang(el).down) }),
    down: (el) => ({ y: () => stage.offsetHeight - el.offsetTop + el.offsetHeight * 0.2 + overhang(el).up }),
    left: (el) => ({ x: () => -(el.offsetLeft + el.offsetWidth * 1.2 + overhang(el).right) }),
    right: (el) => ({ x: () => stage.offsetWidth - el.offsetLeft + el.offsetWidth * 0.2 + overhang(el).left }),
  };
  const smiley = news.querySelector('.news-picto--smiley');
  const bandaid = news.querySelector('.news-picto--bandaid');
  const crown = contact.querySelector('.contact-picto--crown');
  const cat = contact.querySelector('.contact-picto--cat');
  tl.to(smiley, { ...off.down(smiley), duration: PICTO_DURATION, ease: 'power3.in' }, start)
    .to(bandaid, { ...off.left(bandaid), duration: PICTO_DURATION, ease: 'power3.in' }, start + 0.1)
    .fromTo(crown, off.down(crown), { y: 0, duration: PICTO_DURATION, ease: 'power3.out' }, start + 0.6)
    .fromTo(cat, off.right(cat), { x: 0, duration: PICTO_DURATION, ease: 'power3.out' }, start + 0.8);

  // Kriszti steps left to her contact spot…
  const portrait = news.querySelector('.news-portrait');
  const stack = contact.querySelector('.contact-stack');
  tl.to(portrait, { x: () => stack.offsetLeft - portrait.offsetLeft, duration: MOVE_DURATION, ease: 'power2.inOut' }, start + 0.2);
  // …where her contact pictures are stuck onto her like the hero's poses, and
  // the one she came with fades away. The scroll moves only the stack as a
  // whole; the pictures inside it belong to the pose loop (loopPoses), so the
  // two never pull at the same picture — even when a fast scroll makes the
  // scene catch up while the loop is already running.
  const arrived = start + 0.2 + MOVE_DURATION;
  stickOn(tl, stack, 0, arrived, { last: true, behind: portrait });

  // The stickers glide in from their edges, one after another.
  const stickersAt = start + 0.9;
  gsap.utils.toArray('.contact-sticker', contact).forEach((sticker, i) => {
    const from = sticker.dataset.from === 'right' ? off.right(sticker) : off.left(sticker);
    const t = stickersAt + i * STICKER_STAGGER;
    tl.set(sticker, { autoAlpha: 1 }, t).fromTo(
      sticker,
      from,
      { x: 0, duration: STICKER_DURATION, ease: 'power3.out', immediateRender: false },
      t,
    );
  });

  const titleAt = start + 0.3;
  const cycleLine = retitle(tl, stage, titleAt);

  // Where / e-mail / socials settle in under the title.
  const info = contact.querySelector('.contact-info');
  const infoAt = titleAt + TITLE_DURATION - 0.4;
  tl.fromTo(info, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, infoAt)
    .fromTo(contact.querySelector('.contact-copyright'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7 }, infoAt + 0.3);

  const end = Math.max(infoAt + 0.7, stickersAt + 4 * STICKER_STAGGER + STICKER_DURATION);
  tl.addLabel('kapcsolat', end);

  const stops = [cycleTitle(cycleLine), loopPoses(stack), liveContact(contact), nothingBelow(contact, tl)];
  return { end, stop: () => stops.forEach((stop) => stop()) };
}

// "Mi újság / Kattints…" goes back to the hero's spot (the title block at
// rest) and dissolves into "Mikor jössz?". Returns the cycling line.
function retitle(tl, stage, at) {
  const lead = stage.querySelector('.title-lead');
  const lines = lead.querySelectorAll('.title-next');
  const newsTitle = lines[4];
  const cycleLine = lead.querySelector('.title-cycle');
  const newsSub = lead.querySelectorAll('.title-sub')[3];
  const out = [...newsTitle.querySelector('.ink').children];
  const inks = gsap.utils.toArray('.ink', cycleLine);
  const [first, ...rest] = inks.map((ink) => SplitText.create(ink, { type: 'chars', tag: 'span' }).chars);
  gsap.set(rest.flat(), { opacity: 0 });

  tl.to(lead, portrait() ? uprightBeside(stage, lead, cycleLine) : { x: 0, y: 0, rotation: 0, duration: TITLE_DURATION, ease: 'power2.inOut' }, at)
    .addLabel('t-kapcsolat', at + 0.75)
    .fromTo(
      out,
      { opacity: 1, yPercent: 0, filter: 'blur(0em)' },
      { opacity: 0, yPercent: -25, filter: 'blur(0.08em)', duration: 0.7, ease: 'power1.in', stagger: waveByX(out, 0.5), immediateRender: false },
      at + 0.3,
    )
    .to(newsSub, { autoAlpha: 0, y: -10, duration: 0.5, ease: 'power1.in' }, at + 0.3)
    // The whole line shows from here on (so nothing of it is ever seen in
    // the earlier acts, whichever text it's on)…
    .fromTo(cycleLine, { opacity: 0 }, { opacity: 1, duration: 0.01 }, at + 0.74)
    // …and its first text forms.
    .fromTo(
      first,
      { opacity: 0, yPercent: 25, filter: 'blur(0.08em)' },
      { opacity: 1, yPercent: 0, filter: 'blur(0em)', duration: 0.7, ease: 'power1.out', stagger: waveByX(first, 0.4) },
      at + 0.75,
    );
  return cycleLine;
}

// Portrait: the title block's move that turns the cycling line to
// --contact-title-turn round its own middle and stands that middle at
// --contact-title-x / -y (shares of the width / height; src/style.css).
function uprightBeside(stage, lead, line) {
  const v = (name, fallback) => parseFloat(getComputedStyle(stage).getPropertyValue(name)) || fallback;
  const middle = () => ({ x: line.offsetLeft + line.offsetWidth / 2, y: line.offsetTop + line.offsetHeight / 2 });
  const place = () => {
    const home = offsetIn(lead, stage);
    const m = middle();
    return {
      x: v('--contact-title-x', 0.14) * stage.offsetWidth - (home.x + m.x),
      y: v('--contact-title-y', 0.62) * stage.offsetHeight - (home.y + m.y),
    };
  };
  return {
    transformOrigin: () => `${middle().x}px ${middle().y}px`,
    x: () => place().x,
    y: () => place().y,
    rotation: () => v('--contact-title-turn', -80),
    duration: TITLE_DURATION,
    ease: 'power2.inOut',
  };
}

// Every CYCLE_EVERY seconds the title's text dissolves into the next one,
// letter by letter. When the line isn't on screen (scrolled back), it goes
// back to its first text, so the scroll finds it as it left it.
function cycleTitle(line) {
  const texts = gsap.utils.toArray('.ink', line).map((ink) => [...ink.children]);
  let shown = 0;

  const stop = every([CYCLE_EVERY, CYCLE_EVERY], (done) => {
    if (parseFloat(getComputedStyle(line).opacity) < 0.99) {
      if (shown) {
        gsap.set(texts.slice(1).flat(), { opacity: 0 });
        gsap.set(texts[0], { opacity: 1, yPercent: 0, filter: 'blur(0em)' });
        shown = 0;
      }
      return gsap.delayedCall(0, done);
    }
    const out = texts[shown];
    shown = (shown + 1) % texts.length;
    const into = texts[shown];
    return gsap
      .timeline({ onComplete: done })
      .to(out, { opacity: 0, yPercent: -25, filter: 'blur(0.08em)', duration: 0.6, ease: 'power1.in', stagger: waveByX(out, 0.4) })
      .fromTo(
        into,
        { opacity: 0, yPercent: 25, filter: 'blur(0.08em)' },
        { opacity: 1, yPercent: 0, filter: 'blur(0em)', duration: 0.6, ease: 'power1.out', stagger: waveByX(into, 0.4) },
        0.35,
      );
  });

  return stop;
}

// The arrow over the address trembles while it's on screen.
function liveContact(contact) {
  const arrow = contact.querySelector('.contact-arrow');
  return whileShown(arrow, () => tremble(arrow, { px: 2, deg: 4 }));
}

// How far an element's children stick out of its box on each side (layout
// positions, so transforms don't count).
function overhang(el) {
  const out = { left: 0, right: 0, up: 0, down: 0 };
  for (const c of el.children) {
    out.left = Math.max(out.left, -c.offsetLeft);
    out.right = Math.max(out.right, c.offsetLeft + c.offsetWidth - el.offsetWidth);
    out.up = Math.max(out.up, -c.offsetTop);
    out.down = Math.max(out.down, c.offsetTop + c.offsetHeight - el.offsetHeight);
  }
  return out;
}

// Trying to scroll on at the very end (wheel, keys, a swipe up) makes the
// strawberry say there's nothing more; it stays while the tries go on, and
// a moment after the last one it's gone again.
const END_BUBBLE_STAYS = 2;

function nothingBelow(contact, scene) {
  const bubble = contact.querySelector('.end-bubble');
  const words = bubble.querySelector('.end-bubble-text');
  // While it talks, the strawberry (and the act with it) comes to the very
  // top, so nothing covers the bubble.
  const onTop = [contact, bubble.closest('.contact-sticker')];
  let shown = false;
  let hide;
  let still;

  const atEnd = () =>
    scene.progress() > 0.995 && atScrollEnd();

  const pop = () => {
    if (!atEnd()) return;
    hide?.kill();
    hide = gsap.delayedCall(END_BUBBLE_STAYS, close);
    if (shown) return;
    shown = true;
    gsap.set(onTop, { zIndex: (i) => 60 + i });
    gsap.set(bubble, { autoAlpha: 1 });
    gsap.fromTo(bubble, { scale: 0.1, rotation: -18 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'elastic.out(1, 0.55)', overwrite: true });
    gsap.fromTo(words, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.35, delay: 0.25, ease: 'back.out(2)' });
    still = tremble(words, { px: 1.5, deg: 1.5 });
  };
  const close = () => {
    shown = false;
    still?.();
    gsap.to(bubble, {
      scale: 0.1,
      rotation: -18,
      autoAlpha: 0,
      duration: 0.35,
      ease: 'power2.in',
      overwrite: true,
      onComplete: () => gsap.set(onTop, { clearProps: 'zIndex' }),
    });
  };

  const onWheel = (e) => e.deltaY > 0 && pop();
  const onKey = (e) => ['ArrowDown', 'PageDown', 'End', ' '].includes(e.key) && pop();
  let touchY = 0;
  const onTouchStart = (e) => (touchY = e.touches[0].clientY);
  const onTouchMove = (e) => e.touches[0].clientY < touchY - 10 && pop();

  addEventListener('wheel', onWheel, { passive: true });
  addEventListener('keydown', onKey);
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: true });
  return () => {
    removeEventListener('wheel', onWheel);
    removeEventListener('keydown', onKey);
    removeEventListener('touchstart', onTouchStart);
    removeEventListener('touchmove', onTouchMove);
    hide?.kill();
    if (shown) close();
  };
}

// A click on the address copies it, and the note under it says so for a
// while. Works without the scene too.
export function setupContactCopy() {
  // The copyright's year is always this year.
  document.querySelectorAll('.copyright-year').forEach((el) => (el.textContent = new Date().getFullYear()));

  // Every address to copy (the contact's and the mobile menu's): once
  // copied, the address itself reads "másolva" for a moment — same tag,
  // same width.
  document.querySelectorAll('[data-copy]').forEach((mail) => {
    const address = mail.textContent;
    let reset;
    mail.addEventListener('click', () =>
      copy(mail.dataset.copy).then(() => {
        mail.style.minWidth = `${mail.offsetWidth}px`;
        mail.textContent = t('másolva');
        gsap.fromTo(mail, { scale: 0.9 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
        reset?.kill();
        reset = gsap.delayedCall(COPIED_FOR, () => {
          mail.textContent = address;
          mail.style.minWidth = '';
        });
      }, () => {}),
    );
  });
}

// How long the address reads "másolva".
const COPIED_FOR = 1.6;

// The Clipboard API where allowed, the old way otherwise.
function copy(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
  return legacyCopy(text);
}

function legacyCopy(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.cssText = 'position:fixed;opacity:0';
  document.body.append(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
}
