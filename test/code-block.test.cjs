const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('../test-support/load.cjs');

function fixture(prism, {onlyShiki = false} = {}) {
  const classes = new Set();
  const code = {};
  const pre = {nextElementSibling: null, classList: {add: (name) => classes.add(name)}, closest: () => null, querySelector: () => code};
  const shikiPre = {closest: (selector) => selector === 'shiki-code' ? {} : null, querySelector: () => ({}), classList: {add() {throw new Error('shiki block touched');}}};
  const article = {classList: {add() {}}, querySelectorAll: (selector) => selector === 'pre' ? (onlyShiki ? [shikiPre] : [shikiPre, pre]) : []};
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
  return {window, article, classes, timers, script, code, nodes};
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

test('successful highlighting only touches blocks not owned by Shiki', async () => {
  const highlighted = [];
  const f = fixture({highlightElement: (el) => highlighted.push(el)});
  await settle();
  assert.deepEqual(highlighted, [f.code]);
  assert.equal(f.classes.has('code-success'), true);
});

test('articles rendered entirely by Shiki do not load Prism', () => {
  const f = fixture(undefined, {onlyShiki: true});
  assert.equal(f.script, undefined);
  assert.equal(f.nodes.size, 0);
});

test('languages Prism does not know are highlighted as plain text without a request', async () => {
  const plain = {};
  const languages = {plain};
  const f = fixture({languages, plugins: {autoloader: {known: ['bash', 'yaml']}}, highlightElement() {}});
  f.code.className = 'language-env';
  await settle();
  assert.equal(languages.env, plain);
});

test('known but unbundled languages are left for the autoloader', async () => {
  const languages = {plain: {}};
  const f = fixture({languages, plugins: {autoloader: {known: ['yaml']}}, highlightElement() {}});
  f.code.className = 'language-yaml';
  await settle();
  assert.equal(languages.yaml, undefined);
});
