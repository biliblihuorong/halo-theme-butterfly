const test = require('node:test');
const assert = require('node:assert/strict');
const {load} = require('../test-support/load.cjs');

function element() {
  const classes = new Set();
  return {id: '', style: {}, attrs: {}, events: {}, classList: {
    add: (value) => classes.add(value), contains: (value) => classes.has(value),
    toggle(value) {if(classes.delete(value)) return false; classes.add(value); return true;},
  }, setAttribute(key, value) {this.attrs[key] = value;}, addEventListener(key, fn) {this.events[key] = fn;}};
}

function fixture({withToc = true, ids = [], links = [], hash = ''} = {}) {
  const toc = element();
  const side = {buttons: [], prepend(button) {this.buttons.push(button);}};
  const article = element();
  article.querySelectorAll = (selector) => selector === '[id]' ? ids : links;
  const sticky = {querySelector: () => toc, style: {}};
  let observerCallback, scrollCallback;
  const location = new URL(`https://example.com/post${hash}`);
  const history = {state: null, replaceState(_, __, url) {location.href = String(url);}};
  const events = {};
  const document = {
    querySelector: (selector) => selector === 'article.render' ? article : selector === '.aside .is-sticky' ? (withToc ? sticky : null) : selector === '.side-btn' ? side : null,
    createElement: () => element(), getElementById: (id) => ids.find((el) => el.id === id),
  };
  const exports = load('src/js/modules/Render.js', ['Render', 'resolveAnchorId'], {
    document, window: {location, history, innerWidth: 1280, addEventListener: (name, fn) => {events[name] = fn;}},
    MainApp: {conf: {}, useScroll: {change: (fn) => {scrollCallback = fn;}}},
    tocBot: {init() {}}, ResizeObserver: class {constructor(fn) {observerCallback = fn;} observe() {} disconnect() {}},
  });
  new exports.Render();
  return {toc, side, location, events, ...exports, resize: () => observerCallback?.([{contentRect: {height: 400}}]), scroll: () => scrollCallback?.(56, 0, 100)};
}

test('pages without a TOC register neither a TOC button nor a broken scroll handler', () => {
  const f = fixture({withToc: false});
  f.resize(); f.scroll();
  assert.equal(f.side.buttons.length, 0);
});

test('mobile TOC button opens and closes with matching accessible state', () => {
  const f = fixture();
  const button = f.side.buttons[0];
  button.events.click();
  assert.equal(f.toc.classList.contains('is-open'), true);
  assert.equal(button.attrs['aria-expanded'], 'true');
  button.events.click();
  assert.equal(f.toc.classList.contains('is-open'), false);
  assert.equal(button.attrs['aria-expanded'], 'false');
  f.resize(); f.scroll();
});

test('footnote normalization prefers exact IDs and rejects ambiguous matches', () => {
  const {resolveAnchorId} = fixture({withToc: false});
  assert.equal(resolveAnchorId('user-content-fn', ['user-content-user-content-fn']), 'user-content-user-content-fn');
  assert.equal(resolveAnchorId('fn', ['fn', 'user-content-fn']), 'fn');
  assert.equal(resolveAnchorId('fn', ['user-content-fn', 'user-content-user-content-fn']), null);
  assert.equal(resolveAnchorId('missing', ['other']), null);
});

test('footnote links and old bookmarks resolve without changing IDs or external links', () => {
  let scrolled = false;
  const target = {id: 'user-content-user-content-fn', scrollIntoView() {scrolled = true;}};
  const link = {href: '#user-content-fn', getAttribute() {return this.href;}, setAttribute(_, value) {this.href = value;}};
  const external = {href: 'https://other.example/post#user-content-fn', getAttribute() {return this.href;}, setAttribute() {throw new Error('External link modified');}};
  const f = fixture({withToc: false, ids: [target], links: [link, external], hash: '#user-content-fn'});
  assert.equal(link.href, '/post#user-content-user-content-fn');
  assert.equal(f.location.hash, '#user-content-user-content-fn');
  assert.equal(target.id, 'user-content-user-content-fn');
  assert.equal(scrolled, true);
});

test('legacy fragment arriving after initial rendering is repaired on hash change', () => {
  const target = {id: 'user-content-user-content-fn', scrollIntoView() {}};
  const f = fixture({withToc: false, ids: [target]});
  f.location.hash = '#user-content-fn';
  f.events.hashchange();
  assert.equal(f.location.hash, '#user-content-user-content-fn');
});
