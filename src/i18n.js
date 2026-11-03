import { DICT } from './i18n-en.js';

// The page comes in two languages: Hungarian (index.html) and English
// (en/index.html, generated from it by tools/i18n/build-en.mjs). The markup
// is translated there; the few texts the scripts write go through t().
export const EN = document.documentElement.lang === 'en';
export const t = (hu) => (EN && DICT[hu]) || hu;
