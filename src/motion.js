// The media queries the page's motion is switched by.
//
// They used to be '(prefers-reduced-motion: no-preference)' / '(…: reduce)'.
// But this page is one scroll-driven scene (a pinned stage whose acts are
// played by the scroll); with the motion left out there is no still version
// that works — the content never gets to its place. So, at the owner's
// request, it plays whatever the device's reduced-motion setting says:
// MOTION always matches, NO_MOTION never does. To honour the setting again,
// put the two queries back here.
export const MOTION = 'all';
export const NO_MOTION = 'not all';

// A phone or tablet: a finger, no mouse. (Laptops with a touch screen as
// well as a mouse don't count.) Decided once, when first asked: the way the
// page scrolls is set up for one kind of device (src/smooth-scroll.js) and
// can't change under a built scene. Should the kind really change while the
// page is open (in practice: a browser's device emulation switched on or
// off), the page starts over.
const TOUCH = '(hover: none) and (pointer: coarse)';
let touch;
export const isTouchDevice = () => (touch ??= matchMedia(TOUCH).matches);
export function restartOnDeviceChange() {
  isTouchDevice();
  matchMedia(TOUCH).addEventListener('change', () => location.reload());
}

// Phones' browsers slide their address bar in and out while the page is
// scrolled, and with it the height of the screen — and of every dvh. A
// layout that follows that keeps re-flowing under the finger (Firefox does it
// even at the end of the page). So the height the layout is built on is
// taken once, as --vh (1% of the height, in px), and only taken again when
// the window really changes (src/stage.js); the stylesheet's portrait view
// is written in it. On other devices it simply follows the window.
export function freezeViewport() {
  document.documentElement.style.setProperty('--vh', `${innerHeight / 100}px`);
}
