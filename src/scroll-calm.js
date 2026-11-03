import { gsap } from 'gsap';
import { scrollPosition } from './smooth-scroll.js';

// While the page is moving, <html> carries .is-scrolling, and the pictures
// don't show their hover (src/style.css): a pointer held still over the
// stream would otherwise tip every picture that slides under it, one after
// another — lots of animation for nothing. They still take the pointer, so a
// click always works. "Moving" follows the smoothed position (ScrollSmoother
// keeps gliding after the wheel stops), and the class goes QUIET_AFTER ms
// after it comes to rest.

const QUIET_AFTER = 80; // ms

export function setupScrollCalm() {
  const root = document.documentElement;
  const position = scrollPosition;
  let last = position();
  let still = 0;
  gsap.ticker.add((time, delta) => {
    const now = position();
    if (Math.abs(now - last) > 0.5) {
      last = now;
      still = 0;
      root.classList.add('is-scrolling');
    } else if (root.classList.contains('is-scrolling') && (still += delta) > QUIET_AFTER) {
      root.classList.remove('is-scrolling');
    }
  });
}
