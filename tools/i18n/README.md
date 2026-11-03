# The English page

`index.html` is the Hungarian page and the only one edited by hand.
`en/index.html` and `src/i18n-en.js` are **generated** from it by
`build-en.mjs`, which puts in the translations of `en.json`. It runs by itself
before `npm run dev` and `npm run build` (or: `npm run en`).

- **A translation changes:** edit the "English" column of the workbook, then
  `python tools/i18n/xlsx-to-json.py <workbook.xlsx>` and `npm run en`
  (or edit `en.json` directly).
- **A Hungarian text changes or a new one is added in `index.html`:** change /
  add its row in `en.json` too (`hu` must be the text exactly as in the page,
  line breaks as `\n`). `build-en.mjs` lists every row whose Hungarian text it
  no longer finds; a text without a row simply stays Hungarian on the English
  page.
- A text translated differently in different places has one row per place; the
  row's `source` (tag.class) says where.
- Texts written by the scripts go through `t()` in `src/i18n.js`; the news
  galleries' texts are the `GALLERIES[n]…` rows.
- Layout fixes for longer English texts: the `html[lang='en']` rules at the end
  of `src/style.css`.
