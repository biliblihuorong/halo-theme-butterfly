const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('../test-support/load.cjs');

function fixture(storage, mode = 'user') {
  const document = {documentElement: {dataset: {}}};
  const {Theme} = load('src/js/core/theme.js', ['Theme'], {
    MainApp: {conf: {style_mode: mode}}, document, localStorage: storage,
    useIsDaytime: () => true, console: {error() {}},
  });
  return {theme: new Theme(), document};
}

for (const blocked of ['getItem', 'setItem']) {
  test(`theme switches when localStorage ${blocked} throws`, () => {
    const storage = {getItem: () => 'light', setItem() {}};
    storage[blocked] = () => {throw new Error('Storage blocked');};
    const {theme, document} = fixture(storage);
    const modes = [];
    theme.change((mode) => modes.push(mode));
    theme.toggleMode();
    theme.toggleMode();
    assert.equal(theme.getMode(), 'light');
    assert.equal(document.documentElement.dataset.colorScheme, 'light');
    assert.deepEqual(modes, ['dark', 'light']);
  });
}

test('invalid stored mode falls back to light', () => {
  const {theme} = fixture({getItem: () => 'invalid', setItem() {}});
  assert.equal(theme.getMode(), 'light');
});

test('one failed theme subscriber does not block the others', () => {
  const {theme} = fixture({getItem: () => 'light', setItem() {}});
  const modes = [];
  theme.change(() => {throw new Error('Broken widget');});
  theme.change((mode) => modes.push(mode));
  theme.setMode('dark');
  assert.deepEqual(modes, ['dark']);
});

test('explicit dark mode works without storage and unknown settings remain usable', () => {
  const storage = {getItem() {throw new Error('blocked');}, setItem() {throw new Error('blocked');}};
  assert.equal(fixture(storage, 'dark').theme.getMode(), 'dark');
  assert.equal(fixture(storage, 'unknown').theme.getMode(), 'light');
});
