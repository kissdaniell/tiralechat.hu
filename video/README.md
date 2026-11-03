# Social video (reel)

A short 4:5 video (1080 × 1350, ~15 s, no sound) made of the site's own
pictures, fonts and motions, played like stop motion: 12 drawings a second,
each held for two frames of a 24 fps video; the logo and the texts shake a
little from drawing to drawing. It starts and ends on the empty wall, so it
loops.

- `reel.html` — the frame and its pieces; places and sizes in the
  "The frame — EDIT HERE" block (in % of the frame: `cqw` / `cqh`).
- `reel.js` — the story; timings in the "The story — EDIT HERE" block.
- `render.mjs` — makes the video: `npm run render` (or `node render.mjs
  --sheet` for a contact sheet as well) → `out/tiralechat-reel-4x5.mp4`.

Watch it while editing: with the site's dev server running (`npm run dev` in
the project), open http://localhost:5173/video/reel.html — it plays in a loop
at its own pace.

First time here: `npm install` in this folder (it brings ffmpeg). Rendering
needs Google Chrome installed (or its path in the `CHROME` environment
variable). The video has no sound: add the music on Instagram / in CapCut.
