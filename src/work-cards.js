import { gsap } from 'gsap';

// The polaroids in the works gallery, the designs and the paintings: each
// tips a little on hover (like the hero's tattoo stickers). A click opens
// the lightbox (src/lightbox.js).

// Hover: a turn of TURN degrees either way and a touch of scale, fixed per
// card so a card always answers the same way.
const TURN = [5, 10];
const SCALE = [1.04, 1.06];
const SELECTOR = '.work, .design, .painting';

export function setupWorkCards() {
  gsap.utils.toArray(SELECTOR).forEach((card, i) => {
    const sign = scatter(i, 7) < 0 ? -1 : 1;
    card.style.setProperty('--hover-turn', `${sign * gsap.utils.mapRange(-1, 1, ...TURN, scatter(i, 8)).toFixed(1)}deg`);
    card.style.setProperty('--hover-scale', gsap.utils.mapRange(-1, 1, ...SCALE, scatter(i, 9)).toFixed(3));
  });
}

// A fixed pseudo-random number in -1…1 for card i (salt picks the property).
function scatter(i, salt) {
  const s = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
