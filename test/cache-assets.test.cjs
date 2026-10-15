const test = require('node:test');
const assert = require('node:assert/strict');
const {versionFontUrls} = require('../scripts/cache-assets.cjs');

test('font URLs get the current version without losing paths or other parameters', () => {
  const css = 'src:url("webfonts/a.woff2"),url(../b.ttf?subset=latin&v=old);';
  assert.equal(versionFontUrls(css, '2.2.9'), 'src:url("webfonts/a.woff2?v=2.2.9"),url(../b.ttf?subset=latin&v=2.2.9);');
});

test('external fonts, data URLs and images are not rewritten', () => {
  const css = 'src:url(https://fonts.example/a.woff2);background:url(a.png);src:url(data:font/woff2;base64,AAAA);';
  assert.equal(versionFontUrls(css, '2.2.9'), css);
});
