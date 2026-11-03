import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { registerAnchor, scrollPosition, scrollToPosition, touchScroller } from './smooth-scroll.js';
import { heroChapter, portrait } from './hero-scroll.js';
import { worksChapter } from './works.js';
import { designsChapter } from './designs.js';
import { backpieceChapter } from './backpiece.js';
import { paintingsChapter } from './paintings.js';
import { newsChapter } from './news.js';
import { contactChapter } from './contact.js';
import { actSubs, cornerPicto } from './corner-picto.js';
import { nearAct } from './late-images.js';
import { MOTION, freezeViewport, isTouchDevice } from './motion.js';

gsap.registerPlugin(ScrollTrigger);

// Scroll distance per second of the stage timeline, in viewport heights.
const SCROLL_PER_SECOND = 0.5;
// Under a finger the same swipe covers far more of the page than a turn of
// the wheel does, so on touch devices the acts take this much more scroll.
// (The picture streams keep their one pixel per pixel scrolled.)
const TOUCH_STRETCH = 1.7;
// In the portrait view the acts hold fewer things, and the changes between
// them felt long: they take this share of the scroll there.
const PORTRAIT_PACE = 0.72;
const scrollPerSecond = () =>
  SCROLL_PER_SECOND * (isTouchDevice() ? TOUCH_STRETCH : 1) * (portrait() ? PORTRAIT_PACE : 1);
// A last beat on the final frame before the stage lets go.
const HOLD = 0.4;
// After the window stops changing size for this long, the scene is rebuilt.
const REBUILD_AFTER = 250; // ms
const REST_CHECK = 350; // ms between two looks at whether the page still moves
// The labels the acts after the hero put on the timeline where each of them
// begins (its title forms), in order.
const ACTS = ['t-munkaim', 't-foglalhato', 't-firkaim', 't-miujsag', 't-kapcsolat'];

// The stage (.stage) is pinned while one scrubbed timeline plays its acts
// one after another: the hero (src/hero-scroll.js), then the works
// (src/works.js) and the rest. The pin lasts as long as the timeline, so an
// act can be added or lengthened without retuning the scroll length.
//
// Everything is measured from the layout when the scene is built, and the
// layout depends on the window's shape (src/style.css: wide / compact), so
// when the window is resized or the device turned, the whole scene is torn
// down and built again for the new size, and the reader is put back at the
// same moment of it.
export function setupStage() {
  const stage = document.querySelector('.stage');
  const root = document.documentElement;
  let mm;
  let scene = null;

  // The later acts come into the layout now (they were kept out of it while
  // the first screen loaded: index.html, html.scene-waiting), still unseen
  // (html.scene-pending) until the build has put them where they start.
  // Their pictures are blanks of the right shape until src/late-images.js
  // loads them, which is all that measuring them needs.
  root.classList.remove('scene-waiting');

  const build = () => {
    mm = gsap.matchMedia();
    mm.add(MOTION, () => {
      // Also set before first paint (index.html); kept in sync here in case
      // the motion preference changes while the page is open.
      root.classList.add('has-scene');

      const tl = gsap.timeline({ paused: true });
      const folder = heroChapter(tl, stage);
      const works = worksChapter(tl, stage, folder, innerHeight * scrollPerSecond());
      const designsDone = designsChapter(tl, stage, works);
      const backDone = backpieceChapter(tl, stage, designsDone);
      const paintings = paintingsChapter(tl, stage, backDone, innerHeight * scrollPerSecond());
      const newsDone = newsChapter(tl, stage, paintings);
      const contact = contactChapter(tl, stage, newsDone);
      tl.to({}, { duration: HOLD });
      const corner = cornerPicto(tl, stage);
      root.classList.remove('scene-pending');
      const subs = actSubs(tl, stage);

      const length = () => innerHeight * scrollPerSecond() * tl.duration();
      // On touch devices the stage isn't pinned: it sticks to the top of the
      // box that scrolls (src/smooth-scroll.js), and a spacer after it gives
      // that box the scene's length to scroll through.
      const box = touchScroller();
      let spacer = null;
      if (box) {
        spacer = document.createElement('div');
        spacer.className = 'stage-spacer';
        spacer.style.height = `${length()}px`;
        stage.after(spacer);
      }
      // As the reader moves on: the pictures of the act they have got to,
      // and of the next one, are asked for at once (src/late-images.js).
      const onUpdate = ({ progress }) =>
        progress > 0 && nearAct(ACTS.filter((label) => progress * tl.duration() >= tl.labels[label]).length);
      const st = ScrollTrigger.create(
        box
          ? // (No invalidateOnRefresh here: without a pin nothing re-renders the
            // timeline after it, and the acts' starting states would be left
            // half undone. The scene is rebuilt on a real resize anyway.)
            { scroller: box, start: 0, end: 'max', scrub: true, animation: tl, onUpdate }
          : {
              trigger: stage,
              start: 'top top',
              end: () => `+=${length()}`,
              pin: true,
              // No lag of its own: ScrollSmoother already smooths the scroll
              // this follows (two layers of smoothing would make the scene
              // float).
              scrub: true,
              invalidateOnRefresh: true,
              animation: tl,
              onUpdate,
            },
      );
      scene = st;

      // Everything lives inside the pinned stage, so these links mean
      // moments of the timeline rather than places on the page.
      const anchors = [
        registerAnchor('#hello', () => 0),
        registerAnchor('#munkaim', () => st.labelToScroll('munkaim')),
        registerAnchor('#foglalhato', () => st.labelToScroll('foglalhato')),
        registerAnchor('#festmenyek', () => st.labelToScroll('festmenyek')),
        registerAnchor('#mi-ujsag', () => st.labelToScroll('miujsag')),
        registerAnchor('#kapcsolat', () => st.labelToScroll('kapcsolat')),
      ];

      return () => {
        anchors.forEach((release) => release());
        contact.stop();
        spacer?.remove();
        corner();
        subs();
        scene = null;
        root.classList.remove('has-scene');
      };
    });
  };

  build();

  // Where the reader is, as a moment between two marks of the timeline (its
  // labels, the acts): the timeline's length depends on the size (the
  // streams), so a bare percentage would land in another act after a rebuild.
  const marks = (tl) => [0, ...Object.values(tl.labels), tl.duration()].sort((a, b) => a - b);
  const whereAmI = () => {
    const tl = scene.animation;
    const at = marks(tl);
    const i = Math.max(0, at.findLastIndex((t) => t <= tl.time()));
    const next = at[Math.min(i + 1, at.length - 1)];
    return { i, share: next > at[i] ? (tl.time() - at[i]) / (next - at[i]) : 0 };
  };
  const goBack = ({ i, share }) => {
    const tl = scene.animation;
    const at = marks(tl);
    const from = at[Math.min(i, at.length - 1)];
    const time = from + share * (at[Math.min(i + 1, at.length - 1)] - from);
    const y = scene.start + (time / tl.duration()) * (scene.end - scene.start);
    scrollToPosition(y, false);
    ScrollTrigger.update();
  };

  // Rebuild after a real change of size. On phones the browser bars come and
  // go while scrolling (a small height change at the same width): that's
  // not worth a rebuild. The place is taken at the first resize event,
  // before ScrollTrigger's own refresh has moved anything.
  let size = [innerWidth, innerHeight];
  let timer;
  let place = null;
  const rebuild = (saved) => {
    size = [innerWidth, innerHeight];
    freezeViewport();
    mm.revert();
    // GSAP remembers each element's transform from the first time it read
    // it; the hero's notes and stickers are turned differently per view in
    // the stylesheet (the arrow by "Ő itt Tira."), so that memory goes.
    gsap.set(stage.querySelectorAll('.hero [data-enter], .hero [data-exit]'), { clearProps: 'transform' });
    build();
    ScrollTrigger.refresh();
    if (scene && saved) goBack(saved);
  };
  // Once the page has stopped moving (for touch devices' small changes of
  // height: a browser bar that slid away after all — rebuilding under a
  // moving finger would stutter, but the frame mustn't stay short of the
  // screen either).
  const whenAtRest = (run) => {
    let last = scrollPosition();
    const check = () => {
      const now = scrollPosition();
      if (now !== last) {
        last = now;
        timer = setTimeout(check, REST_CHECK);
      } else run();
    };
    timer = setTimeout(check, REST_CHECK);
  };
  addEventListener('resize', () => {
    if (!place && scene) place = whereAmI();
    clearTimeout(timer);
    timer = setTimeout(() => {
      const [w, h] = size;
      if (innerWidth === w && innerHeight === h) return (place = null);
      const small = isTouchDevice() && innerWidth === w && Math.abs(innerHeight - h) < h * 0.15;
      const go = () => {
        const saved = small && scene ? whereAmI() : place;
        place = null;
        if (innerWidth === size[0] && innerHeight === size[1]) return;
        rebuild(saved);
      };
      if (small) whenAtRest(go);
      else go();
    }, REBUILD_AFTER);
  });

  // For a build that had to go ahead on something not final (main.js: a
  // webfont that was very late): builds the scene again where the reader is.
  return { rebuild: () => rebuild(scene ? whereAmI() : null) };
}
