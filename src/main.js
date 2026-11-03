import './style.css';
import { setupSmoothScroll } from './smooth-scroll.js';
import { playHeroIntro } from './hero-intro.js';
import { setupStage } from './stage.js';
import { setupWorkCards } from './work-cards.js';
import { setupLightbox } from './lightbox.js';
import { setupInkTrail } from './ink-trail.js';
import { setupSky } from './sky.js';
import { setupScrollCalm } from './scroll-calm.js';
import { setupNavLife } from './nav-life.js';
import { setupNewsGallery } from './news-gallery.js';
import { setupNewsLife } from './news-life.js';
import { setupContactCopy } from './contact.js';
import { setupMobileMenu } from './mobile-menu.js';
import { holdLateImages, loadLateImages } from './late-images.js';
import { freezeViewport, isTouchDevice, restartOnDeviceChange } from './motion.js';

// The later acts' pictures wait their turn (see late-images.js): put aside
// before anything else can make them load.
holdLateImages();

// The hero is a pinned, scrubbed scene; restoring a mid-scene scroll position
// on reload would replay the intro on top of a half-finished scene.
history.scrollRestoration = 'manual';
restartOnDeviceChange();

// The height the portrait layout is built on (see src/motion.js).
freezeViewport();
addEventListener('resize', () => !isTouchDevice() && freezeViewport());

// First, before any ScrollTrigger exists (see smooth-scroll.js).
setupSmoothScroll();
setupInkTrail();
setupSky();
setupScrollCalm();
// The preloader starts at once; it waits for the first screen to load by
// itself.
const heroStanding = playHeroIntro();

setupWorkCards();
const lightbox = setupLightbox();
setupNavLife();
setupNewsGallery();
setupNewsLife();
setupContactCopy();
const menu = setupMobileMenu();

// The scroll scene is built as soon as the hero stands — not when the whole
// page has loaded: the page can be scrolled while the later acts' pictures
// are still on their way. SplitText measures letters, so it waits for the
// webfonts too (asked for once the hero is up: the first screen uses every
// one that takes part in the layout) — but only FONT_PATIENCE ms: a font
// that is later than that mustn't keep the page from scrolling, so the scene
// is built on the fallback's letters and once more when the font is in.
// Then the rest of the pictures, in the order the page shows them — the
// menu's (where there is one) and the lightbox's own first: they are small,
// and can be opened straight away.
const FONT_PATIENCE = 6000;
const inTime = (promise, ms) => Promise.race([promise.then(() => true), new Promise((resolve) => setTimeout(resolve, ms, false))]);

heroStanding
  .then(() => inTime(document.fonts.ready, FONT_PATIENCE))
  .then((fontsIn) => {
    const stage = setupStage();
    if (!fontsIn) document.fonts.ready.then(stage.rebuild);
    return loadLateImages([menu.preload, lightbox.preload]);
  });
