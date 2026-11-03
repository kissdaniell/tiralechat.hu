// The reel's story (markup and places: reel.html), played like stop motion:
// the motion is sampled at DRAWINGS per second and every drawing is held for
// two video frames (render.mjs makes 24 fps of it). The logo and the texts
// shake a little from drawing to drawing (boil), as hand-cut letters do;
// the rest moves only when it moves.
//
// It starts and ends on the empty wall, so it loops: the logo comes down
// from the top, Kriszti rises from the bottom, and at the end everything
// leaves the frame again. The pieces move like the site's: pictures are
// stuck on lifted and slapped down (the poses' stickOn), stickers glide in
// from their edges and now and then turn a little (the site's hover turn),
// the headlines are laid down letter by letter, pictos pop.
(() => {
  const DRAWINGS = 12;

  // ===== The story — EDIT HERE (seconds) =====
  const T = {
    // 1. Hero, from the empty wall.
    logo: 0.25, // the logo comes down from the top
    tira: 0.3, // Kriszti rises from the bottom, and her poses take turns
    // till the act ends, each on show as long as the others
    title: 0.55, // "Ne csak álmodozz!" laid down letter by letter
    stickers: 0.6, // the stickers glide in from the sides, one by one
    accent: 1.3, // "Varrjuk fel!"
    pictos: 1.35,
    turns: [1.8, 2.5, 3.2], // a sticker turns a little (taking turns)
    heroOut: 3.75,
    // 2. Works: "Munkáim", pictos round it, the polaroids thrown onto a
    // pile one every CARD_GAP, the news photos last.
    works: 4.05,
    pictos2: 4.2,
    cards: 4.35,
    worksOut: 10.15,
    // 3. Contact.
    contact: 10.45,
    contactPose: 12.15, // her one change of pose here, half-way
    mail: 11.45,
    contactTurns: [11.9, 12.6, 13.3],
    // Everything out, then the empty wall again for a moment (the loop).
    out: 13.9,
    end: 14.65,
  };
  const LETTER_GAP = 0.045; // between two letters laid down
  const STICKER_GAP = 0.13;
  const CARD_GAP = 0.72;
  const THROW = 0.5; // a polaroid's flight onto the pile
  // How much the logo and the texts move from drawing to drawing (share of
  // the frame's width / degrees).
  const BOIL_MOVE = 0.22;
  const BOIL_TURN = 0.6;

  const frame = document.getElementById('frame');
  const q = (s) => frame.querySelector(s);
  const qa = (s) => [...frame.querySelectorAll(s)];

  // Seeded, so every render is the same video.
  let seed = 20261015;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const between = (a, b) => a + (b - a) * rnd();
  // A fixed pseudo-random number per (thing, drawing).
  const hash = (i, k, salt = 0) => {
    let h = (i * 374761393 + k * 668265263 + salt * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  // The headlines' letters, each its own piece (.ch, moved by the timeline)
  // round a span (shaken by boil).
  const split = (title) => {
    for (const ink of title.querySelectorAll('.ink')) {
      const text = ink.textContent;
      ink.textContent = '';
      for (const c of text) {
        const ch = document.createElement('span');
        ch.className = 'ch';
        const inner = document.createElement('span');
        inner.textContent = c;
        ch.append(inner);
        ink.append(ch);
      }
    }
    return [...title.querySelectorAll('.ch')];
  };

  // ---- The motions (immediateRender off: nothing shows before its moment).

  // Stuck on: appears lifted (bigger, turned, its shadow far) and drops into place.
  const slap = (tl, el, at, { rot = 0, tilt = between(-9, 9), lift = 1.25, dur = 0.25 } = {}) =>
    tl.set(el, { autoAlpha: 1 }, at).fromTo(
      el,
      { scale: lift, rotation: rot + tilt, xPercent: between(-4, 4), yPercent: -6, '--lift': 1 },
      { scale: 1, rotation: rot, xPercent: 0, yPercent: 0, '--lift': 0, duration: dur, ease: 'power4.in', immediateRender: false },
      at,
    );

  // How far a piece has to go to be off the frame on one side.
  const off = (el, side) =>
    ({
      left: -(el.offsetLeft + el.offsetWidth * 1.15),
      right: frame.offsetWidth - el.offsetLeft + el.offsetWidth * 0.15,
      top: -(el.offsetTop + el.offsetHeight + 30),
      bottom: frame.offsetHeight - el.offsetTop + 30,
    })[side];
  const axis = (side) => (side === 'left' || side === 'right' ? 'x' : 'y');

  // (`turn`: the turn it comes in / goes out with; null leaves its turn
  // alone — the header's paper is turned upside down in the stylesheet.)
  const glideIn = (tl, el, at, side, { dur = 0.4, turn = side === 'left' ? -14 : side === 'right' ? 14 : 0 } = {}) =>
    tl.set(el, { autoAlpha: 1 }, at).fromTo(
      el,
      { [axis(side)]: off(el, side), ...(turn === null ? {} : { rotation: turn }) },
      { [axis(side)]: 0, ...(turn === null ? {} : { rotation: 0 }), duration: dur, ease: 'power3.out', immediateRender: false },
      at,
    );

  const glideOut = (tl, el, at, side, { dur = 0.32, turn = side === 'left' ? -18 : side === 'right' ? 18 : 0 } = {}) =>
    tl
      .to(el, { [axis(side)]: off(el, side), ...(turn === null ? {} : { rotation: turn }), duration: dur, ease: 'power2.in' }, at)
      .set(el, { autoAlpha: 0 }, '>');

  const pop = (tl, el, at) =>
    tl.set(el, { autoAlpha: 1 }, at).fromTo(
      el,
      { scale: 0.2, rotation: between(-40, 40) },
      { scale: 1, rotation: 0, duration: 0.3, ease: 'back.out(2.4)', immediateRender: false },
      at,
    );

  const popOut = (tl, el, at) => tl.to(el, { scale: 0, rotation: '+=40', duration: 0.2, ease: 'back.in(2)' }, at).set(el, { autoAlpha: 0 }, '>');

  // Letter by letter, each dropped onto its place a little crooked.
  const lay = (tl, chars, at) =>
    chars.forEach((ch, i) =>
      tl.set(ch, { autoAlpha: 1 }, at + i * LETTER_GAP).fromTo(
        ch,
        { scale: 1.8, rotation: between(-30, 30), yPercent: -45 },
        { scale: 1, rotation: between(-3, 3), yPercent: 0, duration: 0.17, ease: 'power3.in', immediateRender: false },
        at + i * LETTER_GAP,
      ),
    );

  const kick = (tl, chars, at) =>
    tl.to(chars, { yPercent: -150, rotation: () => between(-70, 70), autoAlpha: 0, duration: 0.22, ease: 'power2.in', stagger: 0.015 }, at);

  // A sticker's little turn and back (the picture inside it turns, so it
  // adds to wherever the sticker is).
  const turn = (tl, el, at) => {
    const pic = el.firstElementChild;
    const dir = el.dataset.from === 'right' ? -1 : 1;
    tl.to(pic, { rotation: 7 * dir, scale: 1.05, duration: 0.17, ease: 'power2.out' }, at)
      .to(pic, { rotation: -3 * dir, duration: 0.17, ease: 'sine.inOut' }, at + 0.17)
      .to(pic, { rotation: 0, scale: 1, duration: 0.2, ease: 'sine.out' }, at + 0.34);
  };

  // Her poses: each new one stuck on over the one on show, which goes as it
  // lands; one every `gap` from `at` until `until`, round the stack.
  // Returns the last one.
  const cycle = (tl, poses, at, gap, until) => {
    let shown = poses[0];
    for (let n = 0, t = at; t < until - 0.25; n++, t += gap) {
      const next = poses[(n + 1) % poses.length];
      tl.set(next, { zIndex: 21 + n }, t);
      slap(tl, next, t, { tilt: [-7, 6, -9, 5, -6, 10][n % 6], lift: 1.2, dur: 0.28 });
      tl.set(shown, { autoAlpha: 0 }, t + 0.25);
      shown = next;
    }
    return shown;
  };

  // A polaroid thrown onto the pile through the air: it comes from beyond
  // an edge, big (near the camera) and turned, falls onto its place and
  // settles with a little bump.
  const throwOn = (tl, card, at, { x, y, rot, from }) => {
    const W = frame.offsetWidth;
    const H = frame.offsetHeight;
    const [dx, dy] = { left: [-1, 0.12], right: [1, 0.08], top: [0.15, -1] }[from];
    const settle = rot > 0 ? -2 : 2;
    tl.set(card, { autoAlpha: 1 }, at)
      .fromTo(
        card,
        { x: x + dx * W * 0.62, y: y + dy * H * 0.42, rotation: rot + (dx || 1) * 32 },
        { x, y, rotation: rot, duration: THROW, ease: 'power2.out', immediateRender: false },
        at,
      )
      .fromTo(card, { scale: 1.55, '--lift': 1 }, { scale: 1, '--lift': 0, duration: THROW, ease: 'power2.in', immediateRender: false }, at)
      .to(card, { rotation: rot + settle, scale: 0.985, duration: 0.08, ease: 'power1.out' }, at + THROW)
      .to(card, { rotation: rot, scale: 1, duration: 0.12, ease: 'power1.inOut' }, at + THROW + 0.08);
  };

  function build() {
    const tl = gsap.timeline({ paused: true, defaults: { immediateRender: false } });
    const W = frame.offsetWidth;
    const H = frame.offsetHeight;
    const header = ['.paper', '.logo'].map(q);

    // ---- 1. Hero
    header.forEach((el) => glideIn(tl, el, T.logo, 'top', { dur: 0.4, turn: null }));
    const poses = qa('.hero-poses .pose');
    tl.set(poses[0], { zIndex: 20 }, 0);
    glideIn(tl, poses[0], T.tira, 'bottom', { dur: 0.45, turn: 4 });
    const poseGap = (T.heroOut - T.tira) / poses.length;
    const lastPose = cycle(tl, poses, T.tira + poseGap, poseGap, T.heroOut);
    const heroChars = split(q('.title--hero'));
    lay(tl, heroChars, T.title);
    const heroStickers = qa('[data-scene="1"]');
    heroStickers.forEach((el, i) => glideIn(tl, el, T.stickers + i * STICKER_GAP, el.dataset.from));
    const accent = q('.accent');
    slap(tl, accent, T.accent, { rot: -5, tilt: 10, lift: 1.5 });
    const underline = accent.querySelector('img');
    tl.fromTo(underline, { clipPath: 'inset(-10% 100% -10% 0%)' }, { clipPath: 'inset(-10% 0% -10% 0%)', duration: 0.25, ease: 'none' }, T.accent + 0.2);
    const heroPictos = qa('[data-scene="1p"]');
    heroPictos.forEach((el, i) => pop(tl, el, T.pictos + i * 0.17));
    // (Taking turns: the right, the left, the right…)
    [heroStickers[2], heroStickers[0], heroStickers[3]].forEach((el, i) => turn(tl, el, T.turns[i]));

    // …and out: stickers to their sides, pictos and the brush line away,
    // the letters kicked off, she drops out of the frame.
    heroStickers.forEach((el, i) => glideOut(tl, el, T.heroOut + i * 0.04, el.dataset.from));
    heroPictos.forEach((el) => popOut(tl, el, T.heroOut));
    tl.to(accent, { y: H * 0.4, rotation: 25, autoAlpha: 0, duration: 0.25, ease: 'power2.in' }, T.heroOut + 0.02);
    kick(tl, heroChars, T.heroOut + 0.02);
    glideOut(tl, lastPose, T.heroOut + 0.06, 'bottom', { dur: 0.3, turn: 6 });

    // ---- 2. Works
    const worksChars = split(q('.title--works'));
    lay(tl, worksChars, T.works);
    const worksPictos = qa('[data-scene="2p"]');
    worksPictos.forEach((el, i) => pop(tl, el, T.pictos2 + i * 0.15));
    const cards = qa('.card');
    const sides = ['right', 'left', 'top', 'right', 'left', 'top', 'right', 'left'];
    cards.forEach((card, i) => {
      const news = card.classList.contains('card--news');
      const at = T.cards + i * CARD_GAP;
      tl.set(card, { zIndex: 30 + i }, at);
      throwOn(tl, card, at, {
        x: between(-0.07, 0.07) * W,
        y: between(-0.03, 0.04) * H,
        rot: news ? between(-8, 8) : between(-4, 12),
        from: sides[i % sides.length],
      });
    });

    // …and out: the pile swept down, the letters kicked off, the pictos away.
    tl.to(cards, { y: `+=${H}`, rotation: () => `+=${between(-20, 20)}`, duration: 0.3, ease: 'power2.in', stagger: { each: 0.015, from: 'end' } }, T.worksOut).set(cards, { autoAlpha: 0 }, '>');
    kick(tl, worksChars, T.worksOut);
    worksPictos.forEach((el) => popOut(tl, el, T.worksOut));

    // ---- 3. Contact: like the hero.
    const cposes = qa('.contact-poses .pose');
    tl.set(cposes[0], { zIndex: 20 }, 0);
    glideIn(tl, cposes[0], T.contact, 'bottom', { dur: 0.45, turn: -4 });
    const lastContactPose = cycle(tl, cposes, T.contactPose, Infinity, T.out);
    const contactPictos = qa('[data-scene="3p"]');
    pop(tl, contactPictos[1], T.contact + 0.1);
    const contactChars = split(q('.title--contact'));
    lay(tl, contactChars, T.contact + 0.2);
    const contactStickers = qa('[data-scene="3"]');
    contactStickers.forEach((el, i) => glideIn(tl, el, T.contact + 0.25 + i * STICKER_GAP, el.dataset.from));
    pop(tl, contactPictos[0], T.contact + 0.75);
    const mail = q('.mail');
    slap(tl, mail, T.mail, { tilt: 7, lift: 1.4, dur: 0.26 });
    [contactStickers[2], contactStickers[0], contactStickers[3]].forEach((el, i) => turn(tl, el, T.contactTurns[i]));

    // ---- Everything out, the logo last, and the empty wall again.
    contactStickers.forEach((el, i) => glideOut(tl, el, T.out + i * 0.04, el.dataset.from));
    contactPictos.forEach((el) => popOut(tl, el, T.out));
    kick(tl, contactChars, T.out + 0.02);
    glideOut(tl, mail, T.out + 0.05, 'bottom', { dur: 0.3, turn: -8 });
    glideOut(tl, lastContactPose, T.out + 0.08, 'bottom', { dur: 0.32, turn: 6 });
    header.forEach((el) => glideOut(tl, el, T.out + 0.2, 'top', { dur: 0.3, turn: null }));

    tl.set({}, {}, T.end);
    return tl;
  }

  // ---- Boil: in every drawing the logo and the texts sit a little
  // differently (on their inner element, which the timeline never moves;
  // added to its own turn, if it has one).
  let shakers = [];
  const boil = (k) =>
    shakers.forEach(({ el, turn: base }, i) => {
      el.style.translate = `${(hash(i, k, 1) - 0.5) * BOIL_MOVE}cqw ${(hash(i, k, 2) - 0.5) * BOIL_MOVE}cqw`;
      el.style.rotate = `${base + (hash(i, k, 3) - 0.5) * BOIL_TURN}deg`;
    });

  const ready = (async () => {
    await Promise.all([...frame.querySelectorAll('img')].map((img) => img.decode().catch(() => {})));
    const sample = 'ÁÉÍÓÖŐÚÜŰáéíóöőúüű!?';
    await Promise.all(
      ['700 40px Anton', '40px "Protest Revolution"', '700 40px "Courier Prime"', '40px "Delicious Handrawn"'].map((font) => document.fonts.load(font, sample)),
    );
    await document.fonts.ready;
    const tl = build();
    shakers = [q('.logo > img'), ...qa('.title .ch > span'), q('.accent > span'), q('.mail > span'), q('.pi-catc .note')].map((el) => ({
      el,
      turn: parseFloat(getComputedStyle(el).rotate) || 0,
    }));
    window.reel.drawings = Math.round(tl.duration() * DRAWINGS) + 1;
    window.reel.frame = (k) => {
      // (A hair past the drawing's moment: what is set at 0 has to show in
      // the very first one too.)
      tl.seek(k / DRAWINGS + 0.0001, false);
      boil(k);
    };
  })();

  window.reel = { fps: DRAWINGS, ready };

  // Opened by hand (not by render.mjs): plays it, round and round, at its
  // own pace, scaled to the window.
  if (!location.search.includes('render')) {
    ready.then(() => {
      const fit = () => (frame.style.scale = Math.min(1, innerWidth / 1080, innerHeight / 1350) || 1);
      fit();
      addEventListener('resize', fit);
      let k = 0;
      setInterval(() => {
        window.reel.frame(k);
        k = (k + 1) % window.reel.drawings;
      }, 1000 / DRAWINGS);
    });
  }
})();
