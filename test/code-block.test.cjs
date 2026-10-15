const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('../test-support/load.cjs');

function fixture(prism) {
  const classes = new Set();
  const pre = {nextElementSibling: null, classList: {add: (name) => classes.add(name)}};
  const article = {classList: {add() {}}, querySelectorAll: (selector) => selector === 'pre' ? [pre] : [{}]};
  const nodes = new Map();
  const timers = new Map();
  let script, nextTimer = 0;
  const document = {
    querySelector: () => article, getElementById: (id) => nodes.get(id),
    createElement: (tag) => ({tag}), head: {appendChild(node) {if(node.id) nodes.set(node.id, node); if(node.tag === 'script') script = node;}},
  };
  const window = {Prism: prism};
  const {codeBlock} = load('src/js/modules/CodeBlock.js', ['codeBlock'], {
    window, document, Clipboard: class {}, useInsertStyle() {}, useToBool: (value) => value === true || value === 'true',
    MainApp: {conf: {enable_code: true, code_theme_light: 'one-light', code_theme_dark: 'one-dark'}, attrs: {}, useTheme: {getMode: () => 'light', change() {}}},
    setTimeout: (fn, delay) => {const id = ++nextTimer; timers.set(id, {fn, delay}); return id;}, clearTimeout: (id) => timers.delete(id),
    console: {warn() {}},
  });
  new codeBlock();
  return {window, article, classes, timers, script};
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test('failed Prism request restores readable original code', async () => {
  const f = fixture();
  f.script.onerror();
  await settle();
  assert.equal(f.classes.has('code-success'), true);
  assert.equal(f.timers.size, 0);
});

test('a stalled Prism request times out and restores readable code', async () => {
  const f = fixture();
  [...f.timers.values()].find((timer) => timer.delay === 10000).fn();
  await settle();
  assert.equal(f.classes.has('code-success'), true);
});

test('Prism response without an export also falls back safely', async () => {
  const f = fixture();
  f.script.onload();
  await settle();
  assert.equal(f.classes.has('code-success'), true);
});

test('successful highlighting stays scoped to this article', async () => {
  let highlighted;
  const f = fixture({highlightAllUnder: (el) => {highlighted = el;}});
  await settle();
  assert.equal(highlighted, f.article);
  assert.equal(f.classes.has('code-success'), true);
});
