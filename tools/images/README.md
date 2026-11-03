# Responsive image variants

The smaller copies under `public/img/r/<width>/…` (and `festmenyek/xs`) and the
generated attributes of the `<img>` tags in `index.html` are made with these
scripts. From this folder:

1. `node inventory.mjs` — writes `inventory.json`: every original picture and
   its pixel size (read from the file headers; needs nothing else).
2. `node genr.mjs` — makes the copies listed in `rules.mjs` that are missing
   or older than their original (`FORCE=1` makes all of them again). The
   resizing is done by a headless Chrome's canvas, as no image library is
   installed; start one first:
   `chrome --headless=new --remote-debugging-port=9333 about:blank`
3. `node srcset.mjs` — rewrites, on every `<img>` of `index.html`: `width` /
   `height` (the picture's shape, so the layout is final before it loads),
   `srcset` / `sizes`, `data-full`, and `loading` / `fetchpriority` where the
   rules say so; and gives the preload links in the head the same candidates
   as the picture they preload. (`en/index.html` is generated from
   `index.html`: `npm run en`.)

`rules.mjs` says which pictures get which widths and what `sizes` they are
shown at — per view, as measured on the page, with a smaller entry for phones
with very sharp screens (they don't need three file pixels per CSS pixel).

New pictures (a new work, design, painting): add the `<img>` to `index.html`
like its neighbours, with only `src` and `alt`, then run the three steps. A
picture whose size on the page was retuned in the stylesheet: correct its
`sizes` in `rules.mjs` and run step 3 (and step 2 if it needs a new width).

How the pictures are loaded on the page — the first screen's first, the later
acts' in turn after it — is in `src/late-images.js`; it relies on the `width`
and `height` attributes written here.
