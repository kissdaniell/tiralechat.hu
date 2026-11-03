import { gsap } from 'gsap';
import { pauseScroll } from './smooth-scroll.js';
import { EN, t } from './i18n.js';
import { GALLERIES_EN } from './i18n-en.js';

// A click on one of the news opens its gallery: a big picture with the rest
// as small squares under it, arrows either side, the story beside it, and ×
// to close (or Esc, or a click outside). ← / → step through the pictures.
// Scrolling stops while it's open.

// ===== Galleries — EDIT HERE =====
// One entry per news item (news-item--N). `images` are the letters of
// /img/news/news-N-<letter>.webp, in order. `text` is shown beside every
// picture; `texts` gives a picture its own text instead.
const GALLERIES = {
  1: {
    title: 'falfestés',
    images: 'abcdefg',
    text:
      'Egy szép májusi napon felhívott egy barátom, hogy megszállta az ihlet és dekoráljuk ki a fodrász üzlete egyik falát.\n' +
      'Az ötlet már akkor tetszett, az alap koncepciót gyorsan összeállitottuk.\n' +
      'Végül nyár végén álltunk neki a projektnek, mindenki nyaralt meg hőgutát sem akartunk kapni 🤗\n' +
      'Persze voltak kisebb kezdeti nehézségek, először a vakolat esett ki foltokban, aztán a stencilezéshez a nyomtatással volt egy kisebb zökkenő, de végül a tervezetthez képest csak minimális csúszással startoltunk.\n' +
      'Grafit poral vittük fel a minta alapját, mert a helyiség túl kicsi ahhoz,hogy projektort tudtunk volna használni. Kicsit koszolósabb volt igy,de a célnak tökéletesen megfelelt ez a megoldás is.\n' +
      'Aztán jöttek a kontúrok, majd a háttér és végül az unikornis.\n' +
      'Mindennel együtt 6 nap alatt készült el, ebből 3 teljes nap.\n' +
      'Meg kell valljam, kicsit izgultam. Ugyan a technikai részletekben nem volt újdonság, de nem szoktam faldekorációkat csinálni, főleg ekkora méretben (2m x 2,8m).\n' +
      'Jó móka volt, de a vállam a végére majd leszakadt 🤗',
  },
  2: {
    title: 'workshop',
    images: 'abcd',
    text:
      'Évek óta szó volt róla, hogy tartsunk magunknak a szalonban egy festegetős workshopot.\n' +
      'Aztán idén végre összehoztunk egy kezdő alkalmat.\n' +
      'Mivél én vagyok a csapatban, aki aktivan fest, rajzol, engem ért a megtiszteletés, hogy osszam az észt. 🤗\n' +
      'Tehát összeszedtem a kaotikus gondolataim és első körben egy eszköz ismereti prezentációt tartottam, emelett igyekeztem az álltalam használt technikákat, és tapasztalataimat befogadható formában átadni a kollégáimnak.\n' +
      'Szó volt a grafit és szines ceruza használatról, akvarell és olaj festésről.\n' +
      'Bemutattam, hogyan lesz egy kusza firkából a vázlatfüzetben, kidolgozott kép. Elmondtam milyen fontos, hogy sokat vázlatoljunk / firkáljunk.\n' +
      'Nagyon jól esett, hogy ilyen nyitottan fogadták az okosságaim, és remélem sikerült megadni az induló löketet 🤗',
  },
  3: {
    title: 'életképek',
    images: 'abcd',
    texts: {
      a: 'Ez itt az én szipi-szupi munkaállomásom. A mini galériám tartalma pedig időről-időre frissül, igy mindig van mit “megcsodálni”',
      b: 'Vannak vendégeim akikkel a sok év alatt barátságok szövődtek. Hálás vagyok értük és a lankadatlan támogatásukért.',
      c: '…és van amikor megpihenünk 🤗 A tetoválók “betegsége”, hogy folyton fáj a vállunk / hátunk…,mert garnélarák pózban dolgozunk 🤗',
      d: 'Van hogy ilyen csodás képeket kapok a vendégeimtől, avagy: “munkáim természetes közegükben”',
    },
  },
  4: {
    title: 'kiállítás',
    images: 'abc',
    text: 
    'A “Hungarian Flames” kiállitás a folytatása egy tavalyi kezdeményezésnek.\n' +
    'A lényeg, hogy megmutassuk a világnak, a tetoválók nem csak tetoválnak, és sokan közülünk a tradicionális múvészet több területén tevékenykedünk.\n' +
    'Idén én is bekerültem a meghivott alkotók közé.\n' +
    'A tavalyi kiállitástól eltérően most nem hagyományos kép-formátumban, hanem testrész-formákra kellett festeni.\n' +
    'A téma a “tűz” volt, a technika pedig teljesen szabadon választott.\n' +
    'Én olajjal festettem, de utolag, főleg látva mások munkáit, izgalmasabb let volna egy vegyes-technika.\n' +
    'A kiállitás a Viadukt Bár-ban volt megtekinthető 2026 augusztus 19. és szeptember 2. között.',
  },
  5: {
    title: 'ki vagyok?!',
    images: 'abcde',
    text: 
    '…csak egy lány, azt hiszem 🤗\n' +
    'Egyszerű dolgok tesznek boldoggá, mint nézni ahogy nőnek a tölgyfáim, amiket makk-ról nevelek, vagy leszüretelni a veteményes kertem.\n' +
    'A bolond kutyáim, akik fitten tartanak, kirándulni velük… meg pl sütit sütni, állitólag kifejezetten finom pogácsát tudod csinálni 🤗\n' +
    'Tetováló azért lettem, mert beleszerettem a tetoválásokba, és mikor elkészült az első tetkóm,homlokon csapott a felismerés, hogy akár csinálhatnám is ezt.\n' +
    'Akkor még javában művészeti sulis voltam.\n' +
    'Szóval először lett egy festőművész meg egy képgrafikus végzettségem… aztán egy logisztikai asszisztensi… ne kérdezd.\n' +
    'És persze az élet hozott mindenféle fordulatot ,szóval csak 27 évesen kezdtem hivatásszerűen tetoválni.\n' +
    'Mondták is nekem sokat, hogy túl öreg vagyok hozzá.\n' +
    'Aztán mégis kitartottam, pedig a 14 év alatt sokszor ellenem vagy a tetkózás ellen szóltak a dolgok.\n' +
    'Voltak hibák, kudarcok, nagyon nehéz pillanatok, amikor mindent megkérdőjeleztem… Leginkább az életben hozott döntéseim 🤗\n' +
    'Még mindig hiszek benne, hogy a tetoválás is tud klasszikus értelemben vett művészet lenni, és még mindig az a legfontosabb számomra, hogy olyan mintákat készitsek, amelyek személyesek, valóban kapcsolódnak viselőjükhöz.\n' +
    'De nem kell itt rögtön a drámára gondolni, ettől még lehet az a minta vicces, szokatlan, meghökkentő 🤗\n' +
    'És itt jön az, amiért a leginkább hálás vagyok a tetoválásnak. Mindaz, amit az emberekről és egyúttal magamról tanultam.\n' +
    'A társadalom minden rétegéből jönnek hozzánk vendégek, különböző sorsok, tapasztalatok… És mesélnek.\n' +
    'Minél több történetet ismertem meg, annál inkább láttam, valójában mindannyian ugyan azt szeretnénk.\n' +
    'Lehet van, aki nagyobb házat, mint mások, de a stabilitásra, szeretetre, békére való vágyakozás azonos.\n' +
    'Ez most baromi giccses, igaz?\n' +
    'A lényeg, hogy számomra mindegy honna jöttél, ha jó arc vagy, biztosan szuperül elleszünk 🤗',
  },
};
// The English page gets the galleries' English texts (src/i18n-en.js).
if (EN) for (const [n, texts] of Object.entries(GALLERIES_EN)) Object.assign(GALLERIES[n] ?? {}, texts);


const DURATION = 0.45;

export function setupNewsGallery() {
  const ui = build();
  let gallery = null;
  let index = 0;
  let opener = null;

  const stopScroll = pauseScroll;

  // The big picture changes only once the new one is decoded, so nothing
  // half-loaded (or left over from before) ever shows; a newer request wins.
  let wanted = '';
  const showPicture = (src, dir) => {
    wanted = src;
    const next = new Image();
    next.src = src;
    next.decode().then(
      () => {
        if (wanted !== src || !gallery) return;
        ui.image.src = src;
        gsap.fromTo(ui.image, { opacity: dir ? 0.2 : 0, x: dir * 30 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out', overwrite: true });
      },
      () => {},
    );
  };

  const show = (i, dir = 0) => {
    index = (i + gallery.images.length) % gallery.images.length;
    const letter = gallery.images[index];
    showPicture(source(gallery.n, letter, big()), dir);
    ui.image.alt = `${gallery.title} — ${index + 1}. kép`;
    const story = gallery.texts?.[letter] ?? gallery.text ?? '';
    if (ui.text.textContent !== story) {
      ui.text.textContent = story;
      ui.text.scrollTop = 0;
    }
    ui.count.textContent = `${index + 1} / ${gallery.images.length}`;
    [...ui.thumbs.children].forEach((t, k) => t.setAttribute('aria-current', k === index ? 'true' : 'false'));
    // The next one along, so stepping on doesn't wait.
    new Image().src = source(gallery.n, gallery.images[(index + 1) % gallery.images.length], big());
  };

  const open = (n, from) => {
    const entry = GALLERIES[n];
    if (!entry) return;
    gallery = { n, ...entry, images: [...entry.images] };
    opener = from;
    // Nothing of the gallery shown last time: the picture waits (empty)
    // until the new one is ready.
    gsap.killTweensOf(ui.image);
    ui.image.removeAttribute('src');
    gsap.set(ui.image, { opacity: 0 });
    ui.title.firstChild.textContent = gallery.title;
    ui.root.setAttribute('aria-label', gallery.title);
    ui.thumbs.replaceChildren(
      ...gallery.images.map((letter, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gallery-thumb';
        b.setAttribute('aria-label', `${k + 1}. kép`);
        const img = document.createElement('img');
        img.src = source(n, letter, 'th');
        img.alt = '';
        b.append(img);
        b.addEventListener('click', () => show(k, k > index ? 1 : -1));
        return b;
      }),
    );
    ui.nav.forEach((b) => (b.hidden = gallery.images.length < 2));
    show(0);
    ui.root.hidden = false;
    // Only a shown element can be scrolled: back to the top of the story.
    ui.text.scrollTop = 0;
    stopScroll(true);
    gsap.fromTo(ui.veil, { opacity: 0 }, { opacity: 1, duration: DURATION });
    gsap.fromTo(ui.box, { opacity: 0, scale: 0.92, rotation: -2 }, { opacity: 1, scale: 1, rotation: 0, duration: DURATION, ease: 'back.out(1.4)' });
    ui.close.focus({ preventScroll: true });
  };

  const close = () => {
    if (!gallery) return;
    gallery = null;
    gsap.to(ui.veil, { opacity: 0, duration: DURATION * 0.7 });
    gsap.to(ui.box, {
      opacity: 0,
      scale: 0.94,
      duration: DURATION * 0.7,
      ease: 'power2.in',
      onComplete: () => {
        ui.root.hidden = true;
        stopScroll(false);
        opener?.focus({ preventScroll: true });
      },
    });
  };

  // Pointing at a news item already fetches its first picture and its
  // thumbnails, so they are usually there by the time it's clicked.
  const warmed = new Set();
  const warm = (event) => {
    const item = event.target.closest?.('.news-item');
    const n = item && Number(item.className.match(/news-item--(\d+)/)?.[1]);
    const entry = n && GALLERIES[n];
    if (!entry || warmed.has(n)) return;
    warmed.add(n);
    new Image().src = source(n, entry.images[0], big());
    [...entry.images].forEach((letter) => (new Image().src = source(n, letter, 'th')));
  };
  document.addEventListener('pointerover', warm, { passive: true });
  document.addEventListener('focusin', warm);

  document.addEventListener('click', (event) => {
    const item = event.target.closest('.news-item');
    const n = item && Number(item.className.match(/news-item--(\d+)/)?.[1]);
    if (n) open(n, item);
  });
  ui.veil.addEventListener('click', close);
  ui.close.addEventListener('click', close);
  ui.nav[0].addEventListener('click', () => show(index - 1, -1));
  ui.nav[1].addEventListener('click', () => show(index + 1, 1));
  document.addEventListener('keydown', (event) => {
    if (!gallery) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') show(index - 1, -1);
    if (event.key === 'ArrowRight') show(index + 1, 1);
  });
}

// The pictures come in three sizes: lg (at most 1400 px, for the big
// picture), md (the same with MD px on its shorter side, made from it by
// tools/images/genr.mjs: all the big picture needs on a phone) and th
// (240 px, thumbnails).
function source(n, letter, size) {
  return `/img/news/${size}/news-${n}-${letter}.webp`;
}

// Which of the two the big picture takes. Its square box is never wider than
// BOX of the screen's shorter side (--gallery-size, src/style.css), and
// shows DENSITY file pixels per CSS pixel at the most (a phone's 3× screen
// shows no more): where md has that many, it will do.
const MD = 600;
const BOX = 0.84;
const DENSITY = 1.5;
const big = () => (Math.min(innerWidth, innerHeight) * BOX * Math.min(devicePixelRatio, DENSITY) <= MD ? 'md' : 'lg');

const CHEVRON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

// The dialog, built once and kept hidden until needed.
function build() {
  const root = document.createElement('div');
  root.className = 'gallery';
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.innerHTML = `
    <div class="gallery-veil"></div>
    <div class="gallery-box">
      <div class="gallery-main">
        <img class="gallery-image" alt="" />
        <button class="gallery-nav gallery-nav--prev" type="button" aria-label="${t('Előző kép')}">${CHEVRON}</button>
        <button class="gallery-nav gallery-nav--next" type="button" aria-label="${t('Következő kép')}">${CHEVRON}</button>
      </div>
      <div class="gallery-thumbs"></div>
      <div class="gallery-side">
        <h3 class="gallery-title">&nbsp;<img class="gallery-underline" src="/img/alahuzas.webp" alt="" aria-hidden="true" /></h3>
        <p class="gallery-text"></p>
        <p class="gallery-count"></p>
      </div>
      <button class="gallery-close" type="button" aria-label="${t('Bezárás')}">×</button>
    </div>`;
  document.body.append(root);
  const q = (s) => root.querySelector(s);
  return {
    root,
    veil: q('.gallery-veil'),
    box: q('.gallery-box'),
    image: q('.gallery-image'),
    thumbs: q('.gallery-thumbs'),
    title: q('.gallery-title'),
    text: q('.gallery-text'),
    count: q('.gallery-count'),
    close: q('.gallery-close'),
    nav: [q('.gallery-nav--prev'), q('.gallery-nav--next')],
  };
}
