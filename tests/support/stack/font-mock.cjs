/**
 * Answers Next's Google Fonts requests without a network (see the `build`
 * command in stack.mjs; Next's first-party NEXT_FONT_GOOGLE_MOCKED_RESPONSES
 * switch). Turbopack evaluates this file in its own sandbox, so it cannot
 * `require` anything and must export a plain object keyed by the EXACT CSS URL
 * Next asks for. Those URLs follow from the fonts `app/[locale]/layout.tsx`
 * declares (variable weight, `display: 'swap'`). Add a font there and add its
 * URL here, or an offline build fails with "url not found". The "font files"
 * are fake and are served by a tiny local server that `stack.mjs build` starts
 * (Turbopack mocks the CSS but still downloads the font files), so text renders in the fallback stack: fine for behaviour and
 * accessibility checks, not for judging typography.
 */
const css = (family) =>
  ['latin', 'latin-ext', 'arabic']
    .map(
      (subset) => `/* ${subset} */
@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url(http://127.0.0.1:54399/${family.replace(/\s+/g, '')}-${subset}.woff2) format('woff2');
  unicode-range: U+0000-00FF;
}`,
    )
    .join('\n')

module.exports = {
  'https://fonts.googleapis.com/css2?family=Geist:wght@100..900&display=swap': css('Geist'),
  'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&display=swap': css('Geist Mono'),
  'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@100..900&display=swap': css('Vazirmatn'),
}
