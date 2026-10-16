const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {load} = require('../test-support/load.cjs');

// 直接执行 config.html 中的首屏脚本（Thymeleaf 自然模板，注释外的默认值即可运行）
function baseScript(preview, href = 'https://blog.example.com/posts/a') {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src/html/views/config.html'), 'utf8');
  const source = /<script id="baseScript"[^>]*>([\s\S]*?)<\/script>/.exec(html)[1];
  const root = {dataset: {}, classList: {add() {}, remove() {}}};
  const context = {
    window: {}, URL, location: new URL(href), localStorage: {getItem: () => null},
    document: {documentElement: root},
  };
  vm.runInNewContext(source, context);
  Object.assign(context.window.MainApp.conf.preview, preview);
  return context.window.MainApp;
}

const img = 'https://img.example.com/i/2024/a.webp';

test('preview rule is off by default and leaves URLs unchanged', () => {
  const app = baseScript({});
  assert.equal(app.usePreview(img), img);
});

test('query mode appends parameters with the right separator', () => {
  const app = baseScript({enable: true, mode: 'query', query: '?w=400', hosts: 'img.example.com'});
  assert.equal(app.usePreview(img), `${img}?w=400`);
  assert.equal(app.usePreview(`${img}?v=1`), `${img}?v=1&w=400`);
});

test('path mode only rewrites matching prefixes', () => {
  const app = baseScript({enable: true, mode: 'path', path_from: '/i/', path_to: '/thumbnails/', hosts: 'https://img.example.com/'});
  assert.equal(app.usePreview(img), 'https://img.example.com/thumbnails/2024/a.webp');
  assert.equal(app.usePreview('https://img.example.com/other/a.webp'), 'https://img.example.com/other/a.webp');
});

test('suffix mode inserts before the extension and keeps the query', () => {
  const app = baseScript({enable: true, mode: 'suffix', suffix: '_thumb', hosts: 'img.example.com'});
  assert.equal(app.usePreview(`${img}?v=2`), 'https://img.example.com/i/2024/a_thumb.webp?v=2');
  assert.equal(app.usePreview('https://img.example.com/i/raw'), 'https://img.example.com/i/raw_thumb');
});

test('only configured hosts are rewritten; empty hosts means this site only', () => {
  const listed = baseScript({enable: true, mode: 'query', query: 'w=400', hosts: 'img.example.com\ncdn.example.com'});
  assert.equal(listed.usePreview('https://other.example.net/a.webp'), 'https://other.example.net/a.webp');
  const sameSite = baseScript({enable: true, mode: 'query', query: 'w=400', hosts: ''});
  assert.equal(sameSite.usePreview('/upload/a.webp'), 'https://blog.example.com/upload/a.webp?w=400');
  assert.equal(sameSite.usePreview(img), img);
  assert.equal(sameSite.usePreview('data:image/gif;base64,AAAA'), 'data:image/gif;base64,AAAA');
});

test('article images switch to previews and remember the original', () => {
  const app = baseScript({enable: true, mode: 'query', query: 'w=400', hosts: 'img.example.com'});
  const make = (src, srcset) => ({
    attrs: {src, ...(srcset ? {srcset} : {})},
    getAttribute(name) {return this.attrs[name];}, setAttribute(name, value) {this.attrs[name] = value;},
  });
  const images = [make(img), make('https://other.example.net/a.webp'), make(img, 'a 2x')];
  app.usePreviewImages({querySelectorAll: () => images.filter((el) => !el.attrs.srcset)});
  assert.deepEqual(images[0].attrs, {src: `${img}?w=400`, 'data-origin': img});
  assert.deepEqual(images[1].attrs, {src: 'https://other.example.net/a.webp'});
  assert.deepEqual(images[2].attrs, {src: img, srcset: 'a 2x'});
});

// 模拟 <img>：设置 src 后由测试决定派发 load 或 error
function fakeImage(attrs = {}) {
  const listeners = {load: new Set(), error: new Set()};
  const classes = new Set();
  const attributes = {...attrs};
  return {
    dataset: {...attrs}, src: attrs.src || 'data:placeholder', complete: false, naturalWidth: 0,
    classList: {add: (name) => classes.add(name), has: (name) => classes.has(name)},
    getAttribute(name) {return name === 'src' ? this.src : attributes[name];},
    removeAttribute(name) {delete attributes[name];},
    addEventListener(type, fn) {listeners[type].add(fn);},
    removeEventListener(type, fn) {listeners[type].delete(fn);},
    fire(type) {[...listeners[type]].forEach((fn) => fn());},
    listeners, classes,
  };
}

function imageModule(app = {}) {
  const loads = [];
  class FakeLoader {
    set src(value) {loads.push({value, loader: this});}
  }
  const globals = {
    window: {MainApp: app}, Image: FakeLoader, Error,
  };
  return {...load('src/js/core/_image.js', ['useImageCandidates', 'useLazyImages', 'useProgressiveImages'], globals), loads};
}

test('covers try the preview, then the original, then the error image', () => {
  const {useLazyImages} = imageModule({
    usePreview: (src) => `${src}?w=400`, conf: {img_err: 'err.gif'},
  });
  const cover = fakeImage({lazySrc: img, preview: 'cover'});
  useLazyImages({querySelectorAll: () => [cover]});
  assert.equal(cover.src, `${img}?w=400`);
  cover.fire('error');
  assert.equal(cover.src, img);
  cover.fire('error');
  assert.equal(cover.src, 'err.gif');
  assert.equal(cover.classes.has('error'), true);
});

test('a late placeholder load event does not mark the real image as loaded', () => {
  const {useImageCandidates} = imageModule();
  const avatar = fakeImage();
  avatar.addEventListener('load', () => {});
  useImageCandidates(avatar, [img], 'err.gif');
  avatar.src = 'data:placeholder';
  avatar.fire('load');
  assert.equal(avatar.classes.has('loaded'), false);
  avatar.src = img;
  avatar.fire('load');
  assert.equal(avatar.classes.has('loaded'), true);
});

test('native responsive covers keep srcset and do not request a separate preview', () => {
  const {useLazyImages} = imageModule({
    usePreview() {throw new Error('Native responsive covers should not use a preview rule');}, conf: {},
  });
  const cover = fakeImage({src: img, lazySrc: img, preview: 'cover', srcset: 'small.webp 400w, large.webp 800w'});
  useLazyImages({querySelectorAll: () => [cover]});
  assert.equal(cover.src, img);
  assert.equal(cover.getAttribute('srcset'), 'small.webp 400w, large.webp 800w');
  cover.fire('load');
  assert.equal(cover.classes.has('loaded'), true);
});

test('a failed responsive candidate retries the original before the error image', () => {
  const {useLazyImages} = imageModule({conf: {img_err: 'err.gif'}});
  const cover = fakeImage({src: img, lazySrc: img, preview: 'cover', srcset: 'broken.webp 400w'});
  useLazyImages({querySelectorAll: () => [cover]});
  cover.fire('error');
  assert.equal(cover.getAttribute('srcset'), undefined);
  assert.equal(cover.src, img);
  assert.equal(cover.classes.has('error'), false);
  cover.fire('load');
  assert.equal(cover.classes.has('loaded'), true);

  const broken = fakeImage({src: img, lazySrc: img, preview: 'cover', srcset: 'broken.webp 400w'});
  useLazyImages({querySelectorAll: () => [broken]});
  broken.fire('error');
  broken.fire('error');
  assert.equal(broken.src, 'err.gif');
  assert.equal(broken.getAttribute('srcset'), undefined);
  assert.equal(broken.classes.has('error'), true);
});

test('responsive attributes belonging to a placeholder cannot override the real preview', () => {
  const {useLazyImages} = imageModule({usePreview: (src) => `${src}?w=400`, conf: {}});
  const cover = fakeImage({lazySrc: img, preview: 'cover', srcset: 'placeholder.png 400w'});
  useLazyImages({querySelectorAll: () => [cover]});
  assert.equal(cover.getAttribute('srcset'), undefined);
  assert.equal(cover.src, `${img}?w=400`);
});

test('a responsive candidate selected after a successful load can still fall back', () => {
  const {useLazyImages} = imageModule({conf: {img_err: 'err.gif'}});
  const cover = fakeImage({src: img, lazySrc: img, preview: 'cover', srcset: 'small.webp 400w, broken-large.webp 1200w'});
  useLazyImages({querySelectorAll: () => [cover]});
  cover.fire('load');
  cover.fire('error');
  assert.equal(cover.getAttribute('srcset'), undefined);
  assert.equal(cover.src, img);
  cover.fire('load');
  assert.equal(cover.classes.has('loaded'), true);
  assert.equal(cover.listeners.error.size, 0);
});

test('an image loaded before the deferred script still receives its loaded state', () => {
  const {useLazyImages} = imageModule({conf: {}});
  const cover = fakeImage({src: img, lazySrc: img, preview: 'cover', srcset: 'small.webp 400w'});
  cover.complete = true;
  cover.naturalWidth = 400;
  useLazyImages({querySelectorAll: () => [cover]});
  assert.equal(cover.classes.has('loaded'), true);
  assert.equal(cover.listeners.error.size, 1, 'future responsive candidates retain failure handling');
  assert.equal(cover.getAttribute('srcset'), 'small.webp 400w');
});

test('images are not reset or re-requested once loading started', () => {
  const {useLazyImages} = imageModule({conf: {}});
  const logo = fakeImage({lazySrc: img});
  const root = {querySelectorAll: () => [logo].filter((el) => !el.dataset.lazyState)};
  useLazyImages(root);
  useLazyImages(root);
  assert.equal(logo.src, img);
  assert.equal(logo.dataset.lazyState, '1');
});

test('article previews upgrade to the original after loading, or fall back on error', async () => {
  const {useProgressiveImages, loads} = imageModule();
  const ok = fakeImage({origin: img, src: `${img}?w=400`});
  const broken = fakeImage({origin: img, src: `${img}?w=400`});
  useProgressiveImages({querySelectorAll: () => [ok, broken]});
  broken.fire('error');
  assert.equal(broken.src, img);
  ok.fire('load');
  assert.equal(loads.length, 1);
  loads[0].loader.onload();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(ok.src, img);
});
