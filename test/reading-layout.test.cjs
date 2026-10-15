const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('../test-support/load.cjs');

function fixture({page = true, aside = true, stored = null, blocked = false, restored = false} = {}) {
  const classes = new Set(restored ? ['reading-wide'] : []);
  const icon = {};
  const writes = [];
  const button = {hidden: true, attrs: {}, events: {}, querySelector: () => icon,
    setAttribute(key, value) {this.attrs[key] = value;},
    addEventListener(key, fn) {this.events[key] = fn;},
  };
  const document = {
    documentElement: {classList: {
      contains: (key) => classes.has(key),
      toggle(key, force) {if(force) classes.add(key); else classes.delete(key);},
    }},
    querySelector: (selector) => selector === '.wide-toggle' ? button : page ? {querySelector: () => aside ? {} : null} : null,
  };
  const {ReadingLayout} = load('src/js/modules/ReadingLayout.js', ['ReadingLayout'], {
    document, localStorage: {
      getItem() {if(blocked) throw new Error('Storage blocked'); return stored;},
      setItem(key, value) {if(blocked) throw new Error('Storage blocked'); writes.push({key, value});},
    },
  });
  new ReadingLayout();
  return {button, classes, icon, writes};
}

test('wide reading toggles and restores layout with matching button state', () => {
  const f = fixture();
  assert.equal(f.button.hidden, false);
  assert.equal(f.button.attrs['aria-pressed'], 'false');
  f.button.events.click();
  assert.equal(f.classes.has('reading-wide'), true);
  assert.equal(f.button.attrs['aria-pressed'], 'true');
  assert.equal(f.button.title, '退出宽屏阅读');
  assert.equal(f.icon.className, 'fa-solid fa-compress');
  f.button.events.click();
  assert.equal(f.classes.has('reading-wide'), false);
  assert.deepEqual(f.writes, [{key: 'butterfly-reading-wide', value: '1'}, {key: 'butterfly-reading-wide', value: '0'}]);
});

test('wide reading preference is restored on the next article', () => {
  const f = fixture({stored: '1'});
  assert.equal(f.classes.has('reading-wide'), true);
  assert.equal(f.button.attrs['aria-pressed'], 'true');
  assert.deepEqual(f.writes, []);
});

test('blocked storage preserves bootstrap state and still permits toggling', () => {
  const f = fixture({blocked: true, restored: true});
  assert.equal(f.classes.has('reading-wide'), true);
  f.button.events.click();
  assert.equal(f.classes.has('reading-wide'), false);
});

test('non-article pages keep the wide reading button hidden', () => {
  const f = fixture({page: false, stored: '1'});
  assert.equal(f.button.hidden, true);
  assert.equal(f.button.events.click, undefined);
  assert.equal(f.classes.has('reading-wide'), false);
});

test('articles with their sidebar disabled have no redundant wide reading button', () => {
  const f = fixture({aside: false});
  assert.equal(f.button.hidden, true);
  assert.equal(f.button.events.click, undefined);
});
