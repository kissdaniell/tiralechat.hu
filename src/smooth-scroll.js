import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { isTouchDevice } from './motion.js';

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

// How the page scrolls — two ways, and everything else asks this module
// (pauseScroll, scrollPosition, scrollToPosition, atScrollEnd, touchScroller)
// rather than the window or the smoother:
//
//   Mouse / trackpad   ScrollSmoother: the document scrolls, the content
//                      follows smoothly, the stage is pinned (src/stage.js).
//
//   Phones, tablets    The document doesn't scroll at all. #smooth-wrapper
//                      is a full-screen box that scrolls inside itself, and
//                      the stage sticks to its top (CSS position: sticky,
//                      html.touch-scroll in src/style.css). A phone's
//                      browser slides its address / tool bar in and out
//                      only when the document scrolls — which resized the
//                      frame under the pinned scene, let content slip behind
//                      the bar and made the end of the page jump. With
//                      nothing scrolling the document, the bars stay put;
//                      and sticky is held by the browser itself, so nothing
//                      trembles.

// Seconds the page takes to catch up with the scrollbar / wheel.
const SMOOTH = 1;

// In-page links whose target is a moment of a scroll scene rather than an
// element's place on the page (see registerAnchor).
const anchors = new Map();

const wrapper = () => document.querySelector('#smooth-wrapper');

// The box that scrolls on touch devices (null elsewhere).
export const touchScroller = () => (isTouchDevice() ? wrapper() : null);

// Must run before any ScrollTrigger is created: ScrollSmoother makes itself
// the default scroller, and only triggers created after it follow the
// smoothed position. `effects: true` enables data-speed / data-lag
// parallax attributes on anything inside #smooth-content.
export function setupSmoothScroll() {
  // (The address bar's own resizes never rebuild the scene.)
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (isTouchDevice()) document.documentElement.classList.add('touch-scroll');
  else ScrollSmoother.create({ wrapper: '#smooth-wrapper', content: '#smooth-content', smooth: SMOOTH, effects: true });

  // Neither way can the browser's own jump to an in-page anchor reach its
  // target (the scenes are moments of a timeline): route those links here.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || link.hash.length < 2) return;
    const scene = anchors.get(link.hash);
    const smoother = ScrollSmoother.get();
    if (scene) {
      const y = scene();
      if (y == null) return;
      event.preventDefault();
      scrollToPosition(y, true);
    } else if (smoother && document.querySelector(link.hash)) {
      event.preventDefault();
      smoother.scrollTo(document.querySelector(link.hash), true, 'top top');
    }
  });
}

// Lets a scroll scene claim a link: `scrollPosition()` returns where links
// to `hash` should scroll to. Returns a function that releases the claim.
export function registerAnchor(hash, scrollPosition) {
  anchors.set(hash, scrollPosition);
  return () => anchors.delete(hash);
}

// Stops / releases the page's scrolling (the preloader, the lightbox, the
// galleries and the mobile menu hold it still while they're up).
export function pauseScroll(stop) {
  const smoother = ScrollSmoother.get();
  const box = touchScroller();
  if (smoother) smoother.paused(stop);
  else if (box) box.style.overflowY = stop ? 'hidden' : '';
  else document.documentElement.style.overflow = stop ? 'hidden' : '';
}

// Where the page is scrolled to (the smoothed position, where there is one).
export function scrollPosition() {
  return ScrollSmoother.get()?.scrollTop() ?? touchScroller()?.scrollTop ?? scrollY;
}

export function scrollToPosition(y, smooth) {
  const smoother = ScrollSmoother.get();
  const box = touchScroller();
  if (smoother) smoother.scrollTo(y, smooth);
  else (box ?? window).scrollTo({ top: y, behavior: smooth ? 'smooth' : 'instant' });
}

// Whether the page is at its very end.
export function atScrollEnd() {
  const box = touchScroller();
  if (box) return box.scrollTop >= box.scrollHeight - box.clientHeight - 2;
  return scrollY >= document.documentElement.scrollHeight - innerHeight - 2;
}
