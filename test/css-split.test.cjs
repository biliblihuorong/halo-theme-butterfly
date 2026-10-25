const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('page styles leave the shared core to common.scss', () => {
  assert.match(read('src/scss/common.scss'), /^@use 'core';$/m);
  const pages = fs.readdirSync(path.join(root, 'src/scss/page')).filter((file) => file.endsWith('.scss'));
  for(const file of pages) {
    assert.doesNotMatch(read(`src/scss/page/${file}`), /@use ['"]\.\.\/core['"]/, `${file} must not bundle core again`);
  }
});

test('layout loads common and page styles synchronously', () => {
  const layout = read('src/html/views/layout.html');
  assert.match(layout, /css\/common\.min\.css/);
  assert.match(layout, /'css\/' \+ page \+ '\.min\.css/);
  assert.doesNotMatch(layout, /media="print" onload=/);
  assert.match(read('gulpfile.js'), /'\.\/src\/scss\/common\.scss'/);
});
