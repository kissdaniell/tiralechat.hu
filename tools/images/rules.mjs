// Shared by genr.mjs (makes the files) and srcset.mjs (writes the markup).
//
// `sizes` go by the page's three views: P = portrait, C = compact, otherwise
// wide. They say how wide each picture is really shown (measured in a
// 393 × 852, a 1350 × 940 and a 1920 × 1080 window, at rest and through the
// scroll scene); the browser takes the first file at least that wide times
// the screen's pixel density. Re-measure when a picture's size is retuned in
// the stylesheet — a stale value only costs sharpness or bytes, never layout
// (every picture is sized by the stylesheet).
export const P = '(max-aspect-ratio: 85/100)';
export const C = '(max-aspect-ratio: 155/100)';
// Phones with 3 (2.6…4) device pixels per CSS pixel: nobody sees more than 2
// file pixels per CSS pixel on those, and the third costs twice the bytes. So
// on them the portrait size is said smaller: by HD_SHARE (2 per CSS pixel on
// a 3× screen), or by the rule's own `hd` — less for the big photos and for
// the papers and other textures, where it shows even less; and smaller again
// on the 3.5× and 4× ones (HD3: the same file as a 3× phone gets). A rule
// may also say `hd2`: a share for the 2× phones (her poses: wider than the
// screen, so at 2× they would take the full-size file; the paintings and the
// menu: one step short of a much bigger file).
export const HD3 = '(min-resolution: 3.25dppx)';
export const HD = '(min-resolution: 2.5dppx)';
export const HD2 = '(min-resolution: 1.75dppx)';
const HD_SHARE = 0.667;
const HD3_OF_HD = 3 / 3.5;

// [which pictures, the widths to make, `sizes`, { full: keep data-full for
// the lightbox, hd, hd2, q: the copies' quality if not genr.mjs's usual }]
export const RULES = [
  [/^img\/stickers\//, [260, 320, 400, 480, 560, 640, 800], `${P} 52vw, ${C} 48vh, 53vh`],
  [/^img\/portrait\//, [560, 640, 700, 800], `${P} 115vw, 73vh`, { hd: 0.52, hd2: 0.8 }],
  [/^img\/works\//, [400, 700], `${P} 42vw, 34vh`, { full: true }],
  [/^img\/tervezes\/tervezes-\d\.webp$/, [300, 400, 480, 700], `${P} 34vw, ${C} 38vh, 42vh`, { full: true }],
  [/^img\/tervezes\/(kivitel-|hat|kar|lab|tervezes-\d-kesz)/, [640, 800], `${P} 98vw, 70vh`, { hd: 0.6, hd2: 0.9 }],
  [/^img\/news\/news-\d(-\d)?\.webp$/, [240, 320, 400], `${P} 37vw, ${C} 22vh, 31vh`],
  // One size for the preloader's, the header's and the menu's logo (the
  // biggest of them, the preloader's), so they are one download.
  [/^img\/logo\.webp$/, [300, 400, 600, 700, 800, 900], `${P} 84vw, min(68vw, 82vh)`, { hd: 0.6 }],
  [/^img\/folder-[12]\.webp$/, [640, 720, 800, 900, 1080, 1200], `${P} 100vw, 80vw`, { hd: 0.5 }],
  [/^img\/hand\.webp$/, [480, 700, 800, 1000], `${P} 84vw, ${C} min(70vh, 51vw), 70vh`, { hd: 0.6 }],
  [/^img\/grain-1\.webp$/, [400, 480, 640], `${P} 54vw, ${C} 41vh, 46vh`, { hd: 0.5 }],
  [/^img\/grain-2\.webp$/, [320, 480], `34vh`],
  [/^img\/tattoo-machine\.webp$/, [200, 240, 320], `${P} 17vw, ${C} 20vh, 24vh`],
  [/^img\/bubble\.webp$/, [240, 360, 480], `${P} 49vw, ${C} 36vh, 38vh`, { hd: 0.5 }],
  [/^img\/element-\d\.webp$/, [160, 240], `${P} 16vw, 13vh`],
  // (No <img>: the news gallery's paper, a background — the portrait view
  // takes the copy, src/style.css.)
  [/^img\/gallery-bg\.webp$/, [640], `90vw`, { q: 0.65 }],
  // The mobile menu (portrait only). The shares are set so that phones up to
  // 440 px wide take the file the page uses elsewhere too — the items' papers
  // are the subtitles' (400 px, src/style.css), the corner and the ✕ are the
  // lightbox's — and each is one download.
  // (The sheet is a noisy wall texture: heavy, and none the worse for a
  // lower quality.)
  [/^img\/mobilemenu\/sm\/mm-bg\.webp$/, [480, 560, 640, 800], `100vw`, { hd: 0.45, hd2: 0.7, q: 0.65 }],
  [/^img\/mobilemenu\/sm\/menu-item-\d\.webp$/, [400, 560], `46vw`, { hd: 0.65 }],
  [/^img\/mobilemenu\/sm\/mmbg-corner\.webp$/, [400, 480], `64vw`, { hd: 0.45, hd2: 0.7 }],
  [/^img\/mobilemenu\/sm\/hamburger-icon\.webp$/, [150, 200, 300], `17vw`],
  [/^img\/mobilemenu\/sm\/close-icon\.webp$/, [120, 160, 240], `14vw`, { hd: 0.6 }],
  [/^img\/mobilemenu\/sm\/map-pin\.webp$/, [120], `14vw`, { hd: 0.6 }],
];

// Where one picture is shown at another size: by a class of the <img> or of
// an element it sits in (the nearest one counts). A value is `sizes`, or
// [`sizes`, { hd }].
export const SIZES_BY_CLASS = {
  'decor-paper': `${P} 74vw, 32vw`,
  'pl-machine': `${P} 30vw, min(24.5vw, 29.5vh)`,
  'decor-bird': `${P} 52vw, ${C} 42vh, 48vh`,
  'decor-plague': `${P} 48vw, ${C} 48vh, 53vh`,
  'decor-strawberry': `${P} 52vw, ${C} 45vh, 48vh`,
  'decor-slide': `${P} 33vw, ${C} 28vh, 34vh`,
  'decor-portrait2': `${P} 42vw, ${C} 33vh, 40vh`,
  'mole-bubble': `${P} 54vw, ${C} 22vh, 25vh`,
  'works-picto--bandaid': `${P} 22vw, ${C} 17vh, 20vh`,
  'news-picto--bandaid': `${P} 18vw, ${C} 14vh, 16vh`,
  // The designs: each at its own size in the composition (the first one is
  // the one that lands on the back, bigger).
  'design--1': `${P} 56vw, 39vh`,
  'design--2': `${P} 24vw, 30vh`,
  'design--3': `${P} 16vw, 29vh`,
  'design--4': `${P} 23vw, ${C} 33vh, 27vh`,
  'design--5': `${P} 21vw, ${C} 28vh, 19vh`,
  'design--6': `${P} 21vw, ${C} 18vh, 29vh`,
  'design--7': `${P} 24vw, ${C} 38vh, 36vh`,
  'design--8': `${P} 15vw, ${C} 29vh, 24vh`,
  'design--9': `${P} 34vw, ${C} 37vh, 42vh`,
  'contact-sticker': `${P} 40vw, ${C} 40vh, 49vh`,
  'contact-stack': `${P} 100vw, ${C} 76vh, 73vh`,
  'end-bubble': `${P} 40vw, ${C} 31vh, 35vh`,
};

// The drawings and paintings (festmenyek/sm, with a half-size copy in
// festmenyek/xs) are all one height, so their width goes by their shape. (In
// portrait they are all one width; the shares keep phones on the half-size
// copies, the narrowest of which is 289 px wide — the next one up is four
// times the bytes.)
export const paintingSizes = (w, h) =>
  withHd(`${P} 44vw, ${C} ${Math.round((29 * w) / h)}vh, ${Math.round((33 * w) / h)}vh`, 0.49, 0.77);

export const ruleFor = (f) => RULES.find(([re]) => re.test(f));
// (Not a copy nearly as big as the original: that one is in the list anyway.)
export const widthsFor = (f, w) => (ruleFor(f)?.[1] ?? []).filter((v) => v < w * 0.9);

// The `sizes` for a picture: its rule's, or the one of the nearest class
// around it that has its own — with the entry for sharp phone screens first.
export function sizesFor(f, classes) {
  const rule = ruleFor(f);
  if (!rule) return null;
  let [sizes, own] = [rule[2], {}];
  const named = classes.find((c) => c in SIZES_BY_CLASS);
  if (named) [sizes, own = {}] = [SIZES_BY_CLASS[named]].flat();
  return withHd(sizes, own.hd ?? rule[3]?.hd ?? HD_SHARE, own.hd2 ?? rule[3]?.hd2);
}

// Puts the sharp-screen entries before the portrait one (or before the only
// one, for pictures that are shown at one size).
function withHd(sizes, share, share2) {
  const entries = sizes.split(/,\s*(?![^(]*\))/);
  const at = entries.length === 1 ? 0 : entries.findIndex((e) => e.startsWith(`${P} `));
  if (at < 0) return sizes;
  const only = entries.length === 1;
  const value = only ? entries[0] : entries[at].slice(P.length + 1);
  const scaled = (by) => value.replace(/(\d+(?:\.\d+)?)(vw|vh)/g, (_, n, unit) => `${Math.round(n * by * 10) / 10}${unit}`);
  const entry = (sharp, by) => `${only ? sharp : `${P} and ${sharp}`} ${scaled(by)}`;
  entries.splice(at, 0, entry(HD3, share * HD3_OF_HD), entry(HD, share), ...(share2 ? [entry(HD2, share2)] : []));
  return entries.join(', ');
}
